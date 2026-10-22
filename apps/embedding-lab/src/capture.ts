import { categoryRegistry } from '@dorob/core';
import { assert, object, text, list, strings, finite, identifier, seal, hash, validateArtifact, type Course, type Group, type Dataset } from './contracts';
import { Store, MAX_BYTES } from './storage';
import { boundedJSON } from './bounded';
export type GetJSON = (path: string) => Promise<unknown>;
export function readOnlyClient(origin: string, signal?: AbortSignal): GetJSON {
    const u = new URL(origin);
    assert(['http:', 'https:'].includes(u.protocol) && u.origin === origin, 'Use a credential-free origin');
    return async (path) => { assert(path.startsWith('/api/v1/manage/')); const response = await fetch(origin + path, { method: 'GET', redirect: 'error', signal: AbortSignal.any([AbortSignal.timeout(10000), ...(signal ? [signal] : [])]) }); assert(response.ok, `Catalog read failed (${response.status})`); return boundedJSON(response, MAX_BYTES); };
}
async function pages(get: GetJSON, path: string, field?: string) { const items: Record<string, unknown>[] = []; let total = -1; for (let offset = 0; offset <= 20000;) {
    const root = object(await get(`${path}?limit=100&offset=${offset}`));
    const page = field ? object(root[field]) : root;
    const n = finite(page.total, 0, 20000);
    assert(Number.isInteger(n));
    if (total < 0)
        total = n;
    assert(total === n, 'Enumeration total drift');
    assert(page.offset === offset && page.limit === 100, 'Unexpected pagination');
    const batch = list(page.items, 100).map(object);
    items.push(...batch);
    assert(items.length <= total);
    if (items.length === total)
        return { items, total };
    assert(batch.length > 0, 'Incomplete pagination');
    offset += batch.length;
} throw Error('Capture size bound exceeded'); }
const optional = (v: unknown) => v === null || v === undefined ? null : text(v);
function section(payload: Record<string, unknown>, name: string) { const v = payload[name]; if (v === undefined)
    return null; const s = object(v); assert(['complete', 'partial', 'unknown', 'failed'].includes(text(object(s.coverage).status))); return s.data; }
