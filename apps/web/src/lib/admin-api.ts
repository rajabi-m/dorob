import 'server-only';
import {apiOrigin,boundedBody} from './course-api';
import {isUuid,validCourseId,isCourseGroup,isCourseReference,isAdminPage,isGroupSuggestion,isReviewOutcome,isMemberReview,isReviewTransition,parseAdminQuery,parseSuggestionInput,isReviewVersion,categoryRegistry,targetLevels,type AdminCourseSummary} from '@dorob/core';
export type AdminOperation='groups'|'group'|'courses'|'course'|'suggestions'|'members'|'history'|'approve'|'reject'|'reopen'|'membership';
type Guard=(v:unknown)=>boolean;
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export class AdminFailure extends Error {constructor(public status:number){super('درخواست انجام نشد.');}}
const safe=(status:number)=>new AdminFailure([404,409,422].includes(status)?status:503);
export function summarizeCourse(value:unknown):AdminCourseSummary {
 if(!record(value)||!isCourseReference(value.reference)||typeof value.presentationReady!=='boolean')throw safe(503);
 const summary:AdminCourseSummary={reference:value.reference,presentationReady:value.presentationReady,checkedAt:null,thumbnailStatus:null,description:null,contentMinutes:null,instructors:[],syllabus:[],prices:[]};
 if(value.snapshot===null)return summary;
 const snapshot=value.snapshot;if(!record(snapshot)||snapshot.courseId!==value.reference.id||!record(snapshot.payload)||!record(snapshot.thumbnail)||!['ready','missing','failed','pending'].includes(String(snapshot.thumbnail.status)))throw safe(503);
 const p=snapshot.payload;if(p.providerId!==value.reference.providerId||typeof p.title!=='string'||!record(p.source)||typeof p.source.checkedAt!=='string'||!Number.isFinite(Date.parse(p.source.checkedAt)))throw safe(503);
 summary.checkedAt=p.source.checkedAt;summary.thumbnailStatus=snapshot.thumbnail.status as AdminCourseSummary['thumbnailStatus'];
 const data=(key:string)=>record(p[key])?p[key].data:null;
 const desc=data('description');if(typeof desc==='string')summary.description=desc.slice(0,4000);
 const education=data('education');if(record(education)&&record(education.duration)&&typeof education.duration.contentMinutes==='number'&&Number.isFinite(education.duration.contentMinutes)&&education.duration.contentMinutes>=0)summary.contentMinutes=education.duration.contentMinutes;
 const instructors=data('instructors');if(Array.isArray(instructors))summary.instructors=instructors.filter(record).map(x=>x.name).filter((x):x is string=>typeof x==='string').slice(0,50).map(x=>x.slice(0,500));
 const curriculum=data('curriculum');if(record(curriculum)&&Array.isArray(curriculum.syllabus))summary.syllabus=curriculum.syllabus.filter(record).map(x=>x.title).filter((x):x is string=>typeof x==='string').slice(0,50).map(x=>x.slice(0,500));
 const offers=data('pricing');if(Array.isArray(offers))summary.prices=offers.filter(record).slice(0,50).map(x=>x.status==='free'&&x.amount===0?'رایگان':x.status==='paid'&&typeof x.amount==='number'&&Number.isFinite(x.amount)&&x.amount>0?`${x.amount.toLocaleString('fa-IR')} تومان`:x.status==='subscription'?'اشتراکی؛ شرایط در منبع':'قیمت نامشخص');
 return summary;
}
function validateGroup(body:unknown,patch:boolean) {
 if(!record(body)||!Object.keys(body).length||Object.keys(body).some(k=>!['title','slug','description','categoryId','targetLevel','isPublished'].includes(k)))throw safe(422);
 for(const [k,v] of Object.entries(body)){
  if(k==='slug'&&(typeof v!=='string'||v.length>100||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)))throw safe(422);
  if(['title','description'].includes(k)&&(typeof v!=='string'||!v.trim()||v.length>(k==='title'?300:2000)))throw safe(422);
  if(k==='categoryId'&&!categoryRegistry.some(c=>c.id===v)||k==='targetLevel'&&v!==null&&!targetLevels.includes(v as never)||k==='isPublished'&&typeof v!=='boolean')throw safe(422);
 }
 if(!patch&&!['title','slug','description','categoryId'].every(k=>k in body))throw safe(422);
 return body;
}
export function createAdminClient(options:{origin?:string;fetcher?:(url:string,init?:RequestInit)=>Promise<Response>;deadlineMs?:number}={}) {
 return {async request(operation:AdminOperation,method:string,params:{id?:string;courseId?:string}={},query=new URLSearchParams(),body?:unknown):Promise<{status:number;data:unknown}> {
  let path='',guard:Guard=()=>false;
  const group=()=>{if(!isUuid(params.id))throw safe(422);return '/api/v1/manage/groups/'+params.id;};
  const suggestion=()=>{if(!isUuid(params.id))throw safe(422);return '/api/v1/manage/suggestions/'+params.id;};
  const page=(kind:'groups'|'courses'|'suggestions'|'page')=>{parseAdminQuery(query,kind);return '?'+query.toString();};
  if(operation==='groups'&&method==='GET'){path='/api/v1/manage/groups'+page('groups');guard=v=>isAdminPage(v,isCourseGroup);}
  else if(operation==='groups'&&method==='POST'){validateGroup(body,false);path='/api/v1/manage/groups';guard=isCourseGroup;}
  else if(operation==='group'&&['GET','PATCH'].includes(method)){path=group();if(method==='GET')path+=page('page');else validateGroup(body,true);guard=v=>isCourseGroup(v)&&v.id===params.id&&(method!=='GET'||record(v)&&isAdminPage(v.courses,isCourseReference));}
  else if(operation==='courses'&&method==='GET'){path='/api/v1/manage/courses'+page('courses');guard=v=>isAdminPage(v,isCourseReference);}
  else if(operation==='course'&&method==='GET'){if(!params.courseId||!validCourseId(params.courseId))throw safe(422);path='/api/v1/manage/courses/'+encodeURIComponent(params.courseId);guard=v=>summarizeCourse(v).reference.id===params.courseId;}
  else if(operation==='suggestions'&&method==='GET'){path=group()+'/suggestions'+page('suggestions');guard=v=>isAdminPage(v,isGroupSuggestion)&&v.items.every(s=>s.groupId===params.id);}
  else if(operation==='suggestions'&&method==='POST'){body=parseSuggestionInput(body);path=group()+'/suggestions';guard=isGroupSuggestion;}
  else if(operation==='members'&&method==='GET'){path=group()+'/member-reviews'+page('page');guard=v=>isAdminPage(v,isMemberReview)&&v.items.every(s=>s.review.groupId===params.id);}
  else if(operation==='history'&&method==='GET'){path=suggestion()+'/history'+page('page');guard=v=>isAdminPage(v,isReviewTransition);}
  else if(['approve','reject','reopen'].includes(operation)&&method==='POST'){if(!record(body)||Object.keys(body).length!==1||!isReviewVersion(body.expectedReviewVersion))throw safe(422);path=suggestion()+'/'+operation;guard=isReviewOutcome;}
  else if(operation==='membership'&&['PUT','DELETE'].includes(method)){if(!params.courseId||!validCourseId(params.courseId))throw safe(422);path=group()+'/courses/'+encodeURIComponent(params.courseId);guard=()=>true;}
  else throw safe(422);
  if(method!=='GET'&&query.size)throw safe(422);
  try {
   const response=await (options.fetcher??fetch)(apiOrigin(options.origin)+path,{method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(options.deadlineMs??5000),headers:{accept:'application/json',...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   if(!response.ok){await response.body?.cancel();throw safe(response.status);}
   if(response.status===204&&operation==='membership')return {status:204,data:null};
   if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))throw safe(503);
   const value=JSON.parse(new TextDecoder().decode(await boundedBody(response,2*1024*1024)));
   if(!guard(value))throw safe(503);
   if(record(value)&&Array.isArray(value.items)){const parsed=parseAdminQuery(query,operation==='groups'?'groups':operation==='courses'?'courses':operation==='suggestions'?'suggestions':'page');if(value.limit!==parsed.limit||value.offset!==parsed.offset)throw safe(503);}
   return {status:response.status,data:operation==='course'?summarizeCourse(value):value};
  }catch(e){throw e instanceof AdminFailure?e:safe(503);}
 }};
}
export async function adminHandler(request:Request,operation:AdminOperation,params:{id?:string;courseId?:string}={},client=createAdminClient()) {
 try{
  let body:unknown;
  if(request.method!=='GET'){
   const url=new URL(request.url), authority=request.headers.get('host')??url.host;
   let expectedOrigin:string;try{const expected=new URL(url.protocol+'//'+authority);if(expected.host!==authority||expected.username||expected.password||expected.pathname!=='/'||expected.search||expected.hash)return adminError(403);expectedOrigin=expected.origin;}catch{return adminError(403);}
   if(request.headers.get('origin')!==expectedOrigin)return adminError(403);
   if(!['PUT','DELETE'].includes(request.method)){
    if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??''))return adminError(422);
    try{body=JSON.parse(new TextDecoder().decode(await boundedBody(new Response(request.body),16384)));}catch{return adminError(422);}
   }
  }
  const result=await client.request(operation,request.method,params,new URL(request.url).searchParams,body);
  return result.status===204?new Response(null,{status:204,headers:{'cache-control':'no-store'}}):Response.json(result.data,{status:result.status,headers:{'cache-control':'no-store'}});
 }catch(e){return adminError(e instanceof AdminFailure?e.status:422);}
}
function adminError(status:number){return Response.json({error:{code:String(status),message:status===409?'اطلاعات تغییر کرده یا شناسه تکراری است؛ وضعیت را تازه کنید.':status===404?'مورد پیدا نشد.':status===422?'ورودی درخواست معتبر نیست.':status===403?'مبدأ درخواست معتبر نیست.':'ارتباط با سرویس برقرار نشد؛ دوباره تلاش کنید.'}},{status,headers:{'cache-control':'no-store'}});}
