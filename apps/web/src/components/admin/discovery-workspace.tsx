'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {isUuid,isEmbeddingRunDetail,isEmbeddingDiscovery,isDiscoverySort} from '@dorob/core';
import {useAdminRead} from './admin-data';
import {AdminFeedback,AdminPagination} from './admin-components';
import {DiscoveryCollectionPreview,DiscoverySortControl} from './discovery-components';
import {discoveryPages,runPages,discoveryAddress,discoveryOffset,useDiscoveryMembers} from './discovery-data';
import {sourceDate} from '../public-course-card';
import {DiscoveryDetail} from './discovery-detail';
export function DiscoveryWorkspace(){
 const search=useSearchParams(),router=useRouter(),params=new URLSearchParams(search.toString());
 const [revision,setRevision]=useState(0);const reload=()=>setRevision(n=>n+1);
 const runId=isUuid(params.get('run'))?params.get('run')!:null,selected=isUuid(params.get('candidate'))?params.get('candidate')!:null;
 const sortValue=params.get('sort'),sort=isDiscoverySort(sortValue)?sortValue:'id';
 const runOffset=discoveryOffset(params.get('runs')),offset=discoveryOffset(params.get('page')),suppressed=params.get('suppressed')==='true';
 const runs=useAdminRead('embeddings/runs?limit=20&offset='+runOffset,runPages,revision);
 const run=useAdminRead('embeddings/runs/'+(runId??'none'),isEmbeddingRunDetail,revision,!!runId);
 // Initial selection examines only this page of runs, never scans the full history.
 useEffect(()=>{if(!runId&&runs?.data){const first=runs.data.items.find(r=>r.complete)??runs.data.items[0];if(first)router.replace(discoveryAddress(new URLSearchParams(search.toString()),{run:first.id,page:null,candidate:null}));}},[runId,runs?.data,router,search]);
 const candidates=useAdminRead('embeddings/runs/'+(runId??'none')+'/discoveries?limit=20&offset='+offset+'&suppressed='+suppressed+'&sort='+sort,discoveryPages,revision,!!runId&&!!run?.data?.complete);
 const candidate=useAdminRead('embeddings/discoveries/'+(selected??'none'),isEmbeddingDiscovery,revision,!!selected&&!!run?.data?.complete);
 const selectedCandidate=selected&&candidate?.data?.runId===runId?candidate.data:undefined;
 const memberIds=[...(candidates?.data?.items.flatMap(c=>c.members)??[]),...(selectedCandidate?.members??[])];
 const members=useDiscoveryMembers(`${runId}:${offset}:${suppressed}:${sort}`,memberIds);
 const queueRef=useRef<HTMLElement>(null),lastSelection=useRef<string|null>(null);
 useEffect(()=>{if(!selected&&lastSelection.current){const link=queueRef.current?.querySelector<HTMLAnchorElement>(`a[data-candidate="${lastSelection.current}"]`);link?.focus();}lastSelection.current=selected;},[selected]);
 const navigate=(values:Record<string,string|null>)=>router.push(discoveryAddress(params,values),{scroll:false});
 return <div className="discovery-workspace"><div><h1>پیشنهادهای گروه‌بندی</h1><p>دوره‌ها را کنار هم ببینید و مجموعه‌های مناسب را برای ساخت گروه تأیید کنید.</p></div>
  {runs?.error&&<AdminFeedback error retry={reload}>{runs.error}</AdminFeedback>}
  {!runs?.data&&!runs?.error&&<AdminFeedback>در حال دریافت اجراهای ذخیره‌شده…</AdminFeedback>}
  {runs?.data&&<><div className="discovery-toolbar"><label className="admin-field">اجرای ذخیره‌شده<select value={runId??''} onChange={e=>navigate({run:e.target.value,page:null,candidate:null,suppressed:null})}><option value="" disabled>انتخاب اجرا</option>{runId&&!runs.data.items.some(r=>r.id===runId)&&<option value={runId}>{runId}</option>}{runs.data.items.map(r=><option key={r.id} value={r.id}>{sourceDate(r.createdAt)} — {r.complete?'کامل‌شده':'تکمیل نشده'}{r.partial?'؛ شواهد ناقص':''} — {r.candidateCount.toLocaleString('fa-IR')} مجموعه</option>)}</select></label><label className="admin-field">نوع مجموعه<select value={String(suppressed)} onChange={e=>navigate({suppressed:e.target.value,page:null,candidate:null})}><option value="false">نگه‌داشته‌شده</option><option value="true">کنارگذاشته‌شده</option></select></label><DiscoverySortControl value={sort} onChange={value=>navigate({sort:value,page:null,candidate:null})}/></div>{runs.data.total>20&&<AdminPagination total={runs.data.total} offset={runOffset} onChange={n=>navigate({runs:String(n)})}/>}{!runs.data.total&&<AdminFeedback>اجرای ذخیره‌شده‌ای وجود ندارد. کشف را جداگانه با ابزار خط فرمان محلی اجرا کنید؛ این صفحه پردازشی آغاز نمی‌کند.</AdminFeedback>}</>}
  {runId&&run?.error&&<AdminFeedback error retry={reload}>{run.error}</AdminFeedback>}
  {run?.data&&!run.data.complete&&<AdminFeedback>این اجرا تکمیل نشده است؛ نتایج آن هنوز قابل بررسی نیست. تکمیل یا تلاش دوباره از ابزار خط فرمان انجام می‌شود.</AdminFeedback>}
  {run?.data?.complete&&<><p className="discovery-run-note">{run.data.partial?'شواهد این اجرا ناقص است؛ محدودیت‌ها را پیش از تأیید بخوانید.':'نتایج ذخیره‌شده؛ پردازش تازه‌ای اجرا نمی‌شود.'}</p><div className="discovery-desk" data-selected={!!selected}>
   <aside className="discovery-queue" ref={queueRef} aria-label="صف مجموعه‌ها"><h2>مجموعه‌های {suppressed?'کنارگذاشته‌شده':'نگه‌داشته‌شده'}</h2>{candidates?.error&&<AdminFeedback error retry={reload}>{candidates.error}</AdminFeedback>}{!candidates?.data&&!candidates?.error&&<AdminFeedback>در حال دریافت مجموعه‌ها…</AdminFeedback>}{candidates?.data?.items.map(c=><Link key={c.id} data-candidate={c.id} className="discovery-queue-link" href={discoveryAddress(params,{candidate:c.id})} scroll={false} aria-current={c.id===selected?'true':undefined}><DiscoveryCollectionPreview compact representativeId={c.representative} selected={c.id===selected} title={c.review.title} status={c.review.status} members={c.members.map(id=>({id,title:members.items[id]?.data?.reference.title,provider:members.items[id]?.data?.reference.providerId,thumbnailSrc:members.items[id]?.data?.thumbnailAssetId?'/api/thumbnails/'+members.items[id].data!.thumbnailAssetId:undefined}))}/></Link>)}{candidates?.data&&!candidates.data.total&&<AdminFeedback>در این بخش مجموعه‌ای ذخیره نشده است. کشف را جداگانه اجرا کنید.</AdminFeedback>}{candidates?.data&&<AdminPagination total={candidates.data.total} offset={offset} onChange={n=>navigate({page:String(n),candidate:null})}/>}</aside>
   <div className="discovery-detail"><Link className="ds-button ds-secondary discovery-mobile-back" href={discoveryAddress(params,{candidate:null})} scroll={false}>بازگشت به مجموعه‌ها</Link>{selected?(selectedCandidate?<DiscoveryDetail key={selectedCandidate.id} candidate={selectedCandidate} run={run.data} members={members} address={params} refresh={reload}/>:candidate?.error?<AdminFeedback error retry={reload}>{candidate.error}</AdminFeedback>:candidate?.data?<AdminFeedback error>این مجموعه متعلق به اجرای انتخاب‌شده نیست.</AdminFeedback>:<AdminFeedback>در حال دریافت مجموعه…</AdminFeedback>):<AdminFeedback>برای بررسی، یک مجموعه را از صف انتخاب کنید.</AdminFeedback>}</div>
  </div></>}
 </div>;
}
