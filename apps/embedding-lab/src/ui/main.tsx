import { useEffect, useState, useRef, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Dataset, Configuration, Run, Feedback, Input, Settings, Pair, DiscoveredSet } from '../contracts';
import type { OperationState } from '../coordinator';
import type { compare } from '../evidence';
import '@fontsource-variable/vazirmatn';
import './style.css';
type State = {
    datasets: Pick<Dataset, 'id' | 'startedAt' | 'coverage' | 'consistent' | 'failures' | 'exclusions'>[];
    configurations: Configuration[];
    runs: (Pick<Run, 'id' | 'datasetId' | 'configurationId' | 'operation' | 'createdAt' | 'partial'> & {
        pairs: number;
        sets: number;
    })[];
    operation: OperationState | null;
    feedback: Feedback[];
};
type Coverage = Input & {
    cached: boolean;
};
type Comparison = ReturnType<typeof compare>;
const nf = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 }), df = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
const n = (x: number) => nf.format(x), date = (s: string) => df.format(new Date(s));
const id = (s: string) => <bdi dir="ltr" className="hash">{s}</bdi>;
const settingsDefault: Settings = { minimum: .55, limit: 20, k: 20, coherence: .65, minSize: 2, jaccard: null, groupLimit: 5, candidateCap: 10000 };
function explain(message:string){
 if(message.includes('Missing vectors'))return 'برای این دامنه بردار کامل نداریم؛ ابتدا بردارها را بسازید یا اجرای با پوشش ناقص را صریح انتخاب کنید.';
 if(message.includes('Another operation')||message.includes('writer'))return 'عملیات دیگری در حال اجراست؛ تا پایان آن صبر کنید یا آن را لغو کنید.';
 if(message.includes('digest')||message.includes('configuration changed'))return 'نسخهٔ مدل با پیکربندی انتخاب‌شده یکسان نیست؛ مدل و پیکربندی را بررسی کنید.';
 if(message.includes('not installed'))return 'مدل انتخاب‌شده نصب نیست؛ مدل ثبت‌شده را در اُلامای محلی بررسی کنید.';
 if(message.includes('Ollama')||message.includes('fetch')||message.includes('connect'))return 'ارتباط محلی برقرار نشد؛ اجرای سرویس و پورت آن را بررسی کنید و دوباره تلاش کنید.';
 if(message.includes('No eligible'))return 'در دامنهٔ انتخاب‌شده بردار آموزشی آماده وجود ندارد؛ داده و دامنه را بررسی کنید.';
 if(message.includes('incomplete')||message.includes('inconsistent'))return 'دریافت داده ناقص یا ناسازگار است؛ پوشش را بررسی کنید و در صورت نیاز اجرای ناقص را صریح انتخاب کنید.';
 return /[\u0600-\u06ff]/.test(message)?message:'عملیات انجام نشد؛ داده، مدل و تنظیمات را بررسی کنید و دوباره تلاش کنید.';
}
async function api<T>(path: string, body?: unknown): Promise<T> { const response = await fetch('/api/' + path, { ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }); const value = await response.json(); if (!response.ok)
    throw Error([value.error, value.detail].filter(Boolean).join(' ')); return value as T; }
