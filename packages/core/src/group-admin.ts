import type { CourseGroup, CourseReference, Page } from './index';
import { categoryRegistry, targetLevels, type CategoryId } from './categories';
import { validCourseId, uuidPattern, type PublicSchema } from './public-courses';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReviewAction = 'approve' | 'reject' | 'reopen';
export interface SuggestionInput { courseId:string; systemId:string; systemName:string; submissionId:string; confidencePercent:number }
export interface PairReview { groupId:string; courseId:string; status:ReviewStatus; version:number; selectedSuggestionId:string|null; origin:'manual'|'suggestion'|null; decidedAt:string|null }
export interface GroupSuggestion extends SuggestionInput { id:string; groupId:string; receivedAt:string; course:CourseReference; review:PairReview }
export interface MemberReview { course:CourseReference; review:PairReview; suggestion:GroupSuggestion|null }
export interface ReviewTransition { id:string; groupId:string; courseId:string; fromVersion:number; toVersion:number; action:ReviewAction|'manual-add'|'manual-remove'|'baseline'; suggestionId:string|null; occurredAt:string; outcome:PairReview }
export interface ReviewOutcome { review:PairReview; membership:boolean }
export type AdminQuery = { limit:number; offset:number; q?:string; category?:CategoryId; isPublished?:boolean; status?:ReviewStatus };
export const isUuid = (v:unknown):v is string => typeof v === 'string' && new RegExp(uuidPattern).test(v);
const text = (v:unknown,max:number):v is string => typeof v === 'string' && v.length <= max && !!v.trim() && !/[\u0000-\u001f]/u.test(v);
const identity = (v:unknown,max:number):v is string => text(v,max) && v === v.trim();
const obj = (v:unknown):v is Record<string,unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export function parseSuggestionInput(value:unknown):SuggestionInput {
  if(!obj(value) || Object.keys(value).some(k=>!['courseId','systemId','systemName','submissionId','confidencePercent'].includes(k)))throw new Error('Invalid submission');
  const v = Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v === 'string' ? v.trim() : v]));
  if(typeof v.courseId !== 'string' || !validCourseId(v.courseId) || !identity(v.systemId,100) || !identity(v.submissionId,200) || !text(v.systemName,200) || typeof v.confidencePercent !== 'number' || !Number.isFinite(v.confidencePercent) || v.confidencePercent < 0 || v.confidencePercent > 100)throw new Error('Invalid submission');
  return v as unknown as SuggestionInput;
}
export function isReviewVersion(v:unknown):v is number { return Number.isSafeInteger(v) && Number(v)>=0 && Number(v)<2147483647; }
export function parseAdminQuery(params:URLSearchParams, kind:'groups'|'courses'|'suggestions'|'page'='page'):AdminQuery {
  const allowed=['limit','offset',...(kind==='groups'?['q','category','isPublished']:kind==='courses'?['q']:kind==='suggestions'?['status']:[])];
  for(const k of params.keys())if(!allowed.includes(k) || params.getAll(k).length!==1)throw new Error('Invalid query');
  const integer=(k:string,f:number,min:number,max:number)=>{const s=params.get(k);const n=s===null?f:Number(s);if(s!==null&&!/^\d+$/.test(s)||!Number.isSafeInteger(n)||n<min||n>max)throw new Error('Invalid query');return n;};
  const result:AdminQuery={limit:integer('limit',20,1,100),offset:integer('offset',0,0,2147483647)};
  if(params.has('q')) { if(params.get('q')!.length>200)throw new Error('Invalid query');result.q=params.get('q')!; }
  if(params.has('category')) {const c=params.get('category');if(!categoryRegistry.some(x=>x.id===c))throw new Error('Invalid query');result.category=c as CategoryId;}
  if(params.has('isPublished')) {const v=params.get('isPublished');if(!['true','false'].includes(v!))throw new Error('Invalid query');result.isPublished=v==='true';}
  if(kind==='suggestions') {const s=params.get('status')??'pending';if(!['pending','approved','rejected'].includes(s))throw new Error('Invalid query');result.status=s as ReviewStatus;}
  return result;
}
export function isCourseReference(v:unknown):v is CourseReference {return obj(v)&&keys(v,['id','providerId','providerCourseId','title','sourceUrl'])&&typeof v.id==='string'&&validCourseId(v.id)&&identity(v.providerId,64)&&identity(v.providerCourseId,200)&&v.id===`${v.providerId}:${v.providerCourseId}`&&text(v.title,300)&&safeUrl(v.sourceUrl);}
export function safeUrl(v:unknown):v is string {try{if(typeof v!=='string'||v.length>2048||/\s/.test(v))return false;const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}
export function isCourseGroup(v:unknown):v is CourseGroup {return obj(v)&&keys(v,['id','slug','title','description','categoryId','targetLevel','isPublished','courseCount','courses'])&&isUuid(v.id)&&typeof v.slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)&&v.slug.length<=100&&text(v.title,300)&&text(v.description,2000)&&categoryRegistry.some(c=>c.id===v.categoryId)&&(v.targetLevel===null||targetLevels.includes(v.targetLevel as never))&&typeof v.isPublished==='boolean'&&Number.isSafeInteger(v.courseCount)&&Number(v.courseCount)>=0&&(!('courses' in v)||isAdminPage(v.courses,isCourseReference));}
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
export function isPairReview(v:unknown):v is PairReview {return obj(v)&&keys(v,['groupId','courseId','status','version','selectedSuggestionId','origin','decidedAt'])&&isUuid(v.groupId)&&typeof v.courseId==='string'&&validCourseId(v.courseId)&&['pending','approved','rejected'].includes(String(v.status))&&isReviewVersion(v.version)&&(v.selectedSuggestionId===null||isUuid(v.selectedSuggestionId))&&[null,'manual','suggestion'].includes(v.origin as never)&&(v.decidedAt===null||date(v.decidedAt))&&(v.origin!=='suggestion'||isUuid(v.selectedSuggestionId));}
export function isGroupSuggestion(v:unknown):v is GroupSuggestion {if(!obj(v)||!keys(v,['id','groupId','courseId','systemId','systemName','submissionId','confidencePercent','receivedAt','course','review']))return false;try{parseSuggestionInput({courseId:v.courseId,systemId:v.systemId,systemName:v.systemName,submissionId:v.submissionId,confidencePercent:v.confidencePercent});}catch{return false;}return isUuid(v.id)&&isUuid(v.groupId)&&date(v.receivedAt)&&isCourseReference(v.course)&&isPairReview(v.review)&&v.course.id===v.courseId&&v.review.courseId===v.courseId&&v.review.groupId===v.groupId;}
export function isMemberReview(v:unknown):v is MemberReview {return obj(v)&&keys(v,['course','review','suggestion'])&&isCourseReference(v.course)&&isPairReview(v.review)&&v.review.status==='approved'&&v.course.id===v.review.courseId&&(v.suggestion===null?v.review.origin==='manual':isGroupSuggestion(v.suggestion)&&v.suggestion.id===v.review.selectedSuggestionId);}
export function isReviewOutcome(v:unknown):v is ReviewOutcome {return obj(v)&&keys(v,['review','membership'])&&isPairReview(v.review)&&typeof v.membership==='boolean'&&v.membership===(v.review.status==='approved');}
export function isReviewTransition(v:unknown):v is ReviewTransition {return obj(v)&&isUuid(v.id)&&isUuid(v.groupId)&&typeof v.courseId==='string'&&validCourseId(v.courseId)&&isReviewVersion(v.fromVersion)&&isReviewVersion(v.toVersion)&&['approve','reject','reopen','manual-add','manual-remove','baseline'].includes(String(v.action))&&(v.suggestionId===null||isUuid(v.suggestionId))&&date(v.occurredAt)&&isPairReview(v.outcome)&&v.outcome.version===v.toVersion;}
export function isAdminPage<T>(v:unknown,guard:(v:unknown)=>v is T):v is Page<T> {return obj(v)&&keys(v,['items','total','limit','offset'])&&Array.isArray(v.items)&&v.items.every(guard)&&Number.isSafeInteger(v.total)&&Number(v.total)>=0&&Number.isInteger(v.limit)&&Number(v.limit)>=1&&Number(v.limit)<=100&&Number.isSafeInteger(v.offset)&&Number(v.offset)>=0&&v.items.length===Math.min(Number(v.limit),Math.max(0,Number(v.total)-Number(v.offset)));}
// Browser-safe schema used by management OpenAPI and response validation.
export const suggestionInputSchema:PublicSchema={type:'object',additionalProperties:false,required:['courseId','systemId','systemName','submissionId','confidencePercent'],properties:{courseId:{type:'string',minLength:1,maxLength:265},systemId:{type:'string',minLength:1,maxLength:100,pattern:'\\S'},systemName:{type:'string',minLength:1,maxLength:200,pattern:'\\S'},submissionId:{type:'string',minLength:1,maxLength:200,pattern:'\\S'},confidencePercent:{type:'number',minimum:0,maximum:100}}};
export interface AdminCourseSummary {reference:CourseReference;presentationReady:boolean;checkedAt:string|null;thumbnailStatus:'missing'|'pending'|'failed'|'ready'|null;description:string|null;contentMinutes:number|null;instructors:string[];syllabus:string[];prices:string[]}
export function isAdminCourseSummary(v:unknown):v is AdminCourseSummary {return obj(v)&&isCourseReference(v.reference)&&typeof v.presentationReady==='boolean'&&(v.checkedAt===null||date(v.checkedAt))&&[null,'missing','pending','failed','ready'].includes(v.thumbnailStatus as never)&&(v.description===null||typeof v.description==='string'&&v.description.length<=4000)&&(v.contentMinutes===null||typeof v.contentMinutes==='number'&&Number.isFinite(v.contentMinutes)&&v.contentMinutes>=0)&&['instructors','syllabus','prices'].every(k=>Array.isArray(v[k])&&(v[k] as unknown[]).length<=50&&(v[k] as unknown[]).every(x=>typeof x==='string'&&x.length<=500));}
