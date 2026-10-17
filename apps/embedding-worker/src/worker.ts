import {isEmbeddingConfiguration,isEmbeddingInput,isEmbeddingFence,isEmbeddingOperation,isUuid,type EmbeddingConfiguration,type EmbeddingOperation,type EmbeddingInput,type EmbeddingFence,type EmbeddingStart} from '@dorob/core';
import {match,discover,reconcile,dot,defaults,hash,float32Vector,type Embedded,type DiscoveredSet} from '@dorob/embedding-engine';
import {backendClient,type BackendClient} from './http';
import {installedConfiguration,generateInput,modelClient,type ModelTransport} from './model';
import type {Options} from './options';
const root='/api/v1/manage/embeddings';
type Page<T>={items:T[];total:number;limit:number;offset:number};
type InputRow={input:EmbeddingInput;sourceSnapshotId:string|null;exclusion:string|null};
type Selection={entity:'course'|'group';entityId:string;inputHash:string;revisionId:string|null;checksum:string|null;values:number[]|null};
type Vector={entity:'course'|'group';entityId:string;inputHash:string;revisionId:string;values:Float32Array};
export type Progress={stage:string;processed:number;total:number;generated:number;reused:number;excluded:number;elapsedMs:number;partial:boolean};
function assert(ok:unknown,message='Invalid backend response'):asserts ok {if(!ok)throw Error(message);}
function validPage<T>(page:Page<T>,offset:number) {assert(Array.isArray(page.items)&&page.limit===16&&page.offset===offset&&Number.isInteger(page.total)&&page.total>=0&&page.total<=10100&&page.items.length===Math.min(16,Math.max(0,page.total-offset)));}
function batchId(run:string,kind:string,offset:number) {const h=hash([run,kind,offset]);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export async function runWorker(options:Options,dependencies:{api?:BackendClient;model?:ModelTransport;signal?:AbortSignal;progress?:(p:Progress,id:string)=>void;registered?:(id:string)=>void;promotionCreated?:(value:{promotionId:string;groupId:string})=>void}={}) {
 const api=dependencies.api??backendClient(options.backend),model=dependencies.model??modelClient(options.ollama),external=dependencies.signal;
 if(options.command==='status'){const value=await api<EmbeddingOperation>(`${root}/operations/${options.id}`);assert(isEmbeddingOperation(value));return value;}
 if(['cancel','accept-partial','promotion-retry'].includes(options.command)){const path=options.command==='cancel'?`operations/${options.id}/cancel`:options.command==='accept-partial'?`runs/${options.id}/accept-partial`:`promotions/${options.id}/delivery`;let value=await api<{pending?:number}>(`${root}/${path}`,{});while(value.pending&&options.command==='promotion-retry')value=await api(`${root}/${path}`,{});return value;}
 if(options.command==='inspect')return api(`${root}/discoveries/${options.id}`);
 if(options.command==='review')return api(`${root}/discoveries/${options.id}/review`,{requestId:options.requestId,expectedVersion:options.version,status:options.decision,title:options.title??null,note:options.note??null,acceptPartial:options.acceptPartial});
 if(options.command==='promote'){
  const created=await api<{promotionId:string;groupId:string}>(`${root}/discoveries/${options.id}/promote`,{requestId:options.requestId,expectedVersion:options.version,group:{title:options.title,slug:options.slug,description:options.description,categoryId:options.category,targetLevel:options.level??null}});assert(isUuid(created.promotionId)&&isUuid(created.groupId));dependencies.promotionCreated?.(created);let delivery;try{do{delivery=await api<{pending:number}>(`${root}/promotions/${created.promotionId}/delivery`,{});}while(delivery.pending);}catch{throw Error(`Draft created: ${created.groupId}; suggestion delivery incomplete. Retry: promotion-retry ${created.promotionId}`);}return {...created,...delivery};
 }
 const recovering=options.command==='retry'||options.command==='resume';let cfg:EmbeddingConfiguration,request:EmbeddingStart,operation:EmbeddingOperation;
 if(recovering){operation=await api(`${root}/operations/${options.id}/retry`,{});request=await api(`${root}/operations/${options.id}/request`);cfg=await api(`${root}/configurations/${request.configurationId}`);}
 else {
  cfg=options.configurationId?await api(`${root}/configurations/${options.configurationId}`):await installedConfiguration(model,options.model,external);assert(isEmbeddingConfiguration(cfg));
  await api(`${root}/configurations`,cfg,external);
  request={requestId:options.requestId,configurationId:cfg.id,command:options.command as EmbeddingStart['command'],scope:{courses:options.courses,groups:options.groups},force:options.force,allowPartial:options.allowPartial};operation=await api(`${root}/operations`,request,external);
 }
 assert(isEmbeddingConfiguration(cfg)&&isEmbeddingOperation(operation));const id=operation.id;dependencies.registered?.(id);
 let earlyCancellation:Promise<unknown>|undefined;
 const earlyCancel=()=>{earlyCancellation=api(`${root}/operations/${id}/cancel`,{},undefined,2500).catch(()=>null);};
 external?.addEventListener('abort',earlyCancel,{once:true});
 let fence:EmbeddingFence;
 try {
  await api(`${root}/operations/${id}/capture`,{},external,35000);
  fence=await api<EmbeddingFence>(`${root}/operations/${id}/claim`,{attemptId:crypto.randomUUID()},external);assert(isEmbeddingFence(fence));
 }catch(error){if(external?.aborted){await earlyCancellation;const cancelled=new Error(`Operation ${id}: cancellation requested; inspect persisted status`);cancelled.name='WorkerCancelled';throw cancelled;}throw error;}
 finally{external?.removeEventListener('abort',earlyCancel);}
 const controller=new AbortController(),signal=external?AbortSignal.any([external,controller.signal]):controller.signal;
 const started=performance.now(),progress:Progress={stage:'generation',processed:0,total:0,generated:0,reused:0,excluded:0,elapsedMs:0,partial:false};
 const report=()=>{progress.elapsedMs=Math.round(performance.now()-started);dependencies.progress?.({...progress},id);};
 let heartbeat:Promise<unknown>|undefined,heartbeatFailure:unknown;
 const interval=setInterval(()=>{if(heartbeat)return;report();heartbeat=api(`${root}/heartbeat`,{fence,progress},signal).catch(error=>{heartbeatFailure=error;controller.abort(error);}).finally(()=>{heartbeat=undefined;});},2000);
 let cancellation:Promise<unknown>|undefined;
 const cancel=()=>{controller.abort();cancellation=api(`${root}/operations/${id}/cancel`,{},undefined,2500).catch(()=>({state:'unavailable'}));};
 external?.addEventListener('abort',cancel,{once:true});
 try{
  const saved=await api<{runId:string;complete:boolean}|null>(`${root}/operations/${id}/run`,undefined,signal);
  let runId=saved?.complete?saved.runId:undefined;
  if(!runId){
   const vectors=new Map<string,Vector>();progress.stage='loading-vectors';report();
   for(let offset=0;;offset+=16){const page=await api<Page<Selection>>(`${root}/vectors/read`,{fence,limit:16,offset},signal);validPage(page,offset);progress.total=page.total;progress.processed=offset+page.items.length;report();for(const v of page.items){assert(v.entity==='course'||v.entity==='group');if(v.revisionId){assert(isUuid(v.revisionId)&&v.values?.length===1024&&v.values.every(Number.isFinite)&&Math.abs(Math.hypot(...v.values)-1)<1e-5);assert(float32Vector(v.values).checksum===v.checksum);vectors.set(v.entity+':'+v.entityId,{entity:v.entity,entityId:v.entityId,inputHash:v.inputHash,revisionId:v.revisionId,values:Float32Array.from(v.values)});}}if(offset+page.items.length>=page.total)break;}
   progress.stage='generation';progress.processed=0;
   for(let offset=0;;offset+=16){
    const page=await api<Page<InputRow>>(`${root}/operations/${id}/inputs?limit=16&offset=${offset}`,undefined,signal);validPage(page,offset);progress.total=page.total;
    for(const row of page.items){signal.throwIfAborted();assert(isEmbeddingInput(row.input));const key=row.input.entity+':'+row.input.entityId;
     if(row.exclusion)progress.excluded++;else if(vectors.has(key)){assert(vectors.get(key)!.inputHash===row.input.hash);progress.reused++;}else {
      const vector=await generateInput(row.input,cfg,model,signal);const accepted=await api<{id:string}>(`${root}/vectors`,{fence,input:row.input,values:Array.from(vector.values),checksum:vector.checksum},signal);assert(isUuid(accepted.id));vectors.set(key,{entity:row.input.entity,entityId:row.input.entityId,inputHash:row.input.hash,revisionId:accepted.id,values:vector.values});progress.generated++;
     }
     progress.processed++;report();
    }
    if(offset+page.items.length>=page.total)break;
   }
   if(request.command==='generate'){clearInterval(interval);await heartbeat;signal.throwIfAborted();await api(`${root}/finish`,{fence,state:'complete',progress:{...progress,stage:'complete'}},signal);return {operationId:id,state:'complete',...progress,stage:'complete'};}
   const reused=await api<{runId:string;complete:boolean}|null>(`${root}/results/reuse`,{fence},signal);if(reused)runId=reused.runId;
   else {
    const courses:Embedded[]=[],groups:Embedded[]=[];for(const v of vectors.values())(v.entity==='course'?courses:groups).push({id:v.entityId,values:v.values});
    const algorithmSignal=AbortSignal.any([signal,AbortSignal.timeout(120000)]);
    let pairs:Awaited<ReturnType<typeof match>>['pairs']=[],sets:DiscoveredSet[]=[];
    const counts=(done:number,total:number)=>{progress.processed=done;progress.total=total;};
    if(request.command==='match'||request.command==='both'){progress.stage='matching';report();pairs=(await match(courses,groups,defaults,algorithmSignal,counts)).pairs;}
    if(request.command==='discover'||request.command==='both'){progress.stage='discovery';report();const found=await discover(courses,defaults,algorithmSignal,counts);sets=found.sets;progress.partial=found.truncated;if(found.truncated&&!request.allowPartial)throw Error('Candidate cap reached; no partial delivery authorized');progress.stage='reconciliation';report();await reconcile(sets,courses,groups,defaults,algorithmSignal);}
    signal.throwIfAborted();progress.stage='saving-results';report();
    const begun=await api<{runId:string;reused:boolean}>(`${root}/results/begin`,{fence,settings:defaults,partial:progress.partial,expectedPairs:pairs.length,expectedSets:sets.length,revisionIds:[...vectors.values()].map(v=>v.revisionId)},signal);runId=begun.runId;assert(isUuid(runId));
    if(!begun.reused){
     for(let offset=0;offset<pairs.length;offset+=100)await api(`${root}/results/batch`,{fence,batchId:batchId(runId,'pairs',offset),pairs:pairs.slice(offset,offset+100),sets:[]},signal);
     const courseMap=new Map(courses.map(c=>[c.id,c]));
     for(let offset=0;offset<sets.length;offset+=100){const batch=sets.slice(offset,offset+100).map(set=>{const pairwise:{a:string;b:string;score:number}[]=[];for(let i=0;i<set.members.length;i++)for(let j=i+1;j<set.members.length;j++)pairwise.push({a:set.members[i],b:set.members[j],score:dot(courseMap.get(set.members[i])!.values,courseMap.get(set.members[j])!.values)});return {...set,pairwise};});await api(`${root}/results/batch`,{fence,batchId:batchId(runId,'sets',offset),pairs:[],sets:batch},signal);}
     await api(`${root}/results/finalize`,{fence},signal);
    }
   }
  }
  progress.stage='delivery';report();let delivered=0;for(;;){signal.throwIfAborted();const result=await api<{delivered:string[];pending:number}>(`${root}/results/delivery`,{fence},signal);assert(Array.isArray(result.delivered)&&Number.isSafeInteger(result.pending)&&result.pending>=0);delivered+=result.delivered.length;if(!result.pending)break;}
  clearInterval(interval);await heartbeat;signal.throwIfAborted();await api(`${root}/finish`,{fence,state:'complete',progress:{...progress,stage:'complete'}},signal);
  return {operationId:id,runId,state:'complete',...progress,stage:'complete',delivered};
 }catch(error){
  clearInterval(interval);await heartbeat;if(cancellation)await cancellation;
  let state='unavailable';try{state=(await api<EmbeddingOperation>(`${root}/operations/${id}`,undefined,undefined,2500)).state;}catch{/* Ownership may be unavailable; never claim cancellation succeeded. */}
  if(state==='running'&&!external?.aborted)try{await api(`${root}/finish`,{fence,state:'failed',progress:{...progress,stage:'failed'}},undefined,2500);}catch{/* Persisted operation ID supports explicit readback/recovery. */}
  if(state==='cancelled'||external?.aborted){const cancelled=new Error(`Operation ${id}: cancellation ${state==='cancelled'?'confirmed':'unavailable; inspect status'}`);cancelled.name='WorkerCancelled';throw cancelled;}
  throw heartbeatFailure??error;
 }finally{clearInterval(interval);external?.removeEventListener('abort',cancel);}
}
