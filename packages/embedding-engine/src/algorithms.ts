import { assert, hash, type Settings, type Pair, type DiscoveredSet } from './contracts';
export type Embedded = {
    id: string;
    values: Float32Array;
};
export const dot = (a: Float32Array, b: Float32Array) => { assert(a.length === b.length, 'Incompatible vector dimensions'); let sum = 0; for (let i = 0; i < a.length; i++)
    sum += a[i] * b[i]; return Math.max(-1, Math.min(1, sum)); };
const stable = (a: {
    id: string;
    score: number;
}, b: {
    id: string;
    score: number;
}) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
export async function match(courses: Embedded[], groups: Embedded[], settings: Settings, signal?: AbortSignal, onProgress = (done: number, total: number) => { void done; void total; }) {
    validateScope(courses, groups);
    const check = guard(settings, signal);
    const pairs: Pair[] = [];
    let comparisons = 0;
    for (let i = 0; i < groups.length; i++) {
        check();
        const group = groups[i];
        const best: {
            id: string;
            score: number;
        }[] = [];
        for (let offset = 0; offset < courses.length; offset += 128) {
            check();
            for (const course of courses.slice(offset, offset + 128)) {
                const score = dot(course.values, group.values);
                comparisons++;
                if (score >= settings.minimum) {
                    best.push({ id: course.id, score });
                }
            }
            best.sort(stable);
            best.length = Math.min(best.length, settings.limit);
            await tick();
        }
        for (const c of best)
            pairs.push({ id: hash([c.id, group.id]), courseId: c.id, groupId: group.id, score: c.score });
        onProgress(i + 1, groups.length);
    }
    return { pairs, comparisons };
}
export const jaccard = (a: string[], b: string[]) => { const right = new Set(b); let shared = 0; for (const id of a)
    if (right.has(id))
        shared++; return shared / (a.length + b.length - shared); };
function insert(best: {
    id: string;
    score: number;
}[], item: {
    id: string;
    score: number;
}, k: number) { if (best.length === k && stable(item, best[best.length - 1]) >= 0)
    return; let pos = 0; while (pos < best.length && stable(best[pos], item) <= 0)
    pos++; best.splice(pos, 0, item); if (best.length > k)
    best.pop(); }
