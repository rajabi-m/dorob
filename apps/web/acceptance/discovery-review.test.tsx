import {test,expect,mock} from 'bun:test';
import {Window} from 'happy-dom';
import {act} from 'react';
import {isolatedDatabase} from '../../api/tests/helpers';
import {migrate,readMigrations} from '../../api/src/migrations';
import {createApp} from '../../api/src/app';
import {createCatalogRepository} from '../../api/src/catalog';
import {createIngestionRepository} from '../../api/src/ingestion';
import {createEmbeddingRepository} from '../../api/src/embeddings';
import {createEmbeddingResults} from '../../api/src/embedding-results';
import {createSuggestionRepository} from '../../api/src/group-suggestions';
import {rich} from '../../api/src/ingestion-examples';
import {defaults,hash,float32Vector} from '../../../packages/embedding-engine/src/index';
import {embeddingProfile,isEmbeddingRunSummary,isEmbeddingRunDetail,isDiscoveryEvidence,isDiscoveryHistory,isAdminPage} from '@dorob/core';
mock.module('server-only',()=>({}));
const {createAdminClient,adminHandler}=await import('../src/lib/admin-api');
let query='';const router={push:()=>{},replace:()=>{}};
mock.module('next/navigation',()=>({useRouter:()=>router,useSearchParams:()=>new URLSearchParams(query)}));
const window=new Window({url:'http://localhost:3000/admin/discoveries'});
Object.assign(globalThis,{window,document:window.document,navigator:window.navigator,HTMLElement:window.HTMLElement,FormData:window.FormData});
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');const {DiscoveryWorkspace}=await import('../src/components/admin/discovery-workspace');
async function flush(){for(let i=0;i<12;i++)await act(async()=>{await new Promise(r=>setTimeout(r,5));});}

