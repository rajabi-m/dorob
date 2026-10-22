import { test, expect } from 'bun:test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/storage';
import { compare, feedbackSummary, exportEvidence, importEvidence } from '../src/evidence';
import { seal, hash, type Feedback, type Run } from '../src/contracts';
import { dataset, config, run, pairId } from './fixtures';
test('review summaries exclude uncertain/unreviewed from determinate denominator', () => { const events: Feedback[] = ['uncertain', 'suitable', 'unsuitable'].map((label, i) => seal({ version: 1, kind: 'feedback', eventId: String(i), runId: run.id, targetId: pairId, label: label as Feedback['label'], note: '', title: '', createdAt: `2026-10-16T00:00:0${i}Z` })); expect(feedbackSummary(run, events).denominator).toBe(1); expect(feedbackSummary(run, events).suitableFraction).toBe(0); expect(feedbackSummary(run, [events[0]]).denominator).toBe(0); expect(feedbackSummary(run, []).unreviewed).toBe(1); });
test('comparison exposes differences and many-to-many split/merge associations', () => { const set = (members: string[]) => ({ id: hash(members), members, seeds: [], medoid: members[0], mean: 0.8, minimum: 0.7, suppressedBy: null, reconciliation: [], status: 'novel' as const }); const a: Run = { ...run, sets: [set(['a', 'b', 'c'])] }, b: Run = { ...run, datasetId: hash('other'), configurationId: hash('model'), pairs: [], sets: [set(['a', 'b']), set(['b', 'c'])] }; const c = compare(a, b); expect(c.warnings.length).toBe(2); expect(c.removedPairs.length).toBe(1); expect(c.splits).toEqual([a.sets[0].id]); expect(c.associations[0].removed).toContain('c'); });
test('portable evidence reimports offline; tampering preserves previous evidence', async () => { const root = await realpath(await mkdtemp(join(tmpdir(), 'lab-evidence-'))); const root2 = await realpath(await mkdtemp(join(tmpdir(), 'lab-evidence-'))); try {
    const s = new Store(root);
    await s.put(dataset);
    await s.put(config);
    await s.put(run);
    await s.feedback({ eventId: 'event1', runId: run.id, targetId: pairId, label: 'uncertain' });
    const bundle = await exportEvidence(s, [run.id]);
    expect(bundle.vectors).toEqual([]);
    const dest = new Store(root2);
    await importEvidence(dest, bundle);
    await importEvidence(dest, bundle);
    expect(await dest.read('run', run.id)).toEqual(run);
    expect((await dest.list('feedback')).length).toBe(1);
    await expect(importEvidence(dest, { ...bundle, id: '0'.repeat(64) })).rejects.toThrow();
    expect((await dest.list('run')).length).toBe(1);
}
finally {
    await rm(root, { recursive: true, force: true });
    await rm(root2, { recursive: true, force: true });
} });
