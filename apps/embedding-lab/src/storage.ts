import { mkdir, open, lstat, realpath, readdir, link, unlink, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { assert, key, canonical, validateArtifact, type Artifact, type Feedback, type Run, seal } from './contracts';
export const MAX_BYTES = 256 * 1024 * 1024;
const kinds = ['dataset', 'configuration', 'vector', 'run', 'attempt', 'feedback', 'evidence'] as const;
export class Store {
    readonly root: string;
    constructor(root = process.env.LAB_OUTPUT ?? resolve(import.meta.dir, import.meta.dir.endsWith('/dist') ? '../output' : '../output')) { this.root = resolve(root); }
    private async directory(kind: string) { assert(kinds.includes(kind as typeof kinds[number])); await mkdir(this.root, { recursive: true, mode: 0o700 }); assert((await realpath(this.root)) === this.root, 'Artifact root must not contain symlinks'); const dir = join(this.root, kind); await mkdir(dir, { recursive: true, mode: 0o700 }); assert(!(await lstat(dir)).isSymbolicLink()); return dir; }
    async read<T extends Artifact>(kind: T['kind'], id: string): Promise<T> { const path = join(await this.directory(kind), key(id) + '.json'); const st = await lstat(path); assert(st.isFile() && !st.isSymbolicLink() && st.size <= MAX_BYTES, 'Invalid artifact file'); const f = await open(path, 'r'); try {
        const bytes = await f.readFile();
        assert(bytes.length <= MAX_BYTES);
        const value = validateArtifact(JSON.parse(bytes.toString()));
        assert(value.kind === kind && value.id === id);
        return value as T;
    }
    finally {
        await f.close();
    } }
    async list<T extends Artifact>(kind: T['kind']): Promise<T[]> { const dir = await this.directory(kind); const files = (await readdir(dir)).filter(f => /^[a-f0-9]{64}\.json$/.test(f)).sort(); assert(files.length <= 50000, 'Artifact count bound reached'); const results: T[] = []; for (const name of files)
        results.push(await this.read<T>(kind, name.slice(0, -5))); return results; }
    async has(kind: Artifact['kind'], id: string) { try {
        await this.read(kind, id);
        return true;
    }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT')
            return false;
        throw e;
    } }
    // Callers serialize multi-file operations through write(). Individual artifacts are immutable.
    async put<T extends Artifact>(artifact: T): Promise<T> {
        validateArtifact(artifact);
        const dir = await this.directory(artifact.kind), dest = join(dir, key(artifact.id) + '.json');
        const bytes = canonical(artifact);
        assert(Buffer.byteLength(bytes) <= MAX_BYTES, 'Artifact exceeds storage bound');
        if (await this.has(artifact.kind, artifact.id))
            return artifact;
        const tmp = join(dir, `.pending-${crypto.randomUUID()}`);
        const f = await open(tmp, 'wx', 0o600);
        try {
            await f.writeFile(bytes);
            await f.sync();
        }
        finally {
            await f.close();
        }
        try {
            await link(tmp, dest);
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'EEXIST')
                throw e;
            await this.read(artifact.kind, artifact.id);
        }
        finally {
            await unlink(tmp);
        }
        const d = await open(dir, 'r');
        try {
            await d.sync();
        }
        finally {
            await d.close();
        }
        return artifact;
    }
    async write<T>(operation: () => Promise<T>): Promise<T> { await this.directory('attempt'); const path = join(this.root, '.writer.lock'); let f; try {
        f = await open(path, 'wx', 0o600);
    }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'EEXIST')
            throw Error('Another writer is active; inspect the lock and use CLI unlock only after its process has stopped.');
        throw e;
    } await f.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })); await f.sync(); try {
        return await operation();
    }
    finally {
        await f.close();
        await unlink(path);
    } }
    async unlock() { const path = join(this.root, '.writer.lock'); assert(!(await lstat(path)).isSymbolicLink()); const lock = JSON.parse(await readFile(path, 'utf8')); assert(Number.isInteger(lock.pid) && lock.pid > 0); try {
        process.kill(lock.pid, 0);
    }
    catch (e) {
        assert((e as NodeJS.ErrnoException).code === 'ESRCH', 'Cannot verify stale lock');
        await unlink(path);
        return;
    } throw Error('Lock owner is still running'); }
    async feedback(input: {
        eventId: string;
        runId: string;
        targetId: string;
        label: Feedback['label'];
        note?: string;
        title?: string;
    }) { return this.write(async () => { const run = await this.read<Run>('run', input.runId); assert(run.pairs.some(p => p.id === input.targetId) || run.sets.some(s => s.id === input.targetId), 'Unknown feedback target'); const prior = (await this.list<Feedback>('feedback')).find(f => f.eventId === input.eventId); if (prior) {
        assert(prior.runId === input.runId && prior.targetId === input.targetId && prior.label === input.label && prior.note === (input.note ?? '') && prior.title === (input.title ?? ''), 'Conflicting feedback replay');
        return prior;
    } return this.put(seal({ version: 1 as const, kind: 'feedback' as const, ...input, note: input.note ?? '', title: input.title ?? '', createdAt: new Date().toISOString() })); }); }
}
