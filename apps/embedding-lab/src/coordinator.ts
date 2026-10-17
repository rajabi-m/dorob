import { assert, seal, hash, validateSettings, type Dataset, type Configuration, type Run, type Settings, type Vector, type Attempt } from './contracts';
import { Store } from './storage';
import { buildInput } from './input';
import { requireCoverage } from './capture';
import { generate, ollamaClient, type Transport } from './embedding';
import { match, discover, reconcile, type Embedded } from './algorithms';
export type Selection = {
    datasetId: string;
    configurationId: string;
    courseIds: string[];
    groupIds: string[];
    allowPartial: boolean;
    settings: Settings;
};
export type OperationState = {
    id: string;
    operation: string;
    state: 'running' | 'complete' | 'failed' | 'cancelled';
    done: number;
    total: number;
    resultId: string | null;
    error: string | null;
};
export class Coordinator {
    state: OperationState | null = null;
    private controller: AbortController | null = null;
    constructor(readonly store: Store, readonly transport: Transport = ollamaClient()) { }
    cancel() { this.controller?.abort(Error('Operation cancelled')); }
    async execute(operation: string, work: (signal: AbortSignal, progress: (done: number, total: number) => void) => Promise<string>) {
        assert(this.state?.state !== 'running', 'Another operation is active');
        const controller = new AbortController();
        this.controller = controller;
        const state: OperationState = { id: crypto.randomUUID(), operation, state: 'running', done: 0, total: 0, resultId: null, error: null };
        this.state = state;
        const startedAt = new Date().toISOString();
        try {
            return await this.store.write(async () => { try {
                state.resultId = await work(controller.signal, (done, total) => { state.done = done; state.total = total; });
                state.state = 'complete';
                return state.resultId;
            }
            catch (e) {
                state.state = controller.signal.aborted ? 'cancelled' : 'failed';
                state.error = e instanceof Error ? e.message : 'Operation failed';
                throw e;
            }
            finally {
                const attempt: Attempt = seal({ version: 1, kind: 'attempt', operation, startedAt, endedAt: new Date().toISOString(), state: state.state === 'running' ? 'failed' : state.state, error: state.error, runId: operation === 'match' || operation === 'discover' ? state.resultId : null });
                await this.store.put(attempt);
            } });
        }
        catch (e) {
            if (state.state === 'running') {
                state.state = 'failed';
                state.error = e instanceof Error ? e.message : 'Operation failed';
            }
            throw e;
        }
        finally {
            this.controller = null;
        }
    }
    async selection(raw: Selection) {
        assert(typeof raw.allowPartial === 'boolean');
        validateSettings(raw.settings);
        const dataset = await this.store.read<Dataset>('dataset', raw.datasetId), cfg = await this.store.read<Configuration>('configuration', raw.configurationId);
        requireCoverage(dataset, raw.allowPartial);
        assert(Array.isArray(raw.courseIds) && Array.isArray(raw.groupIds) && raw.courseIds.length <= 20000 && raw.groupIds.length <= 100, 'Select bounded course/group IDs');
        assert(new Set(raw.courseIds).size === raw.courseIds.length && new Set(raw.groupIds).size === raw.groupIds.length);
        assert(raw.courseIds.every(id => dataset.courses.some(c => c.id === id)) && raw.groupIds.every(id => dataset.groups.some(g => g.id === id)), 'Unknown selected entity');
        const selected = [...dataset.courses.filter(c => raw.courseIds.includes(c.id)).map(c => buildInput('course', c)), ...dataset.groups.filter(g => raw.groupIds.includes(g.id)).map(g => buildInput('group', g))].sort((a, b) => a.entity.localeCompare(b.entity) || a.entityId.localeCompare(b.entityId));
        return { dataset, cfg, inputs: selected };
    }
    embed(raw: Selection) { return this.execute('embed', async (signal, progress) => { const { cfg, inputs } = await this.selection(raw); await generate(this.store, cfg, inputs, this.transport, signal, progress); return cfg.id; }); }
    run(operation: 'match' | 'discover', raw: Selection) {
        return this.execute(operation, async (signal, progress) => {
            const start = performance.now(), { dataset, cfg, inputs } = await this.selection(raw);
            const vectors = await this.store.list<Vector>('vector');
            const byInput = new Map(vectors.filter(v => v.configurationId === cfg.id).map(v => [v.input.hash, v]));
            const selected = inputs.filter(i => i.eligible), missing = selected.filter(i => !byInput.has(i.hash));
            assert(raw.allowPartial || missing.length === 0, 'Missing vectors; generate explicitly or select partial coverage');
            const available = selected.filter(i => byInput.has(i.hash)), excluded = inputs.filter(i => !i.eligible || !byInput.has(i.hash)).map(i => i.entity + ':' + i.entityId);
            const embedded = (entity: 'course' | 'group'): Embedded[] => available.filter(i => i.entity === entity).map(i => ({ id: i.entityId, values: new Float32Array(byInput.get(i.hash)!.values) }));
            const courses = embedded('course'), groups = embedded('group');
            assert(courses.length > 0, 'No eligible course vectors in selection');
            if (operation === 'match')
                assert(groups.length > 0, 'No group vectors in selection');
            const identity = { datasetId: dataset.id, configurationId: cfg.id, operation, algorithm: 'exact-neighborhood-v1' as const, settings: raw.settings, courseIds: [...raw.courseIds].sort(), groupIds: [...raw.groupIds].sort(), vectorIds: available.map(i => byInput.get(i.hash)!.id).sort(), excluded };
            const computationId = hash(identity);
            const prior = (await this.store.list<Run>('run')).find(r => r.computationId === computationId);
            if (prior)
                return prior.id;
            let pairs: Run['pairs'] = [], sets: Run['sets'] = [], comparisons = 0, truncated = false;
            if (operation === 'match') {
                const result = await match(courses, groups, dataset.groups, raw.settings, signal, progress);
                pairs = result.pairs.map(p => ({ ...p, id: hash([computationId, p.courseId, p.groupId]) }));
                comparisons = result.comparisons;
            }
            else {
                const result = await discover(courses, raw.settings, signal, progress);
                sets = await reconcile(result.sets, courses, groups, raw.settings, signal);
                comparisons = result.comparisons;
                truncated = result.truncated;
            }
            signal.throwIfAborted();
            const run: Run = seal({ version: 1, kind: 'run', ...identity, computationId, inputs, excluded: [...excluded, ...(truncated ? ['candidate-cap'] : [])], partial: missing.length > 0 || !dataset.consistent || dataset.failures.length > 0 || truncated, createdAt: new Date().toISOString(), elapsedMs: performance.now() - start, pairs, sets, comparisons });
            await this.store.put(run);
            return run.id;
        });
    }
}
