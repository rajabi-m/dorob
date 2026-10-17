import { assert, object, list, text, finite, PROFILE, seal, hash, type Configuration, type Vector, type Input } from './contracts';
import { Store } from './storage';
import { boundedJSON } from './bounded';
export type Transport = (path: string, body?: unknown, signal?: AbortSignal) => Promise<unknown>;
export function ollamaClient(origin = process.env.LAB_OLLAMA_ORIGIN ?? 'http://127.0.0.1:11434'): Transport {
    const u = new URL(origin);
    assert(u.origin === origin && u.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(u.hostname), 'Inference must use a local loopback origin');
    return async (path, body, signal) => { const response = await fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.any([AbortSignal.timeout(60000), ...(signal ? [signal] : [])]) }); assert(response.ok, `Ollama request failed (${response.status}); check local runtime/model`); return boundedJSON(response, 4 * 1024 * 1024); };
}
export async function configuration(transport: Transport, model: string, signal?: AbortSignal): Promise<Configuration> {
    assert(/^bge-m3(?::[a-zA-Z0-9._-]+)?$/.test(model), 'Select an installed BGE-M3 artifact');
    const tags = object(await transport('/api/tags', undefined, signal));
    const found = list(tags.models, 100).map(object).find(m => m.name === model);
    assert(found, 'Selected model is not installed; no download was attempted');
    const digest = text(found.digest, 80);
    const details = object(await transport('/api/show', { model }, signal));
    const info = object(details.model_info);
    const dimension = Object.entries(info).find(([k]) => k.endsWith('.embedding_length'))?.[1];
    assert(dimension === 1024, 'Expected 1,024-dimensional BGE-M3');
    return seal({ version: 1 as const, kind: 'configuration' as const, model, digest, dimensions: 1024, profile: PROFILE });
}
export async function verify(transport: Transport, cfg: Configuration, signal?: AbortSignal) { assert((await configuration(transport, cfg.model, signal)).id === cfg.id, 'Selected model digest/configuration changed'); }
export function normalizeVector(raw: unknown, dimension: number): number[] { const v = list(raw, dimension).map(x => finite(x)); assert(v.length === dimension, 'Wrong vector dimension'); const norm = Math.hypot(...v); assert(Number.isFinite(norm) && norm > 0, 'Zero or invalid vector'); return v.map(n => n / norm); }
export const vectorIdentity = (cfg: Configuration, input: Input) => hash({ configurationId: cfg.id, inputHash: input.hash });
export async function cached(store: Store, cfg: Configuration, input: Input): Promise<Vector | null> {
    // File IDs include vector content; match compatible educational identities across datasets.
    const vectors = await store.list<Vector>('vector');
    return vectors.find(v => v.configurationId === cfg.id && v.input.hash === input.hash) ?? null;
}
export async function generate(store: Store, cfg: Configuration, inputs: Input[], transport: Transport, signal?: AbortSignal, progress: (done: number, total: number) => void = () => { }) {
    const prior = await store.list<Vector>('vector');
    const existing = new Map(prior.filter(v => v.configurationId === cfg.id).map(v => [v.input.hash, v]));
    const result: Vector[] = [];
    let done = 0;
    for (const input of inputs) {
        signal?.throwIfAborted();
        if (!input.eligible)
            continue;
        const reuse = existing.get(input.hash);
        if (reuse) {
            result.push(reuse);
            progress(++done, inputs.length);
            continue;
        }
        const pooled = new Array(cfg.dimensions).fill(0) as number[];
        for (let offset = 0; offset < input.chunks.length; offset += 4) {
            signal?.throwIfAborted();
            await verify(transport, cfg, signal);
            const chunks = input.chunks.slice(offset, offset + 4);
            const response = object(await transport('/api/embed', { model: cfg.model, input: chunks, truncate: false }, signal));
            assert(response.model === cfg.model, 'Unexpected inference model');
            const values = list(response.embeddings, 4);
            assert(values.length === chunks.length, 'Wrong output count');
            await verify(transport, cfg, signal);
            for (let i = 0; i < values.length; i++) {
                const vector = normalizeVector(values[i], cfg.dimensions), weight = input.weights[offset + i];
                for (let d = 0; d < pooled.length; d++)
                    pooled[d] += vector[d] * weight;
            }
        }
        signal?.throwIfAborted();
        const v: Vector = seal({ version: 1, kind: 'vector', configurationId: cfg.id, input, values: normalizeVector(pooled, cfg.dimensions) });
        await store.put(v);
        existing.set(input.hash, v);
        result.push(v);
        progress(++done, inputs.length);
    }
    return result;
}
