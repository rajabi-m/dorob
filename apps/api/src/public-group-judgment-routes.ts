import {Elysia,t} from 'elysia';
import {parseGroupPageQuery,parseGroupListQuery,categoryRegistry,validGroupSlug,isPublicJudgedGroupPage,isPublicJudgedGroupDetail,publicJudgedGroupPageSchema,publicJudgedGroupDetailSchema,type Page,type PublicJudgedGroup,type PublicJudgedGroupDetail} from '@dorob/core';
import type {TUnsafe} from '@sinclair/typebox';
import {judgmentApiSchema} from './group-judgment-routes';
import {CatalogError} from './catalog';
import type {PublicGroupJudgmentRepository} from './public-group-judgments';
const error=t.Object({error:t.Object({code:t.String(),message:t.String()})});
const errors={404:error,409:error,422:error,503:error};
const paging={limit:t.Optional(t.String({pattern:'^\\d+$'})),offset:t.Optional(t.String({pattern:'^\\d+$'}))};
export function publicGroupJudgmentRoutes(repository?:PublicGroupJudgmentRepository){
 const repo=()=>{if(!repository)throw new CatalogError(503);return repository;};
 const query=(request:Request,detail=false)=>{try{const params=new URL(request.url).searchParams;return detail?parseGroupPageQuery(params,true):parseGroupListQuery(params);}catch{throw new CatalogError(422);}};
 return new Elysia({name:'public-judged-groups',normalize:false})
 .onRequest(({set})=>{set.headers['cache-control']='no-store';})
 .onError(({code,error,set})=>{const e=error instanceof CatalogError?error:code==='VALIDATION'&&!('type' in error&&error.type==='response')?new CatalogError(422):new CatalogError(503);set.status=e.status;return {error:{code:({404:'not_found',409:'conflict',422:'invalid_input',503:'unavailable'})[e.status],message:e.message}};})
 .get('/api/v1/judged-groups',async({request})=>{const result=await repo().list(query(request));if(!isPublicJudgedGroupPage(result))throw new CatalogError(503);return result;},{query:t.Object({...paging,q:t.Optional(t.String({maxLength:200})),category:t.Optional(t.String({enum:categoryRegistry.map(c=>c.id)}))},{additionalProperties:false}),response:{200:judgmentApiSchema(publicJudgedGroupPageSchema) as TUnsafe<Page<PublicJudgedGroup>>,...errors},detail:{tags:['Public judged groups'],summary:'Published complete groups with newest current judgment',description:'Read-only. Default limit 12, maximum 100. Slug ascending, ID ties. Eligibility and literal normalized hero search (q) and assigned category precede totals/paging. Optional q: maximum 200 characters.'}})
 .get('/api/v1/judged-groups/:slug',async({params,request})=>{if(!validGroupSlug(params.slug))throw new CatalogError(422);const result=await repo().detail(params.slug,query(request,true));if(!isPublicJudgedGroupDetail(result))throw new CatalogError(503);return result;},{params:t.Object({slug:t.String({maxLength:100,pattern:'^[a-z0-9]+(?:-[a-z0-9]+)*$'})}),query:t.Object({...paging,judgmentId:t.Optional(t.String())},{additionalProperties:false}),response:{200:judgmentApiSchema(publicJudgedGroupDetailSchema) as TUnsafe<PublicJudgedGroupDetail>,...errors},detail:{tags:['Public judged groups'],summary:'Ordered assessed courses from the selected judgment',description:'Default limit 20, maximum 100. Optional judgmentId pins traversal; 409 means restart. Missing/ineligible unpinned detail is 404. No collection or model execution.'}});
}
