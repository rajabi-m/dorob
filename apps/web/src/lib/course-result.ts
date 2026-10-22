import type { CourseQuery } from '@dorob/core';
export type CourseFailure = { code:'unavailable' | 'not_found' | 'invalid_input'; message:string };
export type CourseResult<T> = { ok:true; data:T } | { ok:false; error:CourseFailure };
export const failure = (code: CourseFailure['code']): CourseResult<never> => ({ ok:false,error:{ code,message:code === 'not_found' ? 'جزئیات این دوره در دسترس نیست.' : code === 'invalid_input' ? 'انتخاب جست‌وجو معتبر نیست.' : 'دریافت دوره‌ها ممکن نشد. دوباره تلاش کن.' } });
export function courseQueryString(q: CourseQuery) {
  const params=new URLSearchParams({ q:q.q,freeOnly:String(q.freeOnly),limit:String(q.limit),offset:String(q.offset) });
  if(q.category) params.set('category',q.category);
  if(q.provider) params.set('provider',q.provider);
  if(q.priceStatus) params.set('priceStatus',q.priceStatus);
  if(q.duration) params.set('duration',q.duration);
  return params.toString();
}
