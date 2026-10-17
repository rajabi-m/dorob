import { test, expect, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/storage';
import { PROFILE, seal, validateArtifact, hash } from '../src/contracts';
const roots: string[] = [];
afterEach(async () => { for (const p of roots.splice(0))
    await rm(p, { recursive: true, force: true }); });
async function store() { const root = await mkdtemp(join(tmpdir(), 'dorob-lab-')); roots.push(root); return new Store(await realpath(root)); }
const cfg = () => seal({ version: 1 as const, kind: 'configuration' as const, model: 'bge-m3', digest: 'a'.repeat(64), dimensions: 1024, profile: PROFILE });
test('canonical hash, immutable replay, corruption and confinement', async () => { expect(hash({ a: 1, b: 2 })).toBe(hash({ b: 2, a: 1 })); const s = await store(); await s.write(() => s.put(cfg())); await s.put(cfg()); expect((await s.list('configuration')).length).toBe(1); await expect(s.read('configuration', '../secret')).rejects.toThrow(); await writeFile(join(s.root, 'configuration', cfg().id + '.json'), '{}'); await expect(s.read('configuration', cfg().id)).rejects.toThrow(); expect(() => validateArtifact({ ...cfg(), dimensions: 3 })).toThrow(); });
test('one writer, interrupted file ignored, restart and symlink rejection', async () => { const s = await store(); await s.write(async () => { await expect(s.write(async () => 0)).rejects.toThrow('writer'); await s.put(cfg()); }); await writeFile(join(s.root, 'configuration', '.pending-interrupted'), 'broken'); expect((await new Store(s.root).list('configuration')).length).toBe(1); const other = await store(); await symlink(s.root, join(other.root, 'configuration')); await expect(other.list('configuration')).rejects.toThrow(); });
test('stale lock requires explicit recovery; live locks stay', async () => { const s = await store(); await s.put(cfg()); await writeFile(join(s.root, '.writer.lock'), JSON.stringify({ pid: 2147483647 })); await s.unlock(); await s.write(async () => { await expect(s.unlock()).rejects.toThrow('still running'); }); });
import { run, pairId } from './fixtures';
test('feedback retries persist exactly once with history after restart', async () => { const s = await store(); await s.put(run); const input = { eventId: 'request-1', runId: run.id, targetId: pairId, label: 'uncertain' as const }; const first = await s.feedback(input); expect(await new Store(s.root).feedback(input)).toEqual(first); await s.feedback({ ...input, eventId: 'request-2', label: 'suitable' }); expect((await s.list('feedback')).length).toBe(2); await expect(s.feedback({ ...input, label: 'unsuitable' })).rejects.toThrow('Conflicting'); await expect(s.feedback({ ...input, eventId: 'request-3', targetId: '0'.repeat(64) })).rejects.toThrow('Unknown'); });
