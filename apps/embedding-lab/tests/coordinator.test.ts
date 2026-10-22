import { test, expect } from 'bun:test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/storage';
import { Coordinator, type Selection } from '../src/coordinator';
import { buildInput } from '../src/input';
import { seal, defaults, type Vector } from '../src/contracts';
import { dataset, config } from './fixtures';
async function setup() { const root = await realpath(await mkdtemp(join(tmpdir(), 'lab-run-'))); const store = new Store(root); await store.put(dataset); await store.put(config); const selection: Selection = { datasetId: dataset.id, configurationId: config.id, courseIds: ['c1'], groupIds: ['g1'], allowPartial: false, settings: defaults }; const coordinator = new Coordinator(store, async () => { throw Error('No inference on runs'); }); return { store, root, selection, coordinator }; }
test('runs remain offline, identity reuse, immutable outputs and configuration isolation', async () => { const { root, store, selection, coordinator } = await setup(); try {
    for (const input of [buildInput('course', dataset.courses[0]), buildInput('group', dataset.groups[0])]) {
        const v: Vector = seal({ version: 1, kind: 'vector', configurationId: config.id, input, values: Array.from({ length: 1024 }, (_, i) => i === 0 ? 1 : 0) });
        await store.put(v);
    }
    const id = await coordinator.run('match', selection);
    expect(await coordinator.run('match', selection)).toBe(id);
    expect((await store.list('run')).length).toBe(1);
    const afterRestart = new Coordinator(new Store(root), async () => { throw Error('offline'); });
    expect(await afterRestart.run('match', selection)).toBe(id);
    expect((await store.list('attempt')).length).toBeGreaterThanOrEqual(2);
}
finally {
    await rm(root, { recursive: true, force: true });
} });
test('missing vectors, concurrent operations, cancellation and failed attempts', async () => { const { root, store, selection, coordinator } = await setup(); try {
    await expect(coordinator.run('match', selection)).rejects.toThrow('Missing vectors');
    let started: () => void = () => { };
    const ready = new Promise<void>(resolve => started = resolve);
    const running = coordinator.execute('wait', async (signal) => { started(); await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true })); signal.throwIfAborted(); return 'none'; });
    await ready;
    await expect(coordinator.run('match', selection)).rejects.toThrow('active');
    coordinator.cancel();
    await expect(running).rejects.toThrow('cancelled');
    expect(coordinator.state?.state).toBe('cancelled');
    expect((await store.list('run')).length).toBe(0);
    expect((await store.list('attempt')).length).toBe(2);
}
finally {
    await rm(root, { recursive: true, force: true });
} });
