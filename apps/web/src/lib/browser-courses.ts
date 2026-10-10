import { isPublicCourseDetail,isPublicCoursePage,type CourseQuery,type PublicCourse,type PublicCourseDetail,type Page } from '@dorob/core';
import { courseQueryString, failure,type CourseResult } from './course-result';
async function request<T>(path:string,validate:(value:unknown)=>value is T,signal:AbortSignal):Promise<CourseResult<T>> {
  try {
    const response=await fetch(path,{ signal,cache:'no-store',headers:{ accept:'application/json' } });
    if(!response.ok)return failure(response.status===404?'not_found':'unavailable');
    if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? ''))return failure('unavailable');
    const value=await response.json();return validate(value)?{ok:true,data:value}:failure('unavailable');
  }catch{return failure('unavailable');}
}
export const browserCourses={
  list:(query:CourseQuery,signal:AbortSignal)=>request<Page<PublicCourse>>('/api/courses?'+courseQueryString(query),(v):v is Page<PublicCourse>=>isPublicCoursePage(v)&&v.limit===query.limit&&v.offset===query.offset,signal),
  detail:(id:string,signal:AbortSignal)=>request<PublicCourseDetail>('/api/courses/'+encodeURIComponent(id),(v):v is PublicCourseDetail=>isPublicCourseDetail(v)&&v.id===id,signal),
};