function App() {
    const [state, setState] = useState<State | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [datasetId, setDatasetId] = useState(''), [cfgId, setCfgId] = useState(''), [dataset, setDataset] = useState<Dataset | null>(null), [coverage, setCoverage] = useState<Coverage[]>([]), [courseIds, setCourseIds] = useState<string[]>([]), [groupIds, setGroupIds] = useState<string[]>([]), [partial, setPartial] = useState(false), [settings, setSettings] = useState(settingsDefault), [tab, setTab] = useState<'match' | 'discover' | 'compare'>('match'), [run, setRun] = useState<Run | null>(null), [runDataset, setRunDataset] = useState<Dataset | null>(null), [candidate, setCandidate] = useState<Pair | DiscoveredSet | null>(null), [filter, setFilter] = useState(''), [left, setLeft] = useState(''), [right, setRight] = useState(''), [comparison, setComparison] = useState<Comparison | null>(null), [includeVectors, setIncludeVectors] = useState(false), [busy, setBusy] = useState(false);
    const [resultGroup, setResultGroup] = useState(''), [visiblePairs, setVisiblePairs] = useState(40), [visibleSets, setVisibleSets] = useState(50);
    const refresh = async () => { const value = await api<State>('state'); setState(value); return value; };
    const safely = async (work: () => Promise<unknown>) => { setError(''); setBusy(true); try {
        await work();
    }
    catch (e) {
        setError(e instanceof Error ? explain(e.message) : 'دریافت اطلاعات انجام نشد.');
    }
    finally {
        setBusy(false);
    } };
    useEffect(() => { void refresh().catch(e => setError(explain(e.message))); }, []);
    useEffect(() => { if (state?.operation?.state !== 'running')
        return; const timer = setInterval(() => { void refresh().catch(e => setError(explain(e.message))); }, 800); return () => clearInterval(timer); }, [state?.operation?.state]);
    useEffect(() => { let current = true; setDataset(null); setCoverage([]); setCourseIds([]); setGroupIds([]); if (datasetId)
        void api<Dataset>('dataset/' + datasetId).then(d => { if (current) {
            setDataset(d);
            setCourseIds(d.courses.map(c => c.id));
            setGroupIds(d.groups.map(g => g.id));
        } }).catch(e => setError(explain(e.message))); return () => { current = false; }; }, [datasetId]);
    useEffect(() => { let current = true; setCoverage([]); if (datasetId && cfgId)
        void api<Coverage[]>(`coverage?dataset=${datasetId}&configuration=${cfgId}`).then(x => { if (current)
            setCoverage(x); }).catch(e => setError(explain(e.message))); return () => { current = false; }; }, [datasetId, cfgId, state?.operation?.state]);
    const inspectorClose = useRef<HTMLButtonElement>(null);
    useEffect(() => { if (!candidate)
        return; const prior = document.activeElement as HTMLElement | null; inspectorClose.current?.focus(); return () => prior?.focus(); }, [candidate]);
    const running = state?.operation?.state === 'running';
    const prerequisites = !!dataset && !!cfgId && courseIds.length > 0;
    const start = (operation: 'embed' | 'match' | 'discover') => safely(async () => { await api('start', { operation, selection: { datasetId, configurationId: cfgId, courseIds, groupIds, allowPartial: partial, settings } }); await refresh(); setMessage('عملیات شروع شد؛ نتیجهٔ ذخیره‌شده را پس از پایان باز کنید.'); });
    const openRun = (runId: string) => safely(async () => { const r = await api<Run>('run/' + runId); setRun(r); setRunDataset(await api<Dataset>('dataset/' + r.datasetId)); setCandidate(null); setResultGroup(''); setVisiblePairs(40); setVisibleSets(50); setTab(r.operation); });
    const choose = <T,>(current: T[], value: T) => current.includes(value) ? current.filter(x => x !== value) : [...current, value];
    const label = (title: string, children: ReactNode) => <label className="field"><span>{title}</span>{children}</label>;
    const numeric = (title: string, key: keyof Settings, min: number, max: number, step = 1) => label(title, <input dir="ltr" type="number" min={min} max={max} step={step} value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value === '' && key === 'jaccard' ? null : Number(e.target.value) })}/>);
    const currentEvents = state?.feedback.filter(f => run && f.runId === run.id) ?? [];
    const latest = (target: string, runId = run?.id) => state?.feedback.filter(f => f.runId === runId && f.targetId === target).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
    const labelName = (v: string) => ({ suitable: 'مناسب', unsuitable: 'نامناسب', uncertain: 'نامطمئن' }[v] ?? v);
    const targets = run ? [...run.pairs.map(p => p.id), ...run.sets.map(s => s.id)] : [];
    const counts = { suitable: 0, unsuitable: 0, uncertain: 0, unreviewed: 0 };
    for (const target of targets) {
        const event = latest(target);
        if (event)
            counts[event.label]++;
        else
            counts.unreviewed++;
    }
    const denominator = counts.suitable + counts.unsuitable;
    const exportRun = () => safely(async () => { if (!run)
        return; const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runIds: [run.id], includeVectors }) }); if (!response.ok)
        throw Error('خروجی ساخته نشد؛ اندازه و هویت آزمایش را بررسی کنید.'); const blob = await response.blob(), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `dorob-evidence-${run.id.slice(0, 12)}.json`; a.click(); URL.revokeObjectURL(url); setMessage('بستهٔ شواهد برای ذخیره آماده شد.'); });
    const matchPairs = run?.operation === 'match' ? run.pairs.filter(p => (!resultGroup || p.groupId === resultGroup) && (!filter || runDataset?.groups.find(g => g.id === p.groupId)?.title.includes(filter) || runDataset?.courses.find(c => c.id === p.courseId)?.title.includes(filter))) : [];
    const sets = run?.operation === 'discover' ? run.sets : [];
    return <><header><div className="brand">دورُب <span>آزمایشگاه</span></div><p>شباهت را آزمایش کنید، شواهد را بررسی کنید.</p><span className="experimental">آزمایشی · فقط محلی</span></header><main>
 <section className="intro"><h1>از دوره‌ها به موضوع‌های مشترک</h1><p>نتایج، پیشنهاد آزمایشی هستند. امتیاز کسینوسی به معنی تأیید تناسب یا عضویت در فهرست دوره‌ها نیست.</p></section>
 {error && <div className="notice error" role="alert"><strong>عملیات انجام نشد</strong><p dir="auto">{error}</p><button onClick={() => void safely(refresh)}>تلاش دوباره</button></div>}{message && <p role="status" className="notice">{message}</p>}
 {!state ? <p role="status">در حال خواندن آزمایش‌های ذخیره‌شده…</p> : <div className="workspace"><aside aria-label="انتخاب و اجرای آزمایش"><section className="panel"><h2>داده و مدل</h2>
 {label('مجموعه‌داده', <select value={datasetId} onChange={e => setDatasetId(e.target.value)}><option value="">انتخاب کنید</option>{state.datasets.map(d => <option key={d.id} value={d.id}>{date(d.startedAt)} — {n(d.coverage.selectedCourses)} دوره</option>)}</select>)}
 {label('پیکربندی بردار', <select dir="ltr" value={cfgId} onChange={e => setCfgId(e.target.value)}><option value="">انتخاب کنید</option>{state.configurations.map(c => <option key={c.id} value={c.id}>{c.model} / {c.id.slice(0, 8)}</option>)}</select>)}
 {!state.datasets.length && <p className="empty">هنوز داده‌ای وارد نشده است. راهنمای آزمایشگاه را برای دریافت فقط‌خواندنی داده‌ها دنبال کنید.</p>}{!state.configurations.length && <p className="empty">مدل نصب‌شده را با فرمان ثبت مدل در راهنما انتخاب کنید.</p>}
 {dataset && <><p>{n(dataset.coverage.selectedCourses)} از {n(dataset.coverage.courseTotal)} دوره؛ {n(dataset.coverage.selectedGroups)} از {n(dataset.coverage.groupTotal)} گروه</p><p>بازهٔ دریافت: {date(dataset.startedAt)} تا {date(dataset.endedAt)}</p><p>منبع: {id(dataset.origin)}</p><p>وضعیت دریافت: {dataset.consistent ? 'سازگار' : 'ناسازگار'}؛ {n(dataset.failures.length)} خطا</p><details><summary>خطاها و استثناهای دریافت</summary><ul>{[...dataset.failures, ...dataset.exclusions].map((x, i) => <li key={i}>{id(x)}</li>)}</ul></details>
 <details><summary>دامنهٔ دوره‌ها ({n(courseIds.length)})</summary><div className="actions"><button onClick={() => setCourseIds(dataset.courses.map(c => c.id))}>همه</button><button onClick={() => setCourseIds([])}>هیچ‌کدام</button></div><div className="scope">{dataset.courses.map(c => <label key={c.id} className="check"><input type="checkbox" checked={courseIds.includes(c.id)} onChange={() => setCourseIds(choose(courseIds, c.id))}/><bdi>{c.title}</bdi></label>)}</div></details>
 <details><summary>دامنهٔ گروه‌ها ({n(groupIds.length)})</summary><div className="scope">{dataset.groups.map(g => <label key={g.id} className="check"><input type="checkbox" checked={groupIds.includes(g.id)} onChange={() => setGroupIds(choose(groupIds, g.id))}/><bdi>{g.title}</bdi></label>)}</div></details></>}
 {coverage.length > 0 && <p className="coverage">بردار آماده: {n(coverage.filter(c => c.cached && c.eligible && (c.entity === 'course' ? courseIds : groupIds).includes(c.entityId)).length)}؛ کم‌اطلاعات: {n(coverage.filter(c => !c.eligible && courseIds.includes(c.entityId)).length)}</p>}
 <label className="check"><input type="checkbox" checked={partial} onChange={e => setPartial(e.target.checked)}/>اجرای صریح با پوشش ناقص</label>
 <button className="primary wide" disabled={!prerequisites || running || busy} onClick={() => void start('embed')}>ساخت بردارهای انتخاب‌شده</button><p className="muted">فقط این دکمه استنتاج محلی را شروع می‌کند. بردارهای سازگار دوباره استفاده می‌شوند.</p>
 </section><section className="panel"><h2>تنظیمات آزمایشی</h2><p className="muted">این آستانه‌ها کالیبره نشده‌اند.</p><div className="settings">{numeric('کمینهٔ شباهت', 'minimum', -1, 1, .01)}{numeric('حد نتیجهٔ هر گروه', 'limit', 1, 10000)}{numeric('همسایه‌های هر دوره', 'k', 1, 200)}{numeric('انسجام جفتی', 'coherence', -1, 1, .01)}{numeric('کمینهٔ اندازهٔ مجموعه', 'minSize', 2, 201)}{numeric('سرکوب جاکارد (خالی: خاموش)', 'jaccard', 0, 1, .01)}{numeric('گروه‌های بازیابی‌شده', 'groupLimit', 1, 100)}{numeric('سقف مجموعه‌ها', 'candidateCap', 1, 10000)}</div>
 <div className="actions"><button disabled={!prerequisites || running || busy} onClick={() => void start('match')}>اجرای تطبیق</button><button disabled={!prerequisites || running || busy} onClick={() => void start('discover')}>اجرای کشف</button></div>
 {state.operation && <div role="status" className="operation"><p>{({ running: 'در حال اجرا', complete: 'پایان‌یافته', failed: 'ناموفق', cancelled: 'لغوشده' })[state.operation.state]} — {n(state.operation.done)} از {n(state.operation.total)}</p>{state.operation.error && <p dir="auto">{explain(state.operation.error)}</p>}{running && <button onClick={() => void safely(async () => { await api('cancel', {}); await refresh(); })}>لغو عملیات</button>}{state.operation.state === 'complete' && state.operation.resultId && state.operation.operation !== 'embed' && <button onClick={() => void openRun(state.operation!.resultId!)}>باز کردن نتیجه</button>}</div>}
 </section></aside><div className="results"><section className="saved"><h2>آزمایش‌های ذخیره‌شده</h2><p className="muted">باز کردن نتیجه هیچ محاسبه یا استنتاجی را شروع نمی‌کند.</p><div className="saved-list">{state.runs.map(r => <button disabled={busy} className={run?.id === r.id ? 'selected' : ''} key={r.id} onClick={() => void openRun(r.id)}>{r.operation === 'match' ? 'تطبیق گروه‌ها' : 'کشف مجموعه‌ها'} — {date(r.createdAt)}{r.partial ? ' · پوشش ناقص' : ''}<small>{id(r.id.slice(0, 12))} / {n(r.operation === 'match' ? r.pairs : r.sets)} نتیجه</small></button>)}{!state.runs.length && <p className="empty">داده و مدل را انتخاب کنید، بردار بسازید و یک آزمایش اجرا کنید.</p>}</div></section>
 <nav aria-label="نمای نتایج" className="tabs">{(['match', 'discover', 'compare'] as const).map(t => <button aria-pressed={tab === t} key={t} onClick={() => { setTab(t); setCandidate(null); }}>{({ match: 'تطبیق با گروه‌ها', discover: 'کشف و هم‌پوشانی', compare: 'مقایسهٔ آزمایش‌ها' })[t]}</button>)}</nav>
 {run && <section className="manifest"><strong>{run.partial ? 'نتیجه با پوشش ناقص' : 'آزمایش پایان‌یافته'}</strong><p>زمان اجرا: {n(run.elapsedMs / 1000)} ثانیه؛ {n(run.comparisons)} مقایسه</p><details><summary>هویت و پوشش آزمایش</summary><p>آزمایش: {id(run.id)}</p><p>داده: {id(run.datasetId)}</p><p>پیکربندی: {id(run.configurationId)}</p><p>مدل: {id(state.configurations.find(c => c.id === run.configurationId)?.model ?? 'نامشخص')}</p><p>الگوریتم: {id(run.algorithm)}</p><p>دامنه: {n(run.courseIds.length)} دوره و {n(run.groupIds.length)} گروه</p><p>سقف همسایگی {n(run.settings.k)} و بازیابی گروه {n(run.settings.groupLimit)}؛ این حدود می‌توانند نتیجه را محدود کنند.</p><pre dir="ltr">{JSON.stringify(run.settings, null, 2)}</pre><p>حذف‌شده‌ها: {run.excluded.map((x, i) => <span key={i}>{id(x)} </span>)}</p></details></section>}
 {tab === 'match' && <section><h2>دوره‌های نزدیک به تعریف گروه</h2>{run?.operation === 'match' && label('گروه نتیجه', <select value={resultGroup} onChange={e => { setResultGroup(e.target.value); setVisiblePairs(40); }}><option value="">همهٔ گروه‌های این آزمایش</option>{run.groupIds.map(id => <option key={id} value={id}>{runDataset?.groups.find(g => g.id === id)?.title}</option>)}</select>)}{label('جست‌وجو در عنوان دوره یا گروه', <input value={filter} onChange={e => { setFilter(e.target.value); setVisiblePairs(40); }}/>)}{run?.operation !== 'match' ? <p className="empty">یک آزمایش تطبیق ذخیره‌شده را باز کنید.</p> : !matchPairs.length ? <p className="empty">در دامنه و آستانهٔ این آزمایش نتیجه‌ای وجود ندارد.</p> : <div className="candidate-list">{matchPairs.slice(0, visiblePairs).map(p => <button key={p.id} className="candidate" onClick={() => setCandidate(p)}><span><strong><bdi>{runDataset?.courses.find(c => c.id === p.courseId)?.title}</bdi></strong><small>{runDataset?.groups.find(g => g.id === p.groupId)?.title} / <bdi>{runDataset?.courses.find(c => c.id === p.courseId)?.providerId}</bdi></small>{p.importedMember && <span className="tag">عضویت واردشده</span>}{latest(p.id) && <span className="tag">بررسی محلی: {labelName(latest(p.id)!.label)}</span>}</span><span className="score">{n(p.score)}<small>کسینوس خام</small></span></button>)}{matchPairs.length > visiblePairs && <button onClick={() => setVisiblePairs(visiblePairs + 40)}>نمایش نتیجه‌های بیشتر ({n(matchPairs.length - visiblePairs)})</button>}</div>}</section>}
 {tab === 'discover' && <section><h2>مجموعه‌های هم‌پوشان</h2><p className="muted">یک دوره می‌تواند در چند مجموعه باشد. این‌ها گروه فهرست دوره‌ها نیستند.</p>{run?.operation !== 'discover' ? <p className="empty">یک آزمایش کشف را باز کنید.</p> : !sets.length ? <p className="empty">هیچ مجموعهٔ منسجمی در این تنظیمات پیدا نشد.</p> : sets.slice(0, visibleSets).map(s => <article className="set" tabIndex={-1} id={'set-' + s.id} key={s.id}><div className="set-heading"><button onClick={() => setCandidate(s)}><strong>{latest(s.id)?.title || `مجموعهٔ ${n(s.members.length)} دوره‌ای`}</strong><small><bdi>{runDataset?.courses.find(c => c.id === s.medoid)?.title}</bdi></small></button><span className="tag">{({ novel: 'احتمالاً تازه', partial: 'پوشش بخشی', covered: 'احتمالاً پوشیده', ambiguous: 'تطبیق مبهم' })[s.status]}</span></div>{latest(s.id) && <p>بررسی محلی: {labelName(latest(s.id)!.label)}</p>}<p>میانگین {n(s.mean)} / کمینه {n(s.minimum)} {s.suppressedBy && <> · سرکوب‌شده به علت هم‌پوشانی با <a href={'#set-' + s.suppressedBy}>{id(s.suppressedBy.slice(0, 8))}</a></>}</p><ul>{s.members.map(courseId => <li key={courseId}><bdi>{runDataset?.courses.find(c => c.id === courseId)?.title}</bdi>{sets.filter(t => t.id !== s.id && t.members.includes(courseId)).map(t => <a className="overlap" key={t.id} href={'#set-' + t.id} onClick={e => { e.preventDefault(); setVisibleSets(Math.max(visibleSets, sets.findIndex(s => s.id === t.id) + 1)); requestAnimationFrame(() => document.getElementById('set-' + t.id)?.focus()); }}>مشترک با {id(t.id.slice(0, 6))}</a>)}</li>)}</ul></article>)}{sets.length > visibleSets && <button onClick={() => setVisibleSets(visibleSets + 50)}>نمایش مجموعه‌های بیشتر ({n(sets.length - visibleSets)})</button>}</section>}
 {tab === 'compare' && <section><h2>چه چیزی عوض شده است؟</h2><div className="compare-controls">{label('آزمایش نخست', <select dir="ltr" value={left} disabled={busy} onChange={e => {setLeft(e.target.value);setComparison(null);}}><option value="">انتخاب کنید</option>{state.runs.map(r => <option key={r.id} value={r.id}>{r.operation==='match'?'تطبیق':'کشف'} / {r.id.slice(0, 12)}</option>)}</select>)}{label('آزمایش دوم', <select dir="ltr" value={right} disabled={busy} onChange={e => {setRight(e.target.value);setComparison(null);}}><option value="">انتخاب کنید</option>{state.runs.map(r => <option key={r.id} value={r.id}>{r.operation==='match'?'تطبیق':'کشف'} / {r.id.slice(0, 12)}</option>)}</select>)}</div><button disabled={!left || !right || busy} onClick={() => void safely(async () => setComparison(await api<Comparison>(`compare?left=${left}&right=${right}`)))}>مقایسه</button>{comparison && <><ComparisonView value={comparison}/><div className="compare-controls"><RunManifest runId={left}/><RunManifest runId={right}/></div></>}</section>}
 {run && <section className="review-summary"><h2>بررسی نمونهٔ انتخاب‌شده</h2><p>مناسب {n(counts.suitable)}؛ نامناسب {n(counts.unsuitable)}؛ نامطمئن {n(counts.uncertain)}؛ بررسی‌نشده {n(counts.unreviewed)}</p><p>{denominator ? `سهم مناسب در ${n(denominator)} بررسی قطعی: ${n(counts.suitable / denominator * 100)} درصد` : 'هنوز بررسی قطعی وجود ندارد.'}</p><p className="muted">انتخاب نمونه سوگیری دارد؛ نامطمئن و بررسی‌نشده در مخرج نیستند. دقت کل فهرست یا بازیابی اندازه‌گیری نشده است.</p><label className="check"><input type="checkbox" checked={includeVectors} onChange={e => setIncludeVectors(e.target.checked)}/>بردارها هم در خروجی باشند</label><button onClick={() => void exportRun()} disabled={busy}>خروجی شواهد این آزمایش</button></section>}
 <section className="import"><h2>باز کردن بستهٔ شواهد</h2>{label('فایل شواهد محلی', <input type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; if (file)
            void safely(async () => { if (file.size > 32 * 1024 * 1024)
                throw Error('فایل بزرگ‌تر از حد مجاز است؛ از فرمان ورود بسته در راهنما استفاده کنید.'); await api('reimport', JSON.parse(await file.text())); await refresh(); setMessage('بسته بررسی و وارد شد.'); }); }}/>)}<p className="muted">ورود بسته فقط شواهد محلی را اضافه می‌کند.</p></section>
 </div></div>}
 {candidate && run && runDataset && <div className="inspector" role="region" aria-label="بررسی شواهد"><div className="inspector-heading"><h2>شواهد و بررسی محلی</h2><button ref={inspectorClose} onClick={() => setCandidate(null)}>بستن بررسی</button></div><Inspector key={run.id + candidate.id} candidate={candidate} run={run} dataset={runDataset} events={currentEvents} onSave={async (value) => { await api('feedback', { runId: run.id, targetId: candidate.id, ...value }); await refresh(); setMessage('بررسی محلی ذخیره شد.'); }}/></div>}
 </main><footer>آزمایشگاه مستقل دورُب · دادهٔ منبع، شباهت آزمایشی و نظر بررسی‌کننده جدا نگه داشته می‌شوند.</footer></>;
}
function RunManifest({ runId }: {
    runId: string;
}) { const [run, setRun] = useState<Run | null>(null), [error,setError]=useState(''); useEffect(() => { void api<Run>('run/' + runId).then(setRun).catch(e=>setError(explain(e.message))); }, [runId]); if(error)return <p role="alert">{error}</p>;
    return run ? <details><summary>هویت و تنظیمات {id(runId.slice(0, 8))}</summary><p>داده {id(run.datasetId)}</p><p>مدل/ورودی {id(run.configurationId)}</p><p>الگوریتم {id(run.algorithm)}</p><p>{run.partial ? 'پوشش ناقص' : 'پایان‌یافته'}؛ {n(run.courseIds.length)} دوره</p><pre dir="ltr">{JSON.stringify(run.settings, null, 2)}</pre></details> : <p>در حال خواندن…</p>; }
