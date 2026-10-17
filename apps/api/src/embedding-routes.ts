import type {TSchema} from '@sinclair/typebox';
import {Elysia,t} from 'elysia';
import type {SQL} from 'bun';
import {isEmbeddingFence,isEmbeddingInput,categoryRegistry,targetLevels,type EmbeddingFence} from '@dorob/core';
import {defaults,hash,type Pair,type Settings} from '@dorob/embedding-engine';
import {CatalogError} from './catalog';
import {createEmbeddingRepository} from './embeddings';
import {createEmbeddingResults,type CandidateResult} from './embedding-results';
const uuid=t.String({format:'uuid'}),key=t.String({pattern:'^[a-f0-9]{64}$'});
const object=<T extends Record<string,TSchema>>(properties:T)=>t.Object(properties,{additionalProperties:false});
const fence=object({operationId:uuid,attemptId:uuid,token:uuid});
const pagination={limit:t.Optional(t.Numeric({minimum:1,maximum:100,multipleOf:1})),offset:t.Optional(t.Numeric({minimum:0,maximum:2147483647,multipleOf:1}))};
const paging=(q:{limit?:number;offset?:number})=>({limit:q.limit??20,offset:q.offset??0});
const group=object({title:t.String({minLength:1,maxLength:300,pattern:'[آ-ی]'}),slug:t.String({maxLength:100,pattern:'^[a-z0-9]+(-[a-z0-9]+)*$'}),description:t.String({minLength:1,maxLength:2000}),categoryId:t.Union(categoryRegistry.map(c=>t.Literal(c.id))),targetLevel:t.Union([t.Null(),...targetLevels.map(level=>t.Literal(level))])});
const pair=object({id:key,courseId:t.String({maxLength:265}),groupId:uuid,score:t.Number({minimum:.60,maximum:1})});
const candidate=object({id:key,members:t.Array(t.String({maxLength:265}),{minItems:2,maxItems:13,uniqueItems:true}),seeds:t.Array(t.String({maxLength:265}),{maxItems:13,uniqueItems:true}),medoid:t.String({maxLength:265}),mean:t.Number({minimum:0,maximum:1}),minimum:t.Number({minimum:.70,maximum:1}),suppressedBy:t.Union([key,t.Null()]),status:t.Union((['novel','partial','covered','ambiguous'] as const).map(x=>t.Literal(x))),reconciliation:t.Array(object({groupId:uuid,centroidScore:t.Number({minimum:-1,maximum:1}),fraction:t.Number({minimum:0,maximum:1}),members:t.Array(object({courseId:t.String({maxLength:265}),score:t.Number({minimum:-1,maximum:1}),passes:t.Boolean()}),{minItems:2,maxItems:13})}),{maxItems:5}),pairwise:t.Array(object({a:t.String({maxLength:265}),b:t.String({maxLength:265}),score:t.Number({minimum:.70,maximum:1})}),{minItems:1,maxItems:78})});
const progress=t.Record(t.String(),t.Union([t.String({maxLength:100}),t.Number(),t.Boolean()]));
function validProgress(p:Record<string,unknown>) {for(const [key,value]of Object.entries(p)){if(!['stage','processed','total','generated','reused','excluded','elapsedMs','partial'].includes(key)||key==='stage'&&typeof value!=='string'||key==='partial'&&typeof value!=='boolean'||!['stage','partial'].includes(key)&&(!Number.isSafeInteger(value)||Number(value)<0||Number(value)>2147483647))throw new CatalogError(422);}return p;}
const exampleModel={model:'bge-m3:567m',digest:'0'.repeat(64),dimensions:1024 as const,profile:'educational-v1:utf8-65536:chunks-4096:byte-pool-l2:nfc-fa' as const};
export const embeddingSwaggerConfigurationExample={...exampleModel,id:hash(exampleModel)};
export function embeddingRoutes(sql?:SQL) {
 const repository=()=>{if(!sql)throw new CatalogError(503);return createEmbeddingRepository(sql);};
 const results=()=>{if(!sql)throw new CatalogError(503);return createEmbeddingResults(sql);};
 const root='/api/v1/manage/embeddings';
 const app=new Elysia({name:'catalog-embeddings',normalize:false})
 .onRequest(({request})=>{const url=new URL(request.url),origin=request.headers.get('origin');if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||origin&&origin!==url.origin||Number(request.headers.get('content-length')??0)>2*1024*1024)throw new CatalogError(422);})
 .onBeforeHandle(({body})=>{if(body&&new TextEncoder().encode(JSON.stringify(body)).length>2*1024*1024)throw new CatalogError(422);})
 .onError(({error,code,set})=>{const failure=error instanceof CatalogError?error:code==='VALIDATION'||code==='PARSE'?new CatalogError(422):new CatalogError(503);set.status=failure.status;return {error:{code:{404:'not_found',409:'conflict',422:'invalid_input',503:'unavailable'}[failure.status],message:failure.message}};});
 const meta=(summary:string)=>{
  const descriptions={404:'Unknown saved identity',409:'Replay/ownership/review/currentness conflict',422:'Invalid or oversized local request',503:'Persistence unavailable'};
  const responses=Object.fromEntries(([404,409,422,503] as const).map(status=>[String(status),{
   description:descriptions[status],
   content:{'application/json':{schema:object({error:object({code:t.String(),message:t.String()})})}}
  }]));
  return {tags:['Local embedding workflow'],summary,responses};
 };
 app.get(root+'/runs',({query})=>repository().runs(paging(query)),{query:object(pagination),detail:meta('Page saved immutable run metadata')});
 app.get(root+'/runs/:id',({params})=>repository().run(params.id),{params:object({id:uuid}),detail:meta('Read exact computation settings, selected revisions and coverage')});
 app.get(root+'/runs/:id/revisions',({params,query})=>repository().runRevisions(params.id,paging(query)),{params:object({id:uuid}),query:object(pagination),detail:meta('Page historical frozen vector values and checksums')});
 app.get(root+'/revisions/:id',({params})=>repository().revision(params.id),{params:object({id:uuid}),detail:meta('Inspect immutable revision and exact source snapshot/model identity')});
 app.get(root+'/manifests/:id',({params})=>repository().manifest(params.id),{params:object({id:uuid}),detail:meta('Read finalized frozen scope and exclusions')});
 app.post(root+'/configurations',({body})=>repository().configuration(body),{body:t.Object({id:key,model:t.String({maxLength:100}),digest:t.String({maxLength:80}),dimensions:t.Literal(1024),profile:t.String({maxLength:100})},{additionalProperties:false,description:'Synthetic expected-configuration example; registration does not verify installation or start inference.',examples:[embeddingSwaggerConfigurationExample]}),detail:meta('Register exact expected BGE-M3 artifact; no inference or downloads')});
 app.get(root+'/configurations/:id',({params})=>repository().configurationRead(params.id),{params:object({id:key}),detail:meta('Read immutable model and representation configuration')});
 app.post(root+'/operations',({body})=>repository().start(body),{body:object({requestId:uuid,configurationId:key,command:t.Union((['generate','match','discover','both'] as const).map(x=>t.Literal(x))),scope:object({courses:t.Union([t.Literal('all'),t.Array(t.String({maxLength:265}),{maxItems:10000})]),groups:t.Union([t.Literal('all'),t.Array(uuid,{maxItems:100})])}),force:t.Boolean(),allowPartial:t.Boolean()}),detail:meta('Register idempotent finite operation; no execution')});
 const params=object({id:uuid});
 app.get(root+'/operations/:id',({params})=>repository().status(params.id),{params,detail:meta('Persisted progress; expired leases are interrupted without automatic resume')});
 app.get(root+'/operations/:id/attempts',({params,query})=>repository().attempts(params.id,paging(query)),{params,query:object(pagination),detail:meta('Page retained attempt history without exposing fencing tokens')});
 app.get(root+'/operations/:id/request',({params})=>repository().request(params.id),{params,detail:meta('Read original scope and configuration for explicit retry')});
 app.post(root+'/operations/:id/capture',({params})=>repository().capture(params.id),{params,body:object({}),detail:meta('Finalize repeatable-read educational manifest; bounded 30 second capture')});
 app.get(root+'/operations/:id/inputs',({params,query})=>repository().inputs(params.id,paging(query)),{params,query:object(pagination),detail:meta('Page frozen educational inputs and exclusion reasons')});
 app.post(root+'/operations/:id/claim',({params,body})=>repository().claim(params.id,body.attemptId),{params,body:object({attemptId:uuid}),detail:meta('Claim single execution with durable attempt ID and 15 second database-time lease')});
 for(const action of ['cancel','retry'] as const)app.post(root+`/operations/:id/${action}`,({params})=>repository()[action](params.id),{params,body:object({}),detail:meta(action==='cancel'?'Cancel atomically; preserve committed evidence/deliveries':'Explicitly retry frozen input; no inference starts')});
 app.post(root+'/heartbeat',({body})=>repository().heartbeat(body.fence,validProgress(body.progress)),{body:object({fence,progress}),detail:meta('Heartbeat fenced execution; worker calls every two seconds')});
 app.post(root+'/finish',({body})=>repository().finish(body.fence,body.state,validProgress(body.progress)),{body:object({fence,state:t.Union([t.Literal('complete'),t.Literal('failed')]),progress}),detail:meta('Commit terminal attempt state; cancellation/completion races conflict')});
 app.post(root+'/vectors/read',({body})=>repository().vectors(body.fence,{limit:body.limit,offset:body.offset}),{body:object({fence,limit:t.Integer({minimum:1,maximum:100}),offset:t.Integer({minimum:0,maximum:2147483647})}),detail:meta('Freeze compatible preferred revisions and page exact vectors')});
 app.post(root+'/vectors',({body})=>{if(!isEmbeddingInput(body.input))throw new CatalogError(422);return repository().acceptVector(body.fence,{input:body.input,values:body.values,checksum:body.checksum});},{body:object({fence,input:t.Unknown(),values:t.Array(t.Number(),{minItems:1024,maxItems:1024}),checksum:key}),detail:meta('Accept immutable normalized float32 revision; replay uses operation/entity identity')});
 app.get(root+'/operations/:id/run',async({params})=>Response.json(await results().saved(params.id)),{params,detail:meta('Read committed computation for delivery-only retry without model access')});
 app.post(root+'/results/begin',({body})=>{if(!isEmbeddingFence(body.fence))throw new CatalogError(422);return results().begin(body.fence,{...body,settings:body.settings as unknown as Settings});},{body:object({fence,settings:t.Object(Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,t.Literal(v as number)]))),partial:t.Boolean(),expectedPairs:t.Integer({minimum:0,maximum:2000}),expectedSets:t.Integer({minimum:0,maximum:10000}),revisionIds:t.Array(uuid,{maxItems:10100})}),detail:meta('Register exact revision-based computation or reuse an immutable completed run')});
 app.post(root+'/results/batch',({body})=>results().upload(body.fence as EmbeddingFence,body.batchId,body.pairs as Pair[],body.sets as CandidateResult[]),{body:object({fence,batchId:uuid,pairs:t.Array(pair,{maxItems:100}),sets:t.Array(candidate,{maxItems:100})}),detail:meta('Persist bounded fenced result batch with durable replay identity')});
 for(const action of ['reuse','finalize','delivery'] as const)app.post(root+`/results/${action}`,async({body})=>Response.json(await results()[action](body.fence)),{body:object({fence}),detail:meta(action==='finalize'?'Finalize counts and immutable delivery plans':'Deliver up to 20 matching suggestions atomically with immutable evidence')});
 app.post(root+'/runs/:id/accept-partial',({params})=>results().acceptPartial(params.id),{params,body:object({}),detail:meta('Explicitly accept partial run before membership approval')});
 app.get(root+'/suggestions/:id/evidence',({params})=>results().evidence(params.id),{params,detail:meta('Exact score kind, configuration, frozen revisions and educational currentness')});
 app.get(root+'/runs/:id/discoveries',({params,query})=>results().candidates(params.id,paging(query),query.suppressed??false),{params,query:object({...pagination,suppressed:t.Optional(t.BooleanString())}),detail:meta('Page retained or suppressed candidates; no inference')});
 app.get(root+'/discoveries/:id',({params})=>results().candidate(params.id),{params,detail:meta('Read frozen members, pairwise scores, representatives and reconciliation')});
 app.get(root+'/discoveries/:id/evidence',({params})=>results().candidateEvidence(params.id),{params,detail:meta('Read exact pairwise, seed and reconciliation evidence for a candidate')});
 app.get(root+'/discoveries/:id/overlap',({params,query})=>results().overlap(params.id,paging(query)),{params,query:object(pagination),detail:meta('Page shared-member candidate links and exact Jaccard overlap')});
 app.get(root+'/discoveries/:id/history',({params,query})=>results().history(params.id,paging(query)),{params,query:object(pagination),detail:meta('Page immutable discovery annotation/review history')});
 app.post(root+'/discoveries/:id/review',({params,body})=>results().review(params.id,body),{params,body:object({requestId:uuid,expectedVersion:t.Integer({minimum:0,maximum:2147483646}),status:t.Union((['pending','approved','dismissed'] as const).map(x=>t.Literal(x))),title:t.Union([t.Null(),t.String({maxLength:300})]),note:t.Union([t.Null(),t.String({maxLength:2000})]),acceptPartial:t.Boolean()}),detail:meta('Versioned candidate approval/dismissal; creates no group or membership')});
 app.post(root+'/discoveries/:id/promote',({params,body})=>results().promote(params.id,body),{params,body:object({requestId:uuid,expectedVersion:t.Integer({minimum:0,maximum:2147483646}),group}),detail:meta('Explicitly create one empty unpublished draft and all-member suggestion plan')});
 app.post(root+'/promotions/:id/delivery',({params})=>results().promotionDelivery(params.id),{params,body:object({}),detail:meta('Explicit promotion delivery/retry; every member uses frozen within-set mean, no new inference')});
 return app;
}
