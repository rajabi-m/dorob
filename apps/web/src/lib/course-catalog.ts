import {parseCourseQuery,type CourseQuery,courseProviders,coursePriceStatuses,courseDurations} from '@dorob/core';

export type CourseCatalogState=Pick<CourseQuery,'provider'|'priceStatus'|'duration'> & {q?:string;page:number};
export const courseCatalogPageSize=18;
const keys=['q','provider','priceStatus','duration','page'] as const;
export const priceLabels:Record<typeof coursePriceStatuses[number],string>={free:'رایگان',paid:'خرید دوره',subscription:'اشتراکی',unknown:'قیمت نامشخص'};
export const durationLabels:Record<typeof courseDurations[number],string>={'under-3h':'کمتر از ۳ ساعت','3-to-10h':'۳ تا کمتر از ۱۰ ساعت','10h-plus':'۱۰ ساعت و بیشتر'};
// Normalize search only for an empty-input check; source text stays intact. rtl-ignore
const hasSearch=(q:string)=>q.normalize('NFKC').replace(/\u200c/g,' ').trim().length>0;
export function parseCourseCatalogState(params:Record<string,string|string[]|undefined>):CourseCatalogState {
  const list=new URLSearchParams();
  for(const key of keys){const value=params[key];if(Array.isArray(value))throw new Error('Repeated selection');if(value!==undefined&&key!=='page')list.set(key,value);}
  const raw=params.page??'1';
  if(typeof raw!=='string'||!/^\d+$/.test(raw))throw new Error('Invalid page');
  const page=Number(raw),offset=(page-1)*courseCatalogPageSize;
  if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(offset)||offset>2147483647)throw new Error('Invalid page');
  const {q,provider,priceStatus,duration}=parseCourseQuery(list);
  return {page,...(hasSearch(q)?{q:q.trim()}:{}),...(provider?{provider}:{}),...(priceStatus?{priceStatus}:{}),...(duration?{duration}:{})};
}
export function courseCatalogHref(state:CourseCatalogState){
  const params=new URLSearchParams();
  if(state.q&&hasSearch(state.q))params.set('q',state.q.trim());
  for(const key of ['provider','priceStatus','duration'] as const)if(state[key])params.set(key,state[key]!);
  if(state.page>1)params.set('page',String(state.page));
  return '/courses'+(params.size?'?'+params.toString():'');
}
export const courseCatalogQuery=(state:CourseCatalogState):CourseQuery=>({q:state.q??'',freeOnly:false,limit:courseCatalogPageSize,offset:(state.page-1)*courseCatalogPageSize,...(state.provider?{provider:state.provider}:{}),...(state.priceStatus?{priceStatus:state.priceStatus}:{}),...(state.duration?{duration:state.duration}:{})});
export const lastCoursePage=(total:number)=>Math.max(1,Math.ceil(total/courseCatalogPageSize));
export function courseConditionLabels(state:CourseCatalogState){return {
  q:state.q,
  provider:courseProviders.find(p=>p.id===state.provider)?.name,
  priceStatus:state.priceStatus?priceLabels[state.priceStatus]:undefined,
  duration:state.duration?durationLabels[state.duration]:undefined,
};}
