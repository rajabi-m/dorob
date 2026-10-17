import { test, expect } from 'bun:test';
import { match, discover, reconcile, type Embedded } from '../src/algorithms';
import { defaults } from '../src/contracts';
const unit = (id: string, angle: number): Embedded => ({ id, values: new Float32Array([Math.cos(angle), Math.sin(angle)]) });
test('matching applies threshold before limit, stable ties and independent groups including empty drafts', async () => { const courses = [unit('z', 0), unit('a', 0), unit('negative', Math.PI)]; const result = await match(courses, [unit('g1', 0), unit('g2', 0)], { ...defaults, minimum: 0.9, limit: 1 }); expect(result.pairs.map(p => p.courseId)).toEqual(['a', 'a']); expect((await match(courses, [unit('g1', Math.PI / 2)], { ...defaults, minimum: 0.99 })).pairs).toEqual([]); });
test('coherence rejects bridge chains, preserves shared courses, deduplicates exact sets with deterministic ties', async () => { const courses = [unit('a', -0.6), unit('bridge', 0), unit('b', 0.6)]; const settings = { ...defaults, minimum: 0.7, coherence: 0.7, k: 10 }; const result = await discover(courses, settings); const members = result.sets.map(s => s.members); expect(members).toContainEqual(['a', 'bridge']); expect(members).toContainEqual(['b', 'bridge']); expect(members.every(m => m.length === 2)).toBe(true); expect((await discover([...courses].reverse(), settings)).sets).toEqual(result.sets); expect((await discover(courses, { ...settings, minSize: 3 })).sets).toEqual([]); });
test('near-duplicate suppression records provenance and top-k/candidate caps are explicit', async () => { const c = [unit('a', 0), unit('b', 0.05), unit('c', 0.1), unit('d', 0.2)]; const settings = { ...defaults, minimum: 0.9, coherence: 0.9, k: 2, jaccard: 0.4 }; const result = await discover(c, settings); expect(result.sets.some(s => s.suppressedBy !== null)).toBe(true); const capped = await discover(c, { ...settings, candidateCap: 1 }); expect(capped.truncated).toBe(true); expect(capped.sets.length).toBe(1); });
test('centroid retrieval cannot blanket-assign members; no existing groups leaves unnamed novelty', async () => { const courses = [unit('a', 0), unit('b', 0.7)]; const result = await discover(courses, { ...defaults, minimum: 0.5, coherence: 0.5 }); await reconcile(result.sets, courses, [unit('g1', 0)], { ...defaults, minimum: 0.95 }); expect(result.sets[0].status).toBe('partial'); expect(result.sets[0].reconciliation[0].fraction).toBe(0.5); await reconcile(result.sets, courses, [], defaults); expect(result.sets[0].status).toBe('novel'); });
test('raw .60 threshold excludes .59999 without rounding', async () => {
    const vector = (id: string, score: number): Embedded => ({ id, values: new Float32Array([score, Math.sqrt(1-score*score)]) });
    // Float32 representations straddle the raw threshold deliberately.
    const result = await match([vector('low', .59999), vector('boundary', .60)], [unit('g', 0)], defaults);
    expect(result.pairs.map(p => p.courseId)).toEqual(['boundary']);
});
test('strict Jaccard boundary and preferred defaults', async () => {
    const { jaccard } = await import('../src/algorithms');
    expect(jaccard(['a','b','c','d'], ['a','b','c','d','e'])).toBe(.80);
    expect(defaults).toMatchObject({ minimum: .6, coherence: .7, k: 12, minSize: 2, jaccard: .8, groupLimit: 5 });
    const result = await discover(Array.from({ length: 6 }, (_, i) => unit(String(i), 0)), { ...defaults, k: 4 });
    expect(result.sets.every(s => s.suppressedBy === null)).toBe(true);
});
test('five nearest definitions only; member scores remain direct', async () => {
    const courses = [unit('a', 0), unit('b', .7)];
    const result = await discover(courses, defaults);
    await reconcile(result.sets, courses, Array.from({ length: 8 }, (_, i) => unit('g'+i, 0)), defaults);
    expect(result.sets[0].reconciliation.map(r => r.groupId)).toEqual(['g0','g1','g2','g3','g4']);
    expect(result.sets[0].status).toBe('ambiguous');
});
test('reject oversized scope and acknowledge event-loop cancellation', async () => {
    await expect(discover(Array.from({ length: 10001 }, (_, i) => unit(String(i), 0)), defaults)).rejects.toThrow('caps');
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1);
    await expect(discover(Array.from({ length: 1000 }, (_, i) => unit(String(i), i/1000)), defaults, controller.signal)).rejects.toThrow();
    await expect(match([unit('same', 0), unit('same', 0)], [], defaults)).rejects.toThrow('Duplicate');
});
