import { createHash } from 'node:crypto';
import type { CategoryId } from '@dorob/core';
export const VERSION = 1 as const;
export const PROFILE = 'educational-v1:utf8-65536:chunks-4096:byte-pool-l2:nfc-fa' as const;
export type Course = {
    id: string;
    providerId: string;
    title: string;
    sourceUrl: string;
    snapshotId: string | null;
    collectedAt: string | null;
    description: string | null;
    outcomes: string[];
    prerequisites: string[];
    audience: string[];
    technologies: string[];
    level: string | null;
    syllabus: string[];
};
export type Group = {
    id: string;
    title: string;
    description: string;
    categoryId: CategoryId;
    categoryLabel: string;
    targetLevel: string | null;
    members: string[];
};

export type Input = {
    entity: 'course' | 'group';
    entityId: string;
    hash: string;
    profile: typeof PROFILE;
    text: string;
    chunks: string[];
    weights: number[];
    eligible: boolean;
    missing: string[];
    omitted: string[];
};

export function canonical(value: unknown): string {
    if (value === null || typeof value === 'boolean' || typeof value === 'string')
        return JSON.stringify(value);
    if (typeof value === 'number') {
        if (!Number.isFinite(value))
            throw Error('Non-finite number');
        return JSON.stringify(value);
    }
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    if (typeof value === 'object')
        return '{' + Object.entries(value!).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
    throw Error('Unsupported value');
}
export const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');

export type Pair = {
    id: string;
    courseId: string;
    groupId: string;
    score: number;
};
export type Reconciliation = {
    groupId: string;
    centroidScore: number;
    members: {
        courseId: string;
        score: number;
        passes: boolean;
    }[];
    fraction: number;
};
export type DiscoveredSet = {
    id: string;
    members: string[];
    seeds: string[];
    medoid: string;
    mean: number;
    minimum: number;
    suppressedBy: string | null;
    reconciliation: Reconciliation[];
    status: 'novel' | 'partial' | 'covered' | 'ambiguous';
};
export type Settings = {
    minimum: number;
    limit: number;
    k: number;
    coherence: number;
    minSize: number;
    jaccard: number | null;
    groupLimit: number;
    candidateCap: number;
};

export function assert(ok: unknown, message = 'Invalid embedding input'): asserts ok {
    if (!ok) throw new Error(message);
}
export const defaults: Settings = { minimum: .60, limit: 20, k: 12, coherence: .70, minSize: 2, jaccard: .80, groupLimit: 5, candidateCap: 10000 };
