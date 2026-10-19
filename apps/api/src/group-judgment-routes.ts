import {Elysia,t} from 'elysia';
import type {TSchema,TUnsafe} from '@sinclair/typebox';
import {conformsJudgmentSchema,groupJudgmentSchema,judgeContextSchema,judgeEvidenceSchema,judgeFeedbackPageSchema,judgeMemberPageSchema,judgmentHistorySchema,judgmentSubmissionSchema,judgmentContentLimits,judgmentRevisionSchema,parseAdminQuery,parseJudgmentSubmission,validCourseId,uuidPattern,type JudgmentSchema,type GroupJudgment} from '@dorob/core';
import {CatalogError} from './catalog';
import type {JudgmentRepository} from './group-judgments';
import {judgmentExamples} from './group-judgment-examples';
/** Preserve the shared schema's bounds and recursive required/extra-key rules. */
export function judgmentApiSchema(s:JudgmentSchema):TUnsafe<unknown> {return convertSchema(s) as TUnsafe<unknown>;}
function convertSchema(s:JudgmentSchema):TSchema {
 if(s.anyOf)return t.Union(s.anyOf.map(judgmentApiSchema));
 if(s.enum)return t.Union(s.enum.map(v=>v===null?t.Null():t.Literal(v as string|number|boolean)));
 switch(s.type){
  case 'object':return t.Object(Object.fromEntries(Object.entries(s.properties!).map(([k,v])=>[k,judgmentApiSchema(v)])),{additionalProperties:false});
  case 'array':return t.Array(judgmentApiSchema(s.items!),{minItems:s.minItems,maxItems:s.maxItems,uniqueItems:s.uniqueItems});
  case 'string':return t.String({minLength:s.minLength,maxLength:s.maxLength,pattern:s.pattern});
  case 'integer':return t.Integer({minimum:s.minimum,maximum:s.maximum});
  case 'number':return t.Number({minimum:s.minimum,maximum:s.maximum});
  case 'boolean':return t.Boolean();case 'null':return t.Null();
  default:throw new Error('Unsupported judgment schema');
 }
}
class BodyTooLarge extends Error {}
async function boundedJson(request:Request){
 const limit=judgmentContentLimits.bodyBytes;
 const length=request.headers.get('content-length');if(length&&Number(length)>limit)throw new BodyTooLarge();
 const reader=request.body?.getReader();if(!reader)throw new CatalogError(422);
 let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new BodyTooLarge();}chunks.push(value);}}
 finally{reader.releaseLock();}
 const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{throw new CatalogError(422);}
}
function query(request:Request,revision=false,paging=false){
 const params=new URL(request.url).searchParams;
 const allowed=[...(revision?['inputRevision']:[]),...(paging?['limit','offset']:[])];
 for(const k of params.keys())if(!allowed.includes(k)||params.getAll(k).length!==1)throw new CatalogError(422);
 const inputRevision=params.get('inputRevision');if(revision&&!conformsJudgmentSchema(judgmentRevisionSchema,inputRevision))throw new CatalogError(422);
 const rest=new URLSearchParams(params);rest.delete('inputRevision');
 try{return {inputRevision:inputRevision??'',page:parseAdminQuery(rest)};}catch{throw new CatalogError(422);}
}
const uuid=t.String({pattern:uuidPattern}),idParams=t.Object({id:uuid});
const courseParams=t.Object({id:uuid,courseId:t.String({minLength:1,maxLength:265})});
const pagination={limit:t.Optional(t.String({pattern:'^\\d+$',description:'1–100; default 20'})),offset:t.Optional(t.String({pattern:'^\\d+$',description:'0–2147483647; default 0'}))};
const inputQuery=t.Object({inputRevision:judgmentApiSchema(judgmentRevisionSchema)},{additionalProperties:false});
const memberQuery=t.Object({inputRevision:judgmentApiSchema(judgmentRevisionSchema),...pagination},{additionalProperties:false});
const error=t.Object({error:t.Object({code:t.String(),message:t.String()})});
const errors={404:error,409:error,413:error,422:error,503:error};
const detail=(summary:string)=>({tags:['Course-group judgments'],summary,description:'Trusted local management. Retained evidence only; no model execution or publication. All nested input reads use one revision. URL-encode canonical course IDs.'});
export function groupJudgmentRoutes(repository?:JudgmentRepository){
 const repo=()=>{if(!repository)throw new CatalogError(503);return repository;};
 const checked=<T>(s:JudgmentSchema,v:T):T=>{if(!conformsJudgmentSchema(s,v))throw new CatalogError(503);return v;};
 return new Elysia({name:'group-judgments',normalize:false})
 .onRequest(({set})=>{set.headers['cache-control']='no-store';})
 .onError(({code,error,set})=>{
  const cause=code==='PARSE'&&'cause' in error?error.cause:error;
  const failure=cause instanceof BodyTooLarge?{status:413,message:'Judgment body exceeds 8 MiB.'}:error instanceof CatalogError?error:(code==='VALIDATION'&&!('type' in error&&error.type==='response'))||code==='PARSE'?new CatalogError(422):new CatalogError(503);
  set.status=failure.status;return {error:{code:({404:'not_found',409:'conflict',413:'body_too_large',422:'invalid_input',503:'unavailable'} as Record<number,string>)[failure.status],message:failure.message}};
 })
 .get('/api/v1/manage/groups/:id/judge-input',async({params,request})=>{query(request);return checked(judgeContextSchema,await repo().context(params.id));},{params:idParams,query:t.Object({},{additionalProperties:false}),response:{200:judgmentApiSchema(judgeContextSchema),...errors},detail:detail('Get revision-bound judge context, including drafts and small groups')})
 .get('/api/v1/manage/groups/:id/judge-input/courses',async({params,request})=>{const q=query(request,true,true);return checked(judgeMemberPageSchema,await repo().members(params.id,q.inputRevision,q.page));},{params:idParams,query:memberQuery,response:{200:judgmentApiSchema(judgeMemberPageSchema),...errors},detail:detail('Traverse all member references, canonical ID ascending')})
 .get('/api/v1/manage/groups/:id/judge-input/courses/:courseId',async({params,request})=>{if(!validCourseId(params.courseId))throw new CatalogError(422);const q=query(request,true);return checked(judgeEvidenceSchema,await repo().evidence(params.id,q.inputRevision,params.courseId));},{params:courseParams,query:inputQuery,response:{200:judgmentApiSchema(judgeEvidenceSchema),...errors},detail:detail('Read full whitelisted evidence for a member')})
 .get('/api/v1/manage/groups/:id/judge-input/courses/:courseId/feedback',async({params,request})=>{if(!validCourseId(params.courseId))throw new CatalogError(422);const q=query(request,true,true);return checked(judgeFeedbackPageSchema,await repo().feedback(params.id,q.inputRevision,params.courseId,q.page));},{params:courseParams,query:memberQuery,response:{200:judgmentApiSchema(judgeFeedbackPageSchema),...errors},detail:detail('Traverse all retained comments and reviews in saved order')})
 .post('/api/v1/manage/groups/:id/judgments',async({params,request,body,status})=>{query(request);let input;try{input=parseJudgmentSubmission(body);}catch{throw new CatalogError(422);}const result=await repo().submit(params.id,input);return status(result.created?201:200,checked(groupJudgmentSchema,result.judgment));},{parse:async({request})=>boundedJson(request),params:idParams,query:t.Object({},{additionalProperties:false}),body:judgmentApiSchema(judgmentSubmissionSchema),response:{200:judgmentApiSchema(groupJudgmentSchema) as TUnsafe<GroupJudgment>,201:judgmentApiSchema(groupJudgmentSchema) as TUnsafe<GroupJudgment>,...errors},detail:{...detail('Store a complete judgment (201 new, 200 exact replay)')}})
 .get('/api/v1/manage/groups/:id/judgments',async({params,request})=>{const q=query(request,false,true);return checked(judgmentHistorySchema,await repo().history(params.id,q.page));},{params:idParams,query:t.Object(pagination,{additionalProperties:false}),response:{200:judgmentApiSchema(judgmentHistorySchema),...errors},detail:detail('Read immutable history summaries, newest first, stable ID ties')})
 .get('/api/v1/manage/groups/:id/judgments/:judgmentId',async({params,request})=>{query(request);return checked(groupJudgmentSchema,await repo().detail(params.id,params.judgmentId));},{params:t.Object({id:uuid,judgmentId:uuid}),query:t.Object({},{additionalProperties:false}),response:{200:judgmentApiSchema(groupJudgmentSchema) as TUnsafe<GroupJudgment>,...errors},detail:detail('Read exact judgment and retained manifest with computed freshness')});
}

