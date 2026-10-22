import { createHash } from 'node:crypto';
import type { Input } from './contracts';

/** Normalize each chunk before byte-weighted pooling; reject corrupt outputs. */
export function normalizeVector(raw: readonly number[], dimensions: number): number[] {
    if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 1024 || raw.length !== dimensions || raw.some(x => !Number.isFinite(x)))
        throw new Error('Invalid vector dimensions or values');
    const norm = Math.hypot(...raw);
    if (!Number.isFinite(norm) || norm === 0) throw new Error('Zero or invalid vector');
    return raw.map(x => x / norm);
}

export function poolChunks(input: Input, vectors: readonly (readonly number[])[], dimensions = 1024): number[] {
    if (!input.eligible || !input.chunks.length || vectors.length !== input.chunks.length || input.weights.length !== vectors.length)
        throw new Error('Incomplete or ineligible chunk input');
    const pooled = new Array<number>(dimensions).fill(0);
    for (let i = 0; i < vectors.length; i++) {
        const weight = input.weights[i];
        if (weight !== Buffer.byteLength(input.chunks[i]) || weight < 1 || weight > 4096)
            throw new Error('Invalid chunk weight');
        const vector = normalizeVector(vectors[i], dimensions);
        for (let d = 0; d < dimensions; d++) pooled[d] += vector[d] * weight;
    }
    return normalizeVector(pooled, dimensions);
}

/** Explicit little-endian float32 checksum is independent of host byte order. */
export function float32Vector(raw: readonly number[], dimensions = 1024) {
    const checked = normalizeVector(raw, dimensions);
    const normalized = Math.abs(Math.hypot(...raw) - 1) < 1e-5 ? raw : checked;
    const values = Float32Array.from(normalized);
    const bytes = Buffer.alloc(values.length * 4);
    values.forEach((value, index) => bytes.writeFloatLE(value, index * 4));
    return { values, checksum: createHash('sha256').update(bytes).digest('hex') };
}
