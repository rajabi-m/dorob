import { join } from 'node:path';
import { assert, object, text, strings, key, type Dataset, type Configuration, type Run, type Feedback, type Vector } from './contracts';
import { Store } from './storage';
import { Coordinator, type Selection } from './coordinator';
import { exportEvidence, importEvidence, compare, feedbackSummary } from './evidence';
import { jaccard } from './algorithms';
import { buildInput } from './input';
const BODY_LIMIT = 32 * 1024 * 1024;
export function handler(store: Store, coordinator: Coordinator, origin: string, publicRoot: string) {
    const json = (v: unknown, status = 200) => Response.json(v, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    return async (request: Request): Promise<Response> => {
        try {
            const url = new URL(request.url);
            assert(url.origin === origin && request.headers.get('host') === new URL(origin).host, 'Unexpected local Host');
            if (request.method !== 'GET')
                assert(request.headers.get('origin') === origin && request.headers.get('content-type')?.startsWith('application/json'), 'Unexpected Origin or content type');
            const path = url.pathname;
            let body: Record<string, unknown> = {};
            if (request.method === 'POST') {
                assert(Number(request.headers.get('content-length') ?? 0) <= BODY_LIMIT, 'Request too large');
                const bytes = await request.bytes();
                assert(bytes.length <= BODY_LIMIT, 'Request too large');
                body = object(JSON.parse(new TextDecoder().decode(bytes)));
            }
            if (request.method === 'GET' && path === '/api/state') {
                const [datasets, configurations, runs, feedback] = await Promise.all([store.list<Dataset>('dataset'), store.list<Configuration>('configuration'), store.list<Run>('run'), store.list<Feedback>('feedback')]);
                return json({ datasets: datasets.map(d => ({ id: d.id, startedAt: d.startedAt, coverage: d.coverage, consistent: d.consistent, failures: d.failures, exclusions: d.exclusions })), configurations, runs: runs.map(r => ({ id: r.id, datasetId: r.datasetId, configurationId: r.configurationId, operation: r.operation, createdAt: r.createdAt, partial: r.partial, pairs: r.pairs.length, sets: r.sets.length })), operation: coordinator.state, feedback });
            }
            if (request.method === 'GET' && path === '/api/coverage') {
                const d = await store.read<Dataset>('dataset', key(url.searchParams.get('dataset'))), cfg = key(url.searchParams.get('configuration'));
                const vectors = await store.list<Vector>('vector');
                const inputs = [...d.courses.map(c => buildInput('course', c)), ...d.groups.map(g => buildInput('group', g))];
                return json(inputs.map(i => ({ ...i, cached: vectors.some(v => v.configurationId === cfg && v.input.hash === i.hash) })));
            }
            if (request.method === 'GET' && path === '/api/operation')
                return json(coordinator.state);
            const entity = path.match(/^\/api\/(dataset|run)\/([a-f0-9]{64})$/);
            if (request.method === 'GET' && entity) {
                const value = await store.read(entity[1] as 'dataset' | 'run', entity[2]);
                return json(value);
            }
            if (request.method === 'POST' && path === '/api/start') {
                assert(['embed', 'match', 'discover'].includes(text(body.operation, 20)));
                const selection = object(body.selection) as unknown as Selection;
                await coordinator.selection(selection);
                assert(coordinator.state?.state !== 'running', 'Another operation is active');
                const promise = body.operation === 'embed' ? coordinator.embed(selection) : coordinator.run(body.operation as 'match' | 'discover', selection);
                void promise.catch(() => { });
                return json(coordinator.state, 202);
            }
            if (request.method === 'POST' && path === '/api/cancel') {
                coordinator.cancel();
                return json({ ok: true });
            }
            if (request.method === 'POST' && path === '/api/feedback') {
                const result = await store.feedback({ eventId: text(body.eventId, 100), runId: key(body.runId), targetId: key(body.targetId), label: text(body.label, 20) as Feedback['label'], note: text(body.note ?? '', 4000), title: text(body.title ?? '', 300) });
                return json(result);
            }
            if (request.method === 'POST' && path === '/api/export') {
                assert(typeof body.includeVectors === 'boolean');
                const evidence = await exportEvidence(store, strings(body.runIds, 20), body.includeVectors);
                return new Response(JSON.stringify(evidence), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="dorob-evidence-${evidence.id.slice(0, 12)}.json"`, 'Cache-Control': 'no-store' } });
            }
            if (request.method === 'POST' && path === '/api/reimport')
                return json({ id: await importEvidence(store, body) });
            if (request.method === 'GET' && path === '/api/compare') {
                const a = await store.read<Run>('run', key(url.searchParams.get('left'))), b = await store.read<Run>('run', key(url.searchParams.get('right')));
                return json(compare(a, b, await store.read<Dataset>('dataset', a.datasetId), await store.read<Dataset>('dataset', b.datasetId)));
            }
            if (request.method === 'GET' && path === '/api/related') {
                const current = await store.read<Run>('run', key(url.searchParams.get('run'))), target = key(url.searchParams.get('target'));
                const pair = current.pairs.find(p => p.id === target), set = current.sets.find(s => s.id === target);
                assert(pair || set, 'Unknown target');
                const runs = await store.list<Run>('run'), events = await store.list<Feedback>('feedback');
                const context = events.filter(f => f.runId !== current.id).flatMap(f => { const other = runs.find(r => r.id === f.runId); if (!other)
                    return []; if (pair && other.pairs.some(p => p.id === f.targetId && p.courseId === pair.courseId && p.groupId === pair.groupId))
                    return [{ ...f, overlap: 1 }]; const otherSet = other.sets.find(s => s.id === f.targetId); if (set && otherSet) {
                    const overlap = jaccard(set.members, otherSet.members);
                    if (overlap > 0)
                        return [{ ...f, overlap }];
                } return []; });
                return json(context);
            }
            if (request.method === 'GET' && path === '/api/summary') {
                const r = await store.read<Run>('run', key(url.searchParams.get('run')));
                return json(feedbackSummary(r, await store.list<Feedback>('feedback')));
            }
            if (request.method === 'GET' && !path.startsWith('/api/')) {
                const name = path === '/' ? 'index.html' : path.slice(1);
                assert(/^[a-zA-Z0-9_.-]+$/.test(name), 'Invalid asset');
                const file = Bun.file(join(publicRoot, name));
                if (await file.exists())
                    return new Response(file, { headers: { 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
            }
            return json({ error: 'مسیر پیدا نشد.' }, 404);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Operation failed';
            return json({ error: 'عملیات انجام نشد. تنظیمات و پیش‌نیازها را بررسی کنید.', detail: message }, message.includes('Host') || message.includes('Origin') ? 403 : message.includes('active') || message.includes('writer') ? 409 : 422);
        }
    };
}
if (import.meta.main) {
    const port = Number(process.env.LAB_PORT ?? 3010);
    assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Invalid LAB_PORT');
    const store = new Store(), coordinator = new Coordinator(store);
    const publicRoot = join(import.meta.dir, import.meta.dir.endsWith('/dist') ? 'public' : '../dist/public');
    const origin = `http://127.0.0.1:${port}`;
    const server = Bun.serve({ hostname: '127.0.0.1', port, maxRequestBodySize: BODY_LIMIT, fetch: handler(store, coordinator, origin, publicRoot) });
    console.log(`Embedding lab: ${origin}`);
    for (const signal of ['SIGINT', 'SIGTERM'] as const)
        process.once(signal, () => { coordinator.cancel(); server.stop(); });
}