export async function discover(courses: Embedded[], settings: Settings, signal?: AbortSignal, onProgress = (done: number, total: number) => { void done; void total; }) {
    validateScope(courses, []);
    const check = guard(settings, signal);
    const sorted = [...courses].sort((a, b) => a.id < b.id ? -1 : 1);
    const neighbors = new Map(sorted.map(c => [c.id, [] as {
            id: string;
            score: number;
        }[]]));
    let comparisons = 0;
    // Symmetric exact blocks, O(N*k + N*D) memory, no N-by-N score matrix.
    for (let offset = 0; offset < sorted.length; offset += 16) {
        check();
        for (let i = offset; i < Math.min(sorted.length, offset + 16); i++) {
            const a = sorted[i], an = neighbors.get(a.id)!;
            for (let j = i + 1; j < sorted.length; j++) {
                if (j % 4096 === 0) { await tick(); check(); }
                const b = sorted[j], score = dot(a.values, b.values);
                comparisons++;
                if (score >= settings.minimum) {
                    insert(an, { id: b.id, score }, settings.k);
                    insert(neighbors.get(b.id)!, { id: a.id, score }, settings.k);
                }
            }
        }
        onProgress(Math.min(offset + 16, sorted.length), sorted.length);
        await tick();
    }
    const byId = new Map(sorted.map(c => [c.id, c]));
    const sets = new Map<string, DiscoveredSet>();
    let truncated = false;
    for (const seed of sorted) {
        check();
        if (sets.size >= settings.candidateCap) {
            truncated = true;
            break;
        }
        const members = [seed.id];
        for (const candidate of neighbors.get(seed.id)!) {
            let coherent = true;
            for (const id of members) {
                comparisons++;
                if (dot(byId.get(id)!.values, byId.get(candidate.id)!.values) < settings.coherence) {
                    coherent = false;
                    break;
                }
            }
            if (coherent)
                members.push(candidate.id);
        }
        if (members.length < settings.minSize)
            continue;
        members.sort();
        const id = hash(members);
        const existing = sets.get(id);
        if (existing) {
            existing.seeds.push(seed.id);
            continue;
        }
        let sum = 0, minimum = 1, number = 0;
        const means = new Map(members.map(id => [id, 0]));
        for (let i = 0; i < members.length; i++)
            for (let j = i + 1; j < members.length; j++) {
                const score = dot(byId.get(members[i])!.values, byId.get(members[j])!.values);
                comparisons++;
                sum += score;
                minimum = Math.min(minimum, score);
                number++;
                means.set(members[i], means.get(members[i])! + score);
                means.set(members[j], means.get(members[j])! + score);
            }
        const medoid = members.map(id => ({ id, score: means.get(id)! })).sort(stable)[0].id;
        sets.set(id, { id, members, seeds: [seed.id], medoid, mean: sum / number, minimum, suppressedBy: null, reconciliation: [], status: 'novel' });
        if (sets.size % 32 === 0)
            await tick();
    }
    const result = [...sets.values()].sort((a, b) => b.members.length - a.members.length || b.mean - a.mean || (a.members.join('\0') < b.members.join('\0') ? -1 : 1));
    const retained: DiscoveredSet[] = [];
    for (const set of result) {
        check();
        let duplicate: DiscoveredSet | undefined;
        if (settings.jaccard !== null) {
            for (let i = 0; i < retained.length; i++) {
                if (i % 128 === 0) {
                    check();
                    await tick();
                }
                if (jaccard(retained[i].members, set.members) > settings.jaccard) {
                    duplicate = retained[i];
                    break;
                }
            }
        }
        if (duplicate)
            set.suppressedBy = duplicate.id;
        else
            retained.push(set);
    }
    return { sets: result, comparisons, truncated };
}
export async function reconcile(sets: DiscoveredSet[], courses: Embedded[], groups: Embedded[], settings: Settings, signal?: AbortSignal) {
    validateScope(courses, groups);
    const check = guard(settings, signal);
    const byId = new Map(courses.map(c => [c.id, c]));
    for (let index = 0; index < sets.length; index++) {
        check();
        const set = sets[index], dimension = courses[0]?.values.length ?? 1024, centroid = new Float32Array(dimension);
        for (const id of set.members) {
            const v = byId.get(id)!.values;
            for (let d = 0; d < dimension; d++)
                centroid[d] += v[d];
        }
        const norm = Math.hypot(...centroid);
        if (norm > 0)
            for (let d = 0; d < dimension; d++)
                centroid[d] /= norm;
        const nearby = groups.map(g => ({ id: g.id, score: dot(centroid, g.values) })).sort(stable).slice(0, settings.groupLimit);
        set.reconciliation = nearby.map(g => { const vector = groups.find(v => v.id === g.id)!; const members = set.members.map(id => { const score = dot(byId.get(id)!.values, vector.values); return { courseId: id, score, passes: score >= settings.minimum }; }); return { groupId: g.id, centroidScore: g.score, members, fraction: members.filter(m => m.passes).length / members.length }; });
        const full = set.reconciliation.filter(r => r.fraction === 1).length;
        set.status = full > 1 ? 'ambiguous' : full === 1 ? 'covered' : set.reconciliation.some(r => r.fraction > 0) ? 'partial' : 'novel';
        if (index % 32 === 0)
            await tick();
    }
    return sets;
}

function validateScope(courses: Embedded[], groups: Embedded[]) {
    assert(courses.length <= 10000 && groups.length <= 100, 'Scope exceeds explicit caps');
    const dimension = courses[0]?.values.length ?? groups[0]?.values.length;
    for (const scope of [courses, groups]) {
        assert(new Set(scope.map(v => v.id)).size === scope.length, 'Duplicate entity');
        for (const vector of scope) {
            assert(vector.values.length === dimension && dimension && dimension <= 1024, 'Incompatible vector dimensions');
            assert(vector.values.every(Number.isFinite) && Math.abs(Math.hypot(...vector.values) - 1) < 1e-5, 'Invalid normalized vector');
        }
    }
}
function guard(settings: Settings, signal?: AbortSignal) {
    assert(settings.minimum >= -1 && settings.minimum <= 1 && settings.coherence >= -1 && settings.coherence <= 1, 'Invalid thresholds');
    assert(settings.jaccard === null || settings.jaccard >= 0 && settings.jaccard <= 1, 'Invalid overlap');
    for (const [value, min, max] of [[settings.k, 1, 12], [settings.limit, 1, 10000], [settings.minSize, 2, 13], [settings.groupLimit, 1, 5], [settings.candidateCap, 1, 10000]])
        assert(Number.isInteger(value) && value >= min && value <= max, 'Invalid algorithm bounds');
    const deadline = performance.now() + 120000;
    return () => {
        signal?.throwIfAborted();
        assert(performance.now() < deadline, 'Algorithm time cap exceeded; unfinished attempt');
    };
}
