import { assert, seal, validateArtifact, type Run, type Dataset, type Configuration, type Evidence, type Feedback, type Vector } from './contracts';
import { Store } from './storage';
import { buildInput } from './input';
export function compare(a: Run, b: Run, ad?: Dataset, bd?: Dataset) {
    const pairKey = (p: Run['pairs'][number]) => JSON.stringify([p.courseId, p.groupId]);
    const ap = new Set(a.pairs.map(pairKey)), bp = new Set(b.pairs.map(pairKey));
    const associations: {
        from: string;
        to: string;
        jaccard: number;
        added: string[];
        removed: string[];
    }[] = [];
    // Bound portable comparison output; exact counts remain available even when details hit the cap.
    const inverted = new Map<string, number[]>();
    b.sets.forEach((s, index) => { for (const id of s.members) {
        const indices = inverted.get(id) ?? [];
        indices.push(index);
        inverted.set(id, indices);
    } });
    const sourceCounts = new Map<string, number>(), targetCounts = new Map<string, number>();
    let associationCount = 0;
    for (const x of a.sets) {
        const counts = new Map<number, number>();
        for (const member of x.members)
            for (const index of inverted.get(member) ?? [])
                counts.set(index, (counts.get(index) ?? 0) + 1);
        sourceCounts.set(x.id, counts.size);
        for (const [index, intersection] of counts) {
            const y = b.sets[index];
            associationCount++;
            targetCounts.set(y.id, (targetCounts.get(y.id) ?? 0) + 1);
            if (associations.length < 50000)
                associations.push({ from: x.id, to: y.id, jaccard: intersection / (x.members.length + y.members.length - intersection), added: y.members.filter(id => !x.members.includes(id)), removed: x.members.filter(id => !y.members.includes(id)) });
        }
    }
    const partialAssociations = associationCount > associations.length;
    return { associationCount, partialAssociations, associationLimit: 50000, warnings: [...(partialAssociations ? ['نمایش جزئیات هم‌پوشانی به پنجاه هزار رابطه محدود شده است؛ شمارش تقسیم و ادغام کامل است.'] : []), ...(a.datasetId !== b.datasetId ? ['مجموعه‌داده‌ها متفاوت‌اند؛ تغییرها فقط ناشی از الگوریتم نیستند.'] : []), ...(a.configurationId !== b.configurationId ? ['مدل یا قالب ورودی متفاوت است؛ امتیازها مقیاس مشترک ندارند.'] : []), ...(a.operation !== b.operation ? ['نوع آزمایش متفاوت است.'] : [])], addedPairs: [...bp].filter(k => !ap.has(k)), removedPairs: [...ap].filter(k => !bp.has(k)), associations, splits: a.sets.filter(s => (sourceCounts.get(s.id) ?? 0) > 1).map(s => s.id), merges: b.sets.filter(s => (targetCounts.get(s.id) ?? 0) > 1).map(s => s.id), addedCourses: bd && ad ? bd.courses.filter(c => !ad.courses.some(x => x.id === c.id)).map(c => c.id) : [], removedCourses: ad && bd ? ad.courses.filter(c => !bd.courses.some(x => x.id === c.id)).map(c => c.id) : [] };
}
export function feedbackSummary(run: Run, events: Feedback[]) { const targets = [...run.pairs.map(p => p.id), ...run.sets.map(s => s.id)]; const latest = new Map<string, Feedback>(); for (const f of [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)))
    if (f.runId === run.id && targets.includes(f.targetId))
        latest.set(f.targetId, f); const labels = [...latest.values()]; const suitable = labels.filter(f => f.label === 'suitable').length, unsuitable = labels.filter(f => f.label === 'unsuitable').length, uncertain = labels.filter(f => f.label === 'uncertain').length; return { suitable, unsuitable, uncertain, unreviewed: targets.length - latest.size, denominator: suitable + unsuitable, suitableFraction: suitable + unsuitable ? suitable / (suitable + unsuitable) : null }; }
export function validateClosure(e: Evidence) {
    const d = e.dataset, c = e.configuration;
    for (const r of e.runs) {
        assert(r.datasetId === d.id && r.configurationId === c.id, 'Run manifest mismatch');
        assert(r.courseIds.every(id => d.courses.some(c => c.id === id)) && r.groupIds.every(id => d.groups.some(g => g.id === id)), 'Unknown run entity');
        for (const i of r.inputs) {
            const entity = i.entity === 'course' ? d.courses.find(c => c.id === i.entityId) : d.groups.find(g => g.id === i.entityId);
            assert(entity && buildInput(i.entity, entity).hash === i.hash, 'Input provenance mismatch');
        }
    }
    for (const v of e.vectors) {
        const entity = v.input.entity === 'course' ? d.courses.find(c => c.id === v.input.entityId) : d.groups.find(g => g.id === v.input.entityId);
        assert(entity && buildInput(v.input.entity, entity).hash === v.input.hash && e.runs.some(r => r.vectorIds.includes(v.id)), 'Vector reference mismatch');
    }
    assert(new Set(e.runs.map(r => r.id)).size === e.runs.length && new Set(e.feedback.map(f => f.eventId)).size === e.feedback.length, 'Duplicate evidence reference');
    return e;
}
export async function exportEvidence(store: Store, runIds: string[], includeVectors = false): Promise<Evidence> { assert(runIds.length > 0 && runIds.length <= 20); const runs = await Promise.all(runIds.map(id => store.read<Run>('run', id))); assert(runs.every(r => r.datasetId === runs[0].datasetId && r.configurationId === runs[0].configurationId), 'Export one dataset/configuration per bundle'); const dataset = await store.read<Dataset>('dataset', runs[0].datasetId), configuration = await store.read<Configuration>('configuration', runs[0].configurationId); const feedback = (await store.list<Feedback>('feedback')).filter(f => runs.some(r => r.id === f.runId)); const vectors = includeVectors ? (await store.list<Vector>('vector')).filter(v => runs.some(r => r.vectorIds.includes(v.id))) : []; const evidence: Evidence = seal({ version: 1, kind: 'evidence', dataset, configuration, runs, feedback, vectors }); validateArtifact(evidence); validateClosure(evidence); return evidence; }
export async function importEvidence(store: Store, raw: unknown) { const e = validateArtifact(raw); assert(e.kind === 'evidence'); validateClosure(e); return store.write(async () => { const existing = await store.list<Feedback>('feedback'); for (const f of e.feedback) {
    const prior = existing.find(x => x.eventId === f.eventId);
    assert(!prior || prior.id === f.id, 'Conflicting feedback identity');
} await store.put(e.dataset); await store.put(e.configuration); for (const artifact of [...e.vectors, ...e.runs, ...e.feedback])
    await store.put(artifact); await store.put(e); return e.id; }); }
