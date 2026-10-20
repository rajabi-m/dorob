import 'server-only';
import {isPublicJudgedGroupPage,isPublicJudgedGroupDetail,parseGroupPageQuery,validGroupSlug,type GroupPageQuery,type PublicJudgedGroup,type PublicJudgedGroupDetail,type Page} from '@dorob/core';
import {apiOrigin,boundedBody} from './course-api';
import {groupFailure,groupQueryString,type GroupResult} from './group-result';
export function createGroupClient(options:{origin?:string;fetcher?:(url:string,init?:RequestInit)=>Promise<Response>;deadlineMs?:number}={}){
 async function request<T>(path:string,max:number,validate:(v:unknown)=>v is T):Promise<GroupResult<T>>{
  try{const response=await (options.fetcher??fetch)(apiOrigin(options.origin)+path,{cache:'no-store',redirect:'error',headers:{accept:'application/json'},signal:AbortSignal.timeout(options.deadlineMs??5000)});
   if(!response.ok){await response.body?.cancel();return groupFailure(response.status===404?'not_found':response.status===409?'conflict':response.status===422?'invalid_input':'unavailable');}
   if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??'')){await response.body?.cancel();return groupFailure('unavailable');}
   const value=JSON.parse(new TextDecoder().decode(await boundedBody(response,max)));return validate(value)?{ok:true,data:value}:groupFailure('unavailable');
  }catch{return groupFailure('unavailable');}
 }
 return {
 list(q:GroupPageQuery):Promise<GroupResult<Page<PublicJudgedGroup>>>{try{parseGroupPageQuery(new URLSearchParams(groupQueryString(q)));}catch{return Promise.resolve(groupFailure('invalid_input'));}return request('/api/v1/judged-groups?'+groupQueryString(q),2*1024*1024,(v):v is Page<PublicJudgedGroup>=>isPublicJudgedGroupPage(v)&&v.limit===q.limit&&v.offset===q.offset);},
 detail(slug:string,q:GroupPageQuery):Promise<GroupResult<PublicJudgedGroupDetail>>{try{if(!validGroupSlug(slug))throw new Error();parseGroupPageQuery(new URLSearchParams(groupQueryString(q)),true);}catch{return Promise.resolve(groupFailure('invalid_input'));}return request('/api/v1/judged-groups/'+encodeURIComponent(slug)+'?'+groupQueryString(q),8*1024*1024,(v):v is PublicJudgedGroupDetail=>isPublicJudgedGroupDetail(v)&&v.slug===slug&&v.courses.limit===q.limit&&v.courses.offset===q.offset&&(!q.judgmentId||v.judgmentId===q.judgmentId));},
 };
}
export function groupResponse<T>(r:GroupResult<T>){return Response.json(r.ok?r.data:{error:r.error},{status:r.ok?200:({not_found:404,conflict:409,invalid_input:422,unavailable:503})[r.error.code],headers:{'cache-control':'no-store'}});}
export async function groupListHandler(request:Request,client=createGroupClient()){try{return groupResponse(await client.list(parseGroupPageQuery(new URL(request.url).searchParams)));}catch{return groupResponse(groupFailure('invalid_input'));}}
export async function groupDetailHandler(request:Request,slug:string,client=createGroupClient()){try{return groupResponse(await client.detail(slug,parseGroupPageQuery(new URL(request.url).searchParams,true)));}catch{return groupResponse(groupFailure('invalid_input'));}}