export function courseFromDetail(raw: unknown, expected: Record<string, unknown>): Course {
    const detail = object(raw), r = object(detail.reference);
    assert(hash(r) === hash(expected), 'Course reference changed during capture');
    const base: Course = { id: identifier(r.id), providerId: identifier(r.providerId), title: text(r.title, 300), sourceUrl: text(r.sourceUrl, 2048), snapshotId: null, collectedAt: null, description: null, outcomes: [], prerequisites: [], audience: [], technologies: [], level: null, syllabus: [] };
    if (detail.snapshot === null)
        return base;
    const s = object(detail.snapshot), p = object(s.payload);
    assert(p.schemaVersion === 3 && s.courseId === r.id && p.providerId === r.providerId && `${p.providerId}:${p.providerCourseId}` === r.id, 'Observation identity mismatch');
    base.snapshotId = identifier(s.id);
    base.collectedAt = text(object(p.source).checkedAt, 40);
    base.title = text(p.title, 300);
    base.sourceUrl = text(p.sourceUrl, 2048);
    base.description = optional(section(p, 'description'));
    const ed = section(p, 'education');
    if (ed !== null) {
        const e = object(ed);
        base.outcomes = e.learningOutcomes == null ? [] : strings(e.learningOutcomes);
        base.prerequisites = e.prerequisites == null ? [] : [text(e.prerequisites)];
        base.audience = e.intendedAudience == null ? [] : [text(e.intendedAudience)];
        base.technologies = e.technologies == null ? [] : list(e.technologies).map(t => text(object(t).name));
    }
    const cl = section(p, 'classification');
    if (cl !== null)
        base.level = optional(object(cl).providerLevel);
    const curriculum = section(p, 'curriculum');
    if (curriculum !== null) {
        const syllabus = object(curriculum).syllabus;
        if (syllabus !== null && syllabus !== undefined) {
            base.syllabus = list(syllabus).map(object).sort((a, b) => finite(a.order) - finite(b.order)).flatMap(s => [text(s.title), ...((s.lessons == null) ? [] : list(s.lessons).map(object).sort((a, b) => finite(a.order) - finite(b.order)).map(l => text(l.title)))]);
        }
    }
    return base;
}
export async function capture(get: GetJSON, origin: string, exclusions: string[] = [], signal?: AbortSignal): Promise<Dataset> {
    const startedAt = new Date().toISOString(), failures: string[] = [];
    const courses: Course[] = [], groups: Group[] = [];
    let consistent = true;
    const firstCourses = await pages(get, '/api/v1/manage/courses'), firstGroups = await pages(get, '/api/v1/manage/groups');
    const courseIds = firstCourses.items.map(r => identifier(r.id));
    assert(new Set(courseIds).size === courseIds.length, 'Duplicate course ID');
    assert(new Set(firstGroups.items.map(r => r.id)).size === firstGroups.items.length, 'Duplicate group ID');
    for (const r of firstCourses.items) {
        signal?.throwIfAborted();
        try {
            const course = courseFromDetail(await get('/api/v1/manage/courses/' + encodeURIComponent(identifier(r.id))), r);
            courses.push(course);
            if (!course.snapshotId)
                failures.push(`missing-observation:${course.id}`);
        }
        catch {
            failures.push(`course-read:${identifier(r.id)}`);
        }
    }
    for (const r of firstGroups.items) {
        signal?.throwIfAborted();
        if (exclusions.includes(identifier(r.id)))
            continue;
        try {
            const detail = await pages(get, '/api/v1/manage/groups/' + encodeURIComponent(identifier(r.id)), 'courses');
            const category = categoryRegistry.find(c => c.id === r.categoryId);
            assert(category, 'Unknown category');
            const members = detail.items.map(c => identifier(c.id));
            assert(new Set(members).size === members.length && members.every(id => courses.some(c => c.id === id)), 'Missing membership reference');
            groups.push({ id: identifier(r.id), title: text(r.title, 300), description: text(r.description, 2000), categoryId: category.id, categoryLabel: category.label, targetLevel: optional(r.targetLevel), members: members.sort() });
        }
        catch {
            failures.push(`group-read:${identifier(r.id)}`);
        }
    }
    try {
        const lastCourses = await pages(get, '/api/v1/manage/courses'), lastGroups = await pages(get, '/api/v1/manage/groups');
        assert(hash(firstCourses) === hash(lastCourses) && hash(firstGroups) === hash(lastGroups), 'Catalog enumeration drift');
        for (const group of groups) {
            const second = await pages(get, '/api/v1/manage/groups/' + encodeURIComponent(group.id), 'courses');
            assert(hash(group.members) === hash(second.items.map(c => identifier(c.id)).sort()), 'Membership drift');
        }
    }
    catch {
        consistent = false;
        failures.push('enumeration-drift-or-recheck-failure');
    }
    const dataset: Dataset = seal({ version: 1, kind: 'dataset', startedAt, endedAt: new Date().toISOString(), origin, courses, groups, exclusions: [...new Set(exclusions)].sort(), failures, consistent, coverage: { courseTotal: firstCourses.total, groupTotal: firstGroups.total, selectedCourses: courses.length, selectedGroups: groups.length } });
    validateArtifact(dataset);
    return dataset;
}
export async function importDataset(store: Store, raw: unknown) { const artifact = validateArtifact(raw); assert(artifact.kind === 'dataset', 'Expected dataset'); return store.write(() => store.put(artifact)); }
export function requireCoverage(dataset: Dataset, allowPartial: boolean) { assert(allowPartial || (dataset.consistent && dataset.failures.length === 0), 'Dataset is incomplete or inconsistent; explicitly select partial coverage'); }
