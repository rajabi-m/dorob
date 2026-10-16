import {Elysia,t} from 'elysia';
import {parseSuggestionInput,suggestionInputSchema,type ReviewAction,type SuggestionInput} from '@dorob/core';
import {apiSchema} from './public-course-routes';
import type {TUnsafe} from '@sinclair/typebox';
import {CatalogError} from './catalog';
import type {SuggestionRepository} from './group-suggestions';
const uuid=t.String({format:'uuid'}), nullable=<T extends ReturnType<typeof t.String>>(s:T)=>t.Union([s,t.Null()]);
const reference=t.Object({id:t.String(),providerId:t.String(),providerCourseId:t.String(),title:t.String(),sourceUrl:t.String()});
const review=t.Object({groupId:uuid,courseId:t.String(),status:t.Union([t.Literal('pending'),t.Literal('approved'),t.Literal('rejected')]),version:t.Integer({minimum:0}),selectedSuggestionId:nullable(uuid),origin:t.Union([t.Literal('manual'),t.Literal('suggestion'),t.Null()]),decidedAt:nullable(t.String())});
const suggestion=t.Object({id:uuid,groupId:uuid,courseId:t.String(),systemId:t.String(),systemName:t.String(),submissionId:t.String(),confidencePercent:t.Number({minimum:0,maximum:100}),receivedAt:t.String(),course:reference,review});
const transition=t.Object({id:uuid,groupId:uuid,courseId:t.String(),fromVersion:t.Integer(),toVersion:t.Integer(),action:t.String(),suggestionId:nullable(uuid),occurredAt:t.String(),outcome:review});
const member=t.Object({course:reference,review,suggestion:t.Union([suggestion,t.Null()])});
const page=<T extends typeof suggestion|typeof transition|typeof member>(item:T)=>t.Object({items:t.Array(item),total:t.Integer(),limit:t.Integer(),offset:t.Integer()});
const pagination={limit:t.Optional(t.Numeric({minimum:1,maximum:100,multipleOf:1})),offset:t.Optional(t.Numeric({minimum:0,maximum:2147483647,multipleOf:1}))};
const paging=(q:{limit?:number;offset?:number})=>({limit:q.limit??20,offset:q.offset??0});
const error=t.Object({error:t.Object({code:t.String(),message:t.String()})}), errors={404:error,409:error,422:error,503:error};
const detail=(summary:string)=>({tags:['Local management'],summary});
export function groupSuggestionRoutes(repository?:SuggestionRepository){
 const repo=()=>{if(!repository)throw new CatalogError(503);return repository;};
 const app=new Elysia({name:'group-suggestions',normalize:false}).onError(({error,code,set})=>{
  const failure=(code==='VALIDATION'&&!('type' in error&&error.type==='response'))||code==='PARSE'?new CatalogError(422):error instanceof CatalogError?error:new CatalogError(503);set.status=failure.status;
  return {error:{code:{404:'not_found',409:'conflict',422:'invalid_input',503:'unavailable'}[failure.status],message:failure.message}};
 });
 app.post('/api/v1/manage/groups/:id/suggestions',async({params,body,status})=>{
  let input:SuggestionInput;try{input=parseSuggestionInput(body);}catch{throw new CatalogError(422);}
  const result=await repo().submit(params.id,input);return status(result.created?201:200,result.suggestion);
 },{params:t.Object({id:uuid}),body:apiSchema(suggestionInputSchema) as TUnsafe<SuggestionInput>,response:{200:suggestion,201:suggestion,...errors},detail:detail('Submit attributed suggestion (201 new, 200 replay; no membership or AI)')});
 app.get('/api/v1/manage/groups/:id/suggestions',({params,query})=>repo().list(params.id,query.status??'pending',paging(query)),{params:t.Object({id:uuid}),query:t.Object({...pagination,status:t.Optional(t.Union([t.Literal('pending'),t.Literal('approved'),t.Literal('rejected')]))}),response:{200:page(suggestion),...errors},detail:detail('Inspect immutable suggestions ordered by confidence, receipt time and UUID')});
 app.get('/api/v1/manage/groups/:id/member-reviews',({params,query})=>repo().members(params.id,paging(query)),{params:t.Object({id:uuid}),query:t.Object(pagination),response:{200:page(member),...errors},detail:detail('Current members with selected manual or system provenance')});
 app.get('/api/v1/manage/suggestions/:id/history',({params,query})=>repo().history(params.id,paging(query)),{params:t.Object({id:uuid}),query:t.Object(pagination),response:{200:page(transition),...errors},detail:detail('Pair transition history, newest version first')});
 for(const action of ['approve','reject','reopen'] as ReviewAction[])app.post(`/api/v1/manage/suggestions/:id/${action}`,({params,body})=>repo().review(params.id,action,body.expectedReviewVersion),{params:t.Object({id:uuid}),body:t.Object({expectedReviewVersion:t.Integer({minimum:0,maximum:2147483646})},{additionalProperties:false}),response:{200:t.Object({review,membership:t.Boolean()}),...errors},detail:detail(`${action} with observed pair version; conflicting stale reviews return 409`)});
 return app;
}