/** @elysia/openapi replaces detail responses/requestBody after route generation.
 * Enrich the final document while retaining the generated runtime schemas. */
export function addJudgmentOpenapiExamples(document:{paths?:Record<string,Record<string,{responses?:Record<string,{content?:Record<string,{schema?:unknown;example?:unknown}>}>;requestBody?:unknown}>>}) {
 const prefix='/api/v1/manage/groups/{id}';
 const entries:[string,string,unknown][]=[['/judge-input','get',judgmentExamples.context],['/judge-input/courses','get',judgmentExamples.members],['/judge-input/courses/{courseId}','get',judgmentExamples.evidence],['/judge-input/courses/{courseId}/feedback','get',judgmentExamples.feedback],['/judgments','get',judgmentExamples.history],['/judgments','post',judgmentExamples.judgment],['/judgments/{judgmentId}','get',judgmentExamples.judgment]];
 for(const [path,method,example] of entries){const op=document.paths?.[prefix+path]?.[method];if(!op)continue;const response=op.responses?.['200']?.content?.['application/json'];if(response)response.example=example;
  if(method==='post'){op.requestBody={required:true,content:{'application/json':{schema:judgmentSubmissionSchema,example:judgmentExamples.submission}}};const created=op.responses?.['201']?.content?.['application/json'];if(created)created.example=example;}
 }
}
