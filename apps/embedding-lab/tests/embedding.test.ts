import { test, expect } from 'bun:test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { configuration, generate, normalizeVector, type Transport } from '../src/embedding';
import { Store } from '../src/storage';
import { buildInput } from '../src/input';
import { dataset, config } from './fixtures';
function fake(digest = 'a'.repeat(64), dimension = 1024): Transport { return async (path, body) => { if (path === '/api/tags')
    return { models: [{ name: 'bge-m3', digest }] }; if (path === '/api/show')
    return { model_info: { 'bert.embedding_length': dimension } }; const input = (body as {
    input: string[];
    truncate: boolean;
}); expect(input.truncate).toBe(false); return { model: 'bge-m3', embeddings: input.input.map(() => Array.from({ length: 1024 }, (_, i) => i === 0 ? 1 : 0)) }; }; }
test('reject invalid vectors, wrong dimensions, digest and missing runtime', async () => { for (const value of [Array(1024).fill(0), Array(1024).fill(NaN), [1, 0]])
    expect(() => normalizeVector(value, 1024)).toThrow(); await expect(configuration(fake('a'.repeat(64), 3), 'bge-m3')).rejects.toThrow('dimension'); await expect(configuration(async () => { throw Error('offline'); }, 'bge-m3')).rejects.toThrow('offline'); });
test('generation caches immutable records across restart; cancellation and model changes preserve them', async () => { const root = await realpath(await mkdtemp(join(tmpdir(), 'lab-embed-'))); try {
    const store = new Store(root), input = buildInput('course', dataset.courses[0]);
    const values = await store.write(() => generate(store, config, [input], fake()));
    expect(values[0].values[0]).toBe(1);
    const reused = await generate(new Store(root), config, [input], async () => { throw Error('should remain offline'); });
    expect(reused).toEqual(values);
    const changed = buildInput('course', { ...dataset.courses[0], description: 'این یک شرح آموزشی تغییر یافته است' });
    await expect(generate(store, config, [changed], fake('b'.repeat(64)))).rejects.toThrow('changed');
    const controller = new AbortController();
    controller.abort();
    await expect(generate(store, config, [changed], fake(), controller.signal)).rejects.toThrow();
    expect((await store.list('vector')).length).toBe(1);
}
finally {
    await rm(root, { recursive: true, force: true });
} });
