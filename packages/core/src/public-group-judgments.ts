/** Public presentation only. Management evidence and attribution never cross this boundary. */
import { categoryRegistry, type CategoryId } from './categories';
import type { Page } from './index';
import { conformsJudgmentSchema, judgmentContentSchema, type JudgmentContentV1, type JudgmentSchema } from './group-judgments';
import { publicCourseDetailSchema, isPublicCourseDetail, uuidPattern, type PublicCourse, type PublicOffer } from './public-courses';
export type GroupPageQuery = { limit:number; offset:number; judgmentId?:string };
export type GroupListQuery = { limit:number; offset:number; q?:string; category?:CategoryId };
export type AssessedCourse = { course:PublicCourse & {offers:PublicOffer[]|null;rating:{value:number;scale:number;count:number|null}|null}; assessment:Omit<JudgmentContentV1['courses'][number],'courseId'> };
export interface PublicJudgedGroup {
 id:string;slug:string;categoryId:CategoryId;hero:JudgmentContentV1['hero'];courseCount:number;
 providers:PublicCourse['provider'][];covers:{courseId:string;title:string;thumbnail:PublicCourse['thumbnail']}[];
 judgmentId:string;judgedAt:string;
}
export interface PublicJudgedGroupDetail extends Omit<PublicJudgedGroup,'covers'> { courses:Page<AssessedCourse> }
export const validGroupSlug=(v:string)=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)&&v.length<=100;
export function parseGroupPageQuery(params:URLSearchParams,detail=false):GroupPageQuery {
 const allowed=['limit','offset',...(detail?['judgmentId']:[])];
 for(const k of params.keys())if(!allowed.includes(k)||params.getAll(k).length!==1)throw new Error('Invalid query');
 const integer=(k:string,d:number,max:number)=>{const s=params.get(k);if(s!==null&&!/^\d+$/.test(s))throw new Error('Invalid query');const n=s===null?d:Number(s);if(!Number.isSafeInteger(n)||n<(k==='limit'?1:0)||n>max)throw new Error('Invalid query');return n;};
 const judgmentId=params.get('judgmentId');if(judgmentId!==null&&!new RegExp(uuidPattern).test(judgmentId))throw new Error('Invalid pin');
 return {limit:integer('limit',detail?20:12,100),offset:integer('offset',0,2147483647),...(judgmentId?{judgmentId}:{})};
}
/** List filters are deliberately separate from detail judgment pins. */
export function parseGroupListQuery(params:URLSearchParams):GroupListQuery {
 const paging=new URLSearchParams();
 for(const key of params.keys()) {
  if(!['limit','offset','q','category'].includes(key)||params.getAll(key).length!==1)throw new Error('Invalid query');
  if(key==='limit'||key==='offset')paging.set(key,params.get(key)!);
 }
 const result:GroupListQuery=parseGroupPageQuery(paging);
 if(params.has('q')) {const q=params.get('q')!;if(q.length>200)throw new Error('Invalid search');result.q=q;}
 if(params.has('category')) {const category=params.get('category');if(!categoryRegistry.some(c=>c.id===category))throw new Error('Invalid category');result.category=category as CategoryId;}
 return result;
}
export const normalizeGroupSearch=(value:string)=>value.normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase('fa-IR'); // rtl-ignore
export function matchesGroupSearch(group:Pick<PublicJudgedGroup,'hero'|'categoryId'>,query:Pick<GroupListQuery,'q'|'category'>):boolean {
 const search=normalizeGroupSearch(query.q??'');
 return (!query.category||group.categoryId===query.category)&&(!search||[group.hero.title,group.hero.subtitle,group.hero.description].some(text=>normalizeGroupSearch(text).includes(search)));
}
const object=(properties:Record<string,JudgmentSchema>):JudgmentSchema=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const str:JudgmentSchema={type:'string',minLength:1};const uuid={...str,pattern:uuidPattern};
const array=(items:JudgmentSchema,maxItems?:number):JudgmentSchema=>({type:'array',items,...(maxItems===undefined?{}:{maxItems})});
const int=(minimum=0,maximum=Number.MAX_SAFE_INTEGER):JudgmentSchema=>({type:'integer',minimum,maximum});
const nullable=(s:JudgmentSchema):JudgmentSchema=>({anyOf:[s,{type:'null'}]});
const page=(s:JudgmentSchema)=>object({items:array(s),total:int(),limit:int(1,100),offset:int(0,2147483647)});
const fields={id:uuid,slug:{...str,maxLength:100,pattern:'^[a-z0-9]+(?:-[a-z0-9]+)*$'},categoryId:{enum:categoryRegistry.map(c=>c.id)},hero:judgmentContentSchema.properties!.hero,courseCount:int(2),providers:array(publicCourseDetailSchema.properties!.provider),judgmentId:uuid,judgedAt:str};
export const publicJudgedGroupSchema=object({...fields,covers:array(object({courseId:publicCourseDetailSchema.properties!.id,title:publicCourseDetailSchema.properties!.title,thumbnail:publicCourseDetailSchema.properties!.thumbnail}),3)});
const {description:_description,syllabus:_syllabus,...courseFields}=publicCourseDetailSchema.properties!;void _description;void _syllabus;
const rating=nullable(object({value:{type:'number',minimum:0},scale:{type:'number',minimum:0},count:nullable(int())}));
const assessmentProperties={...judgmentContentSchema.properties!.courses.items!.properties!};delete assessmentProperties.courseId;
export const assessedCourseSchema=object({course:object({...courseFields,rating}),assessment:object(assessmentProperties)});
export const publicJudgedGroupPageSchema=page(publicJudgedGroupSchema);
export const publicJudgedGroupDetailSchema=object({...fields,courses:page(assessedCourseSchema)});
const date=(v:string)=>/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
const pageValid=<T>(p:Page<T>)=>p.items.length===Math.min(p.limit,Math.max(0,p.total-p.offset));
function summaryValid(g:Omit<PublicJudgedGroup,'covers'>){return date(g.judgedAt)&&g.providers.length>0&&g.providers.length<=g.courseCount&&new Set(g.providers.map(p=>p.id)).size===g.providers.length;}
export function isPublicJudgedGroupPage(v:unknown):v is Page<PublicJudgedGroup>{
 if(!conformsJudgmentSchema(publicJudgedGroupPageSchema,v))return false;
 const p=v as Page<PublicJudgedGroup>;
 return pageValid(p)&&new Set(p.items.map(g=>g.id)).size===p.items.length&&p.items.every(g=>summaryValid(g)&&g.covers.length===Math.min(3,g.courseCount)&&new Set(g.covers.map(c=>c.courseId)).size===g.covers.length&&g.covers.every(c=>c.thumbnail.path===`/assets/thumbnails/${c.thumbnail.id}`));
}
export function isPublicJudgedGroupDetail(v:unknown):v is PublicJudgedGroupDetail{
 if(!conformsJudgmentSchema(publicJudgedGroupDetailSchema,v))return false;
 const g=v as PublicJudgedGroupDetail;
 return summaryValid(g)&&g.courses.total===g.courseCount&&pageValid(g.courses)&&new Set(g.courses.items.map(c=>c.course.id)).size===g.courses.items.length&&g.courses.items.every(({course})=>{
 const {rating,...c}=course;
 return isPublicCourseDetail({...c,description:null,syllabus:null})&&(!rating||(rating.scale>0&&rating.value<=rating.scale));
 });
}
