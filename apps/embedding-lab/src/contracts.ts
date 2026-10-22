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
export type Dataset = {
    version: 1;
    kind: 'dataset';
    id: string;
    startedAt: string;
    endedAt: string;
    origin: string;
    courses: Course[];
    groups: Group[];
    exclusions: string[];
    failures: string[];
    consistent: boolean;
    coverage: {
        courseTotal: number;
        groupTotal: number;
        selectedCourses: number;
        selectedGroups: number;
    };
};
export type Configuration = {
    version: 1;
    kind: 'configuration';
    id: string;
    model: string;
    digest: string;
    dimensions: number;
    profile: typeof PROFILE;
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
export type Vector = {
    version: 1;
    kind: 'vector';
    id: string;
    configurationId: string;
    input: Input;
    values: number[];
};
export type Pair = {
    id: string;
    courseId: string;
    groupId: string;
    score: number;
    importedMember: boolean;
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
export type Run = {
    version: 1;
    kind: 'run';
    id: string;
    computationId: string;
    datasetId: string;
    configurationId: string;
    operation: 'match' | 'discover';
    algorithm: 'exact-neighborhood-v1';
    settings: Settings;
    courseIds: string[];
    groupIds: string[];
    vectorIds: string[];
    inputs: Input[];
    excluded: string[];
    partial: boolean;
    createdAt: string;
    elapsedMs: number;
    pairs: Pair[];
    sets: DiscoveredSet[];
    comparisons: number;
};
export type Attempt = {
    version: 1;
    kind: 'attempt';
    id: string;
    operation: string;
    startedAt: string;
    endedAt: string;
    state: 'complete' | 'failed' | 'cancelled';
    error: string | null;
    runId: string | null;
};
export type Feedback = {
    version: 1;
    kind: 'feedback';
    id: string;
    eventId: string;
    runId: string;
    targetId: string;
    label: 'suitable' | 'unsuitable' | 'uncertain';
    note: string;
    title: string;
    createdAt: string;
};
export type Evidence = {
    version: 1;
    kind: 'evidence';
    id: string;
    dataset: Dataset;
    configuration: Configuration;
    runs: Run[];
    feedback: Feedback[];
    vectors: Vector[];
};
export type Artifact = Dataset | Configuration | Vector | Run | Attempt | Feedback | Evidence;
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
export const seal = <T extends object>(value: T): T & {
    id: string;
} => ({ ...value, id: hash(value) });
export function assert(ok: unknown, message = 'Invalid laboratory artifact'): asserts ok { if (!ok)
    throw Error(message); }
export const object = (v: unknown): Record<string, unknown> => { assert(v && typeof v === 'object' && !Array.isArray(v)); return v as Record<string, unknown>; };
export const text = (v: unknown, max = 65536): string => { assert(typeof v === 'string' && v.length <= max); return v; };
export const finite = (v: unknown, min = -Infinity, max = Infinity): number => { assert(typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max); return v; };
export const list = (v: unknown, max = 20000): unknown[] => { assert(Array.isArray(v) && v.length <= max); return v; };
export const strings = (v: unknown, max = 20000) => list(v, max).map(x => text(x));
export const identifier = (v: unknown) => { const s = text(v, 300); assert(s.length > 0 && !/[\x00-\x1f]/.test(s)); return s; };
export const key = (v: unknown) => { const s = text(v, 64); assert(/^[a-f0-9]{64}$/.test(s), 'Invalid artifact ID'); return s; };
const bool = (v: unknown) => assert(typeof v === 'boolean');
const date = (v: unknown) => { assert(Number.isFinite(Date.parse(text(v, 40)))); };
const unique = (ids: string[]) => assert(new Set(ids).size === ids.length, 'Duplicate identity');
function exact(v: Record<string, unknown>, fields: string[]) { assert(Object.keys(v).every(k => fields.includes(k)), 'Unknown artifact field'); }
function nullableText(v: unknown) { if (v !== null)
    text(v); }
export function validateInput(raw: unknown): Input {
    const x = object(raw);
    exact(x, ['entity', 'entityId', 'hash', 'profile', 'text', 'chunks', 'weights', 'eligible', 'missing', 'omitted']);
    assert(x.entity === 'course' || x.entity === 'group');
    identifier(x.entityId);
    key(x.hash);
    assert(x.profile === PROFILE);
    text(x.text);
    bool(x.eligible);
    strings(x.missing);
    strings(x.omitted);
    const chunks = strings(x.chunks, 32), weights = list(x.weights, 32).map(v => finite(v, 1, 4096));
    assert(chunks.length === weights.length && chunks.join('') === x.text);
    assert(Buffer.byteLength(text(x.text), 'utf8') <= 65536 && chunks.every((c, i) => Buffer.byteLength(c) === weights[i]));
    const { hash: checksum, ...body } = x;
    assert(hash(body) === checksum, 'Input checksum mismatch');
    return x as Input;
}
export function validateSettings(raw: unknown): Settings {
    const x = object(raw);
    exact(x, ['minimum', 'limit', 'k', 'coherence', 'minSize', 'jaccard', 'groupLimit', 'candidateCap']);
    finite(x.minimum, -1, 1);
    finite(x.coherence, -1, 1);
    if (x.jaccard !== null)
        finite(x.jaccard, 0, 1);
    for (const [k, max] of [['limit', 10000], ['k', 200], ['minSize', 201], ['groupLimit', 100], ['candidateCap', 10000]] as const) {
        finite(x[k], k === 'minSize' ? 2 : 1, max);
        assert(Number.isInteger(x[k]));
    }
    return x as Settings;
}
export function validateArtifact(raw: unknown): Artifact {
    const x = object(raw);
    assert(x.version === 1);
    key(x.id);
    const { id, ...body } = x;
    assert(hash(body) === id, 'Artifact checksum mismatch');
    if (x.kind === 'dataset') {
        exact(x, ['version', 'kind', 'id', 'startedAt', 'endedAt', 'origin', 'courses', 'groups', 'exclusions', 'failures', 'consistent', 'coverage']);
        date(x.startedAt);
        date(x.endedAt);
        const origin = text(x.origin, 2048);
        if (origin !== 'local-bundle') {
            const u = new URL(origin);
            assert(['http:', 'https:'].includes(u.protocol) && u.origin === origin, 'Invalid source origin');
        }
        strings(x.exclusions);
        strings(x.failures);
        bool(x.consistent);
        const cs = list(x.courses), gs = list(x.groups, 1000);
        const ids = cs.map(c => identifier(object(c).id));
        unique(ids);
        for (const raw of cs) {
            const c = object(raw);
            exact(c, ['id', 'providerId', 'title', 'sourceUrl', 'snapshotId', 'collectedAt', 'description', 'outcomes', 'prerequisites', 'audience', 'technologies', 'level', 'syllabus']);
            identifier(c.providerId);
            text(c.title, 300);
            const u = new URL(text(c.sourceUrl, 2048));
            assert(['https:', 'http:'].includes(u.protocol) && !u.username && !u.password);
            nullableText(c.snapshotId);
            if (c.collectedAt !== null)
                date(c.collectedAt);
            nullableText(c.description);
            nullableText(c.level);
            for (const k of ['outcomes', 'prerequisites', 'audience', 'technologies', 'syllabus'])
                strings(c[k]);
        }
        unique(gs.map(g => identifier(object(g).id)));
        for (const raw of gs) {
            const g = object(raw);
            exact(g, ['id', 'title', 'description', 'categoryId', 'categoryLabel', 'targetLevel', 'members']);
            text(g.title, 300);
            text(g.description, 2000);
            assert(['code', 'design', 'business', 'language', 'data', 'tools'].includes(text(g.categoryId)), 'Invalid category');
            text(g.categoryLabel, 300);
            nullableText(g.targetLevel);
            const members = strings(g.members);
            unique(members);
            assert(members.every(m => ids.includes(m)), 'Unknown member');
        }
        const cov = object(x.coverage);
        exact(cov, ['courseTotal', 'groupTotal', 'selectedCourses', 'selectedGroups']);
        for (const v of Object.values(cov))
            finite(v, 0, 20000);
        assert(cov.selectedCourses === cs.length && cov.selectedGroups === gs.length);
        assert(Number(cov.courseTotal) >= cs.length && Number(cov.groupTotal) >= gs.length);
    }
    else if (x.kind === 'configuration') {
        exact(x, ['id', 'version', 'kind', 'model', 'digest', 'dimensions', 'profile']);
        assert(/^bge-m3(?::[a-zA-Z0-9._-]+)?$/.test(text(x.model, 100)));
        assert(/^(sha256:)?[a-f0-9]{64}$/.test(text(x.digest, 80)));
        assert(x.dimensions === 1024 && x.profile === PROFILE);
    }
    else if (x.kind === 'vector') {
        exact(x, ['id', 'version', 'kind', 'configurationId', 'input', 'values']);
        key(x.configurationId);
        validateInput(x.input);
        const values = list(x.values, 1024).map(v => finite(v, -1, 1));
        assert(values.length === 1024);
        const norm = Math.hypot(...values);
        assert(Math.abs(norm - 1) < 1e-5, 'Vector must be normalized');
    }
    else if (x.kind === 'run') {
        exact(x, ['id', 'version', 'kind', 'computationId', 'datasetId', 'configurationId', 'operation', 'algorithm', 'settings', 'courseIds', 'groupIds', 'vectorIds', 'inputs', 'excluded', 'partial', 'createdAt', 'elapsedMs', 'pairs', 'sets', 'comparisons']);
        key(x.computationId);
        key(x.datasetId);
        key(x.configurationId);
        assert(x.operation === 'match' || x.operation === 'discover');
        assert(x.algorithm === 'exact-neighborhood-v1');
        validateSettings(x.settings);
        for (const k of ['courseIds', 'groupIds', 'vectorIds', 'excluded'])
            unique(strings(x[k]));
        for (const i of list(x.inputs, 21000))
            validateInput(i);
        bool(x.partial);
        date(x.createdAt);
        finite(x.elapsedMs, 0);
        finite(x.comparisons, 0);
        const courses = strings(x.courseIds), groups = strings(x.groupIds);
        unique(list(x.pairs, 1000000).map(raw => { const p = object(raw); exact(p, ['id', 'courseId', 'groupId', 'score', 'importedMember']); key(p.id); assert(courses.includes(text(p.courseId)) && groups.includes(text(p.groupId))); finite(p.score, -1.00001, 1.00001); bool(p.importedMember); return text(p.id); }));
        const sets = list(x.sets, 10000).map(raw => object(raw));
        unique(sets.map(s => key(s.id)));
        for (const s of sets) {
            exact(s, ['id', 'members', 'seeds', 'medoid', 'mean', 'minimum', 'suppressedBy', 'reconciliation', 'status']);
            const members = strings(s.members, 201);
            unique(members);
            assert(members.length >= 2 && members.every(m => courses.includes(m)) && members.includes(text(s.medoid)));
            assert(hash([...members].sort()) === s.id);
            strings(s.seeds);
            finite(s.mean, -1.00001, 1.00001);
            finite(s.minimum, -1.00001, 1.00001);
            if (s.suppressedBy !== null)
                assert(sets.some(t => t.id === s.suppressedBy));
            assert(['novel', 'partial', 'covered', 'ambiguous'].includes(text(s.status)));
            for (const raw of list(s.reconciliation, 100)) {
                const r = object(raw);
                exact(r, ['groupId', 'centroidScore', 'members', 'fraction']);
                assert(groups.includes(text(r.groupId)));
                finite(r.centroidScore, -1.00001, 1.00001);
                finite(r.fraction, 0, 1);
                const scores = list(r.members, 201);
                assert(scores.length === members.length);
                unique(scores.map(raw => { const m = object(raw); exact(m, ['courseId', 'score', 'passes']); assert(members.includes(text(m.courseId))); finite(m.score, -1.00001, 1.00001); bool(m.passes); return text(m.courseId); }));
            }
        }
    }
    else if (x.kind === 'feedback') {
        exact(x, ['id', 'version', 'kind', 'runId', 'targetId', 'label', 'note', 'title', 'createdAt', 'eventId']);
        key(x.runId);
        key(x.targetId);
        assert(['suitable', 'unsuitable', 'uncertain'].includes(text(x.label)));
        text(x.note, 4000);
        text(x.title, 300);
        date(x.createdAt);
        identifier(x.eventId);
    }
    else if (x.kind === 'attempt') {
        exact(x, ['id', 'version', 'kind', 'operation', 'startedAt', 'endedAt', 'state', 'error', 'runId']);
        identifier(x.operation);
        date(x.startedAt);
        date(x.endedAt);
        assert(['complete', 'failed', 'cancelled'].includes(text(x.state)));
        nullableText(x.error);
        if (x.runId !== null)
            key(x.runId);
    }
    else if (x.kind === 'evidence') {
        exact(x, ['id', 'version', 'kind', 'dataset', 'configuration', 'runs', 'feedback', 'vectors']);
        const dataset = validateArtifact(x.dataset);
        const cfg = validateArtifact(x.configuration);
        assert(dataset.kind === 'dataset' && cfg.kind === 'configuration');
        const runs = list(x.runs, 20).map(validateArtifact);
        const vectors = list(x.vectors, 21000).map(validateArtifact);
        for (const r of runs)
            assert(r.kind === 'run' && r.datasetId === dataset.id && r.configurationId === cfg.id);
        for (const v of vectors)
            assert(v.kind === 'vector' && v.configurationId === cfg.id);
        for (const raw of list(x.feedback, 100000)) {
            const f = validateArtifact(raw);
            assert(f.kind === 'feedback' && runs.some(r => r.id === f.runId));
            const r = runs.find(r => r.id === f.runId) as Run;
            assert(r.pairs.some(p => p.id === f.targetId) || r.sets.some(s => s.id === f.targetId));
        }
    }
    else
        throw Error('Unsupported artifact kind');
    return x as unknown as Artifact;
}
export const defaults: Settings = { minimum: 0.55, limit: 20, k: 20, coherence: 0.65, minSize: 2, jaccard: null, groupLimit: 5, candidateCap: 10000 };