test.skipIf(process.env.API_INTEGRATION!=='1')('isolated saved results through browser decision, lost promotion, reload recovery, explicit delivery and handoff',async()=>{
 await isolatedDatabase(async sql=>{
  await migrate(sql,await readMigrations());const r=createEmbeddingRepository(sql),results=createEmbeddingResults(sql),catalog=createCatalogRepository(sql),suggestions=createSuggestionRepository(sql),ingest=createIngestionRepository(sql);
  const cfgBody={model:'bge-m3',digest:'c'.repeat(64),dimensions:1024 as const,profile:embeddingProfile};const cfg={...cfgBody,id:hash(cfgBody)};await r.configuration(cfg);
  const members:string[]=[];for(const key of ['one','two']){const p=rich();p.providerCourseId=key;members.push((await ingest.ingest(p)).snapshot.courseId);}members.sort();
  const op=await r.start({requestId:crypto.randomUUID(),configurationId:cfg.id,command:'discover',scope:{courses:members,groups:[]},force:false,allowPartial:false});await r.capture(op.id);const fence=await r.claim(op.id,crypto.randomUUID());const vector=float32Vector(Array.from({length:1024},(_,i)=>i===0?1:0));
  for(const row of (await r.inputs(op.id,{limit:100,offset:0})).items)await r.acceptVector(fence,{input:row.input,values:Array.from(vector.values),checksum:vector.checksum});
  const revisions=(await r.vectors(fence,{limit:100,offset:0})).items.map(i=>i.revisionId!);
  const run=await results.begin(fence,{settings:defaults,partial:false,expectedPairs:0,expectedSets:1,revisionIds:revisions});
  await results.upload(fence,crypto.randomUUID(),[],[{id:hash(members),members,seeds:[members[0]],medoid:members[0],mean:.8,minimum:.8,pairwise:[{a:members[0],b:members[1],score:.8}],suppressedBy:null,reconciliation:[],status:'novel'}]);await results.finalize(fence);await r.finish(fence,'complete',{});
  const candidate=(await results.candidates(run.runId,{limit:20,offset:0},false)).items[0];query='?run='+run.runId+'&candidate='+candidate.id;
  expect(isEmbeddingRunSummary((await r.runs({limit:20,offset:0})).items[0])).toBe(true);expect(isEmbeddingRunDetail(await r.run(run.runId))).toBe(true);expect(isDiscoveryEvidence(await results.candidateEvidence(candidate.id))).toBe(true);
  const app=createApp({sql,ready:async()=>true,close:async()=>{}});let lost=false;const calls:string[]=[];
  const client=createAdminClient({origin:'http://localhost',fetcher:async(url,init)=>app.handle(new Request(url,init))});
  const savedFetch=globalThis.fetch;
  globalThis.fetch=(async(url:RequestInfo|URL,init?:RequestInit)=>{
   const path=String(url);calls.push(path);const parts=new URL(path,'http://web.test').pathname.split('/').filter(Boolean);let operation:string,id:string|undefined,courseId:string|undefined;
   if(parts[2]==='courses'){operation='course';courseId=decodeURIComponent(parts[3]);}
   else {const collection=parts[3],action=parts[5];id=parts[4];operation=collection==='runs'?(action?'discovery-candidates':id?'discovery-run':'discovery-runs'):collection==='discoveries'?(action?'discovery-'+action:'discovery-candidate'):collection==='promotions'?'discovery-delivery':collection==='configurations'?'discovery-configuration':collection==='manifests'?'discovery-manifest':collection==='revisions'?'discovery-revision':'discovery-inputs';}
   const response=await adminHandler(new Request('http://web.test'+path,{...init,headers:{...init?.headers,origin:'http://web.test'}}),operation as Parameters<typeof adminHandler>[1],{id,courseId},client);
   if(path.endsWith('/promote')&&!lost){expect(response.status).toBe(200);lost=true;return new Response('',{status:503});}return response;
  }) as unknown as typeof fetch;
  let root:ReturnType<typeof createRoot>|undefined;const el=document.createElement('div');document.body.append(el);
  const mount=async()=>{root=createRoot(el);await act(async()=>root!.render(<DiscoveryWorkspace/>));await flush();};
  const click=async(text:string)=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text)!;expect(b).toBeDefined();await act(async()=>b.click());await flush();};
  try {
   await mount();expect(document.body.textContent).toContain('دوره‌های این مجموعه');await click('تأیید پیشنهاد');expect((await results.candidate(candidate.id)).review.status).toBe('approved');
   expect((await sql`SELECT count(*)::int n FROM course_groups`)[0].n).toBe(0);expect((await sql`SELECT count(*)::int n FROM course_group_courses`)[0].n).toBe(0);
   expect(isAdminPage(await results.history(candidate.id,{limit:20,offset:0}),isDiscoveryHistory)).toBe(true);
   for(const [name,value]of Object.entries({title:'گروه آزمایشی',slug:'review-integration',description:'دامنهٔ مشخص برای بازبینی آموزشی',categoryId:'code'}))(document.querySelector(`[name=${name}]`) as HTMLInputElement).value=value;
   await act(async()=>document.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));await flush();
   const saved=(await results.promotion(candidate.id)).promotion!;expect(saved).toMatchObject({planned:2,delivered:0,pending:2});expect((await catalog.groupDetail(saved.groupId,{limit:20,offset:0}))).toMatchObject({courseCount:0,isPublished:false});
   await act(async()=>root!.unmount());root=undefined;await mount();expect(document.querySelector(`a[href="/admin/groups/${saved.groupId}"]`)).not.toBeNull();expect(document.body.textContent).toContain('باقی‌مانده: ۲');
   await click('ارسال پیشنهادهای دوره');expect((await results.promotion(candidate.id)).promotion).toMatchObject({id:saved.id,groupId:saved.groupId,delivered:2,pending:0,complete:true});expect((await suggestions.list(saved.groupId,'pending',{limit:20,offset:0})).total).toBe(2);
   expect((await catalog.groupDetail(saved.groupId,{limit:20,offset:0}))).toMatchObject({courseCount:0,isPublished:false});expect((await sql`SELECT count(*)::int n FROM embedding_operations`)[0].n).toBe(1);expect(calls.filter(p=>p.endsWith('/promote'))).toHaveLength(1);expect(calls.some(p=>/generate|capture|claim|approve|publish/.test(p))).toBe(false);
  } finally {await act(async()=>root?.unmount());el.remove();globalThis.fetch=savedFetch;window.sessionStorage.clear();}
 });
},20000);
