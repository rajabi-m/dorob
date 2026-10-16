import 'server-only';
import { isPublicCoursePage, isPublicCourseDetail, parseCourseQuery, validCourseId, uuidPattern, type CourseQuery, type PublicCourse, type PublicCourseDetail, type Page } from '@dorob/core';
import { failure, courseQueryString, type CourseResult } from './course-result';
export function apiOrigin(value=process.env.DOROB_API_URL ?? 'http://127.0.0.1:3001') {
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid API origin');
  return url.origin;
}
export async function boundedBody(response: Response, maximum: number) {
  const length=response.headers.get('content-length'); if(length !== null && (!/^\d+$/.test(length) || Number(length)>maximum)) { await response.body?.cancel(); throw new Error('Invalid response'); }
  const reader=response.body?.getReader(); if(!reader) throw new Error('Empty response');
  const chunks: Uint8Array[]=[];let size=0;
  try { while(true) { const { value,done }=await reader.read();if(done)break;size+=value.length;if(size>maximum)throw new Error('Response limit');chunks.push(value); } }
  finally { await reader.cancel().catch(()=>{}); }
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export function createCourseClient(options: { origin?:string; fetcher?:(url:string,init?:RequestInit)=>Promise<Response>; deadlineMs?:number } = {}) {
  const fetcher=options.fetcher ?? fetch;
  async function request<T>(path: string, validate: (value:unknown)=>value is T): Promise<CourseResult<T>> {
    const signal=AbortSignal.timeout(options.deadlineMs ?? 5000);
    try {
      const origin=apiOrigin(options.origin);
      const response=await fetcher(origin+path,{ cache:'no-store',redirect:'error',headers:{ accept:'application/json' },signal });
      if(!response.ok) { await response.body?.cancel();return failure(response.status === 404 ? 'not_found' : response.status === 422 ? 'invalid_input' : 'unavailable'); }
      if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {await response.body?.cancel();return failure('unavailable');}
      const value=JSON.parse(new TextDecoder().decode(await boundedBody(response,2*1024*1024)));
      return validate(value) ? { ok:true,data:value } : failure('unavailable');
    } catch { return failure('unavailable'); }
  }
  return {
    list(query: CourseQuery): Promise<CourseResult<Page<PublicCourse>>> {
      try { parseCourseQuery(new URLSearchParams(courseQueryString(query))); } catch { return Promise.resolve(failure('invalid_input')); }
      return request('/api/v1/courses?'+courseQueryString(query),(v):v is Page<PublicCourse> => isPublicCoursePage(v) && v.limit === query.limit && v.offset === query.offset);
    },
    detail(id: string) { return validCourseId(id) ? request('/api/v1/courses/'+encodeURIComponent(id),(v):v is PublicCourseDetail => isPublicCourseDetail(v) && v.id === id) : Promise.resolve(failure('invalid_input')); },
    async image(id: string, etag?:string): Promise<Response> {
      if(!new RegExp(uuidPattern).test(id)) return safeResponse(failure('invalid_input'));
      const signal=AbortSignal.timeout(options.deadlineMs ?? 5000);
      try {
        const response=await fetcher(apiOrigin(options.origin)+'/assets/thumbnails/'+id,{ cache:'no-store',redirect:'error',headers:{ accept:'image/webp',...(etag && etag.length <= 256 ? { 'if-none-match':etag } : {}) },signal });
        const headers=new Headers();
        const tag=response.headers.get('etag'); if(tag && tag.length <= 256 && /^"[a-f0-9]{64}"$/.test(tag)) headers.set('etag',tag);
        const cache=response.headers.get('cache-control');if(cache === 'public, max-age=31536000, immutable')headers.set('cache-control',cache);
        headers.set('x-content-type-options','nosniff');
        if(response.status === 304) return new Response(null,{ status:304,headers });
        if(!response.ok) {await response.body?.cancel();return safeResponse(failure(response.status === 404 ? 'not_found' : 'unavailable'));}
        if(response.headers.get('content-type')?.split(';')[0] !== 'image/webp') {await response.body?.cancel();return safeResponse(failure('unavailable'));}
        const bytes=await boundedBody(response,512*1024);
        if(bytes.length<12 || new TextDecoder().decode(bytes.slice(0,4)) !== 'RIFF' || new TextDecoder().decode(bytes.slice(8,12)) !== 'WEBP') return safeResponse(failure('unavailable'));
        headers.set('content-type','image/webp');headers.set('content-length',String(bytes.length));
        return new Response(bytes,{ headers });
      } catch { return safeResponse(failure('unavailable')); }
    },
  };
}
export function safeResponse<T>(result: CourseResult<T>): Response {
  return Response.json(result.ok ? result.data : { error:result.error },{ status:result.ok ? 200 : result.error.code === 'not_found' ? 404 : result.error.code === 'invalid_input' ? 422 : 503,headers:{ 'cache-control':'no-store' } });
}
export async function courseListHandler(request: Request, client=createCourseClient()) {
  try { return safeResponse(await client.list(parseCourseQuery(new URL(request.url).searchParams))); } catch { return safeResponse(failure('invalid_input')); }
}
export async function courseDetailHandler(id: string, client=createCourseClient()) { return safeResponse(await client.detail(id)); }
export type InitialCourses = CourseResult<Page<PublicCourse>>;
export type { PublicCourseDetail };