function ComparisonView({ value: v }: {
    value: Comparison;
}) { return <div className="comparison">{v.warnings.map(w => <p className="notice" key={w}>{w}</p>)}<p>جفت‌های افزوده {n(v.addedPairs.length)} / حذف‌شده {n(v.removedPairs.length)}؛ تقسیم {n(v.splits.length)} / ادغام {n(v.merges.length)}</p><details><summary>جفت‌ها و دوره‌های تغییرکرده</summary><pre dir="ltr">{JSON.stringify({ addedPairs: v.addedPairs, removedPairs: v.removedPairs, addedCourses: v.addedCourses, removedCourses: v.removedCourses }, null, 2)}</pre></details>{v.associations.map(a => <details key={a.from + a.to}><summary>{id(a.from.slice(0, 8))} ↔ {id(a.to.slice(0, 8))}؛ جاکارد {n(a.jaccard)}</summary><p>افزوده: {a.added.map(x => id(x))}</p><p>حذف‌شده: {a.removed.map(x => id(x))}</p></details>)}</div>; }
function Inspector({ candidate: c, run, dataset, events, onSave }: {
    candidate: Pair | DiscoveredSet;
    run: Run;
    dataset: Dataset;
    events: Feedback[];
    onSave: (v: {
        eventId: string;
        label: Feedback['label'];
        note: string;
        title: string;
    }) => Promise<void>;
}) {
    const history = events.filter(f => f.targetId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const [review, setReview] = useState<Feedback['label']>(history[0]?.label ?? 'uncertain'), [note, setNote] = useState(history[0]?.note ?? ''), [title, setTitle] = useState(history[0]?.title ?? ''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [eventId, setEventId] = useState(crypto.randomUUID());
    const memberIds = 'courseId' in c ? [c.courseId] : c.members;
    const group = 'groupId' in c ? dataset.groups.find(g => g.id === c.groupId) : null;
    const [related, setRelated] = useState<(Feedback & {
        overlap: number;
    })[]>([]);
    useEffect(() => { void api<(Feedback & {
        overlap: number;
    })[]>(`related?run=${run.id}&target=${c.id}`).then(setRelated).catch(e => setError(explain(e.message))); }, [run.id, c.id]);
    return <>{group && <section><h3>{group.title}</h3><p>{group.description}</p><p>{group.categoryLabel} / <bdi>{({beginner:'مقدماتی',intermediate:'متوسط',advanced:'پیشرفته',mixed:'ترکیبی'})[group.targetLevel??'']??'سطح نامشخص'}</bdi></p><p>عضویت‌های واردشده: {n(group.members.length)}</p></section>}{'reconciliation' in c && <section><h3>تطبیق موقت با گروه‌های موجود</h3><p>بازیابی حداکثر {n(run.settings.groupLimit)} گروه؛ نزدیکی مرکز به معنی تناسب همهٔ اعضا نیست.</p>{c.reconciliation.map(r => <details key={r.groupId}><summary>{dataset.groups.find(g => g.id === r.groupId)?.title}؛ پوشش {n(r.fraction * 100)} درصد</summary><p>کسینوس مرکز: {n(r.centroidScore)}</p>{r.members.map(m => <p key={m.courseId}><bdi>{dataset.courses.find(c => c.id === m.courseId)?.title}</bdi>؛ {n(m.score)}؛ {m.passes ? 'بالاتر از آستانه' : 'پایین‌تر از آستانه'}</p>)}</details>)}</section>}
 {memberIds.map(courseId => { const course = dataset.courses.find(c => c.id === courseId)!; const input = run.inputs.find(i => i.entity === 'course' && i.entityId === courseId); return <section key={courseId}><h3><bdi>{course.title}</bdi></h3><p>ارائه‌دهنده: <bdi>{course.providerId}</bdi></p><p>شرح: {course.description ?? 'اطلاعات موجود نیست'}</p><p>سطح منبع: <bdi>{course.level ?? 'نامشخص'}</bdi></p><p>منبع: <a href={course.sourceUrl} target="_blank" rel="noreferrer"><bdi>{new URL(course.sourceUrl).host}</bdi></a></p><p>مشاهده: {course.collectedAt ? date(course.collectedAt) : 'نامشخص'} / {course.snapshotId ? id(course.snapshotId) : 'بدون مشاهده'}</p><details><summary>دادهٔ آموزشی و ورودی دقیق بردار</summary><p>سرفصل‌ها: {course.syllabus.join(' / ') || 'موجود نیست'}</p><p>پیش‌نیاز: {course.prerequisites.join(' / ') || 'نامشخص'}</p><p>مخاطب: {course.audience.join(' / ') || 'نامشخص'}</p><p>خروجی آموزشی: {course.outcomes.join(' / ') || 'نامشخص'}</p>{input && <><p>هویت ورودی: {id(input.hash)}</p><p>کمبودها: {input.missing.map(x => id(x))}؛ حذف‌شده‌ها: {input.omitted.map(x => id(x))}</p><pre dir="auto">{input.text}</pre></>}</details></section>; })}
 {group && <details><summary>ورودی دقیق تعریف گروه</summary><pre dir="auto">{run.inputs.find(i => i.entity === 'group' && i.entityId === group.id)?.text ?? 'ورودی موجود نیست'}</pre></details>}
 <form onSubmit={e => { e.preventDefault(); setSaving(true); setError(''); void onSave({ eventId, label: review, note, title }).then(() => setEventId(crypto.randomUUID())).catch(e => setError(explain(e.message))).finally(() => setSaving(false)); }}><h3>نظر شما دربارهٔ همین نتیجه</h3><p className="muted">این نظر فقط در آزمایشگاه ثبت می‌شود.</p><label className="field">ارزیابی<select value={review} onChange={e => { setReview(e.target.value as Feedback['label']); setEventId(crypto.randomUUID()); }}><option value="suitable">مناسب</option><option value="unsuitable">نامناسب</option><option value="uncertain">نامطمئن</option></select></label><label className="field">یادداشت<textarea maxLength={4000} value={note} onChange={e => { setNote(e.target.value); setEventId(crypto.randomUUID()); }}/></label>{'members' in c && <label className="field">عنوان دستی اختیاری<input maxLength={300} value={title} onChange={e => { setTitle(e.target.value); setEventId(crypto.randomUUID()); }}/></label>}<button className="primary" disabled={saving} data-event={eventId}>ذخیرهٔ بررسی محلی</button>{error && <p role="alert">{error}</p>}</form>
 <details><summary>رویدادهای قبلی همین نتیجه ({n(history.length)})</summary>{history.map(f => <p key={f.id}>{date(f.createdAt)} — {({ suitable: 'مناسب', unsuitable: 'نامناسب', uncertain: 'نامطمئن' })[f.label]}؛ {f.note}</p>)}</details><details><summary>بررسی‌های مرتبط آزمایش‌های دیگر؛ صرفاً زمینه ({n(related.length)})</summary>{related.map(f => <p key={f.id}>{id(f.runId.slice(0, 12))} / {({ suitable: 'مناسب', unsuitable: 'نامناسب', uncertain: 'نامطمئن' })[f.label]} / {f.note}؛ هم‌پوشانی {n(f.overlap)}</p>)}</details>
 </>;
}
createRoot(document.getElementById('root')!).render(<App />);
