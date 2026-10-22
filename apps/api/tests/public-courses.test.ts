import { test, expect } from 'bun:test';
import { createApp } from '../src/app';
import { CatalogError } from '../src/catalog';
import { rich } from '../src/ingestion-examples';
import { presentCourse } from '../src/public-course-projection';
import type { CourseSnapshot, PublicCourseDetail } from '@dorob/core';
const health={ ready:async()=>true,close:async()=>{} };
const payload=rich();payload.providerCourseId='opaque/آموزش:1';
const assetId=crypto.randomUUID();
const c=presentCourse({ id:crypto.randomUUID(),courseId:`example:${payload.providerCourseId}`,payload,thumbnail:{ asset:{ id:assetId,url:`/assets/thumbnails/${assetId}`,width:128,height:64 } } } as CourseSnapshot,[]);
const { description,syllabus,offers,...item }=c;void description;void syllabus;void offers;
test('public encoded IDs, safe input/missing/unavailable responses and OpenAPI',async()=> {
  const app=createApp(health,undefined,{ publicCourses:{ list:async q=>({ items:[item],total:1,limit:q.limit,offset:q.offset }),detail:async id=>{ if(id===c.id)return c;throw new CatalogError(404); } } });
  const call=async(path:string)=>app.handle(new Request(`http://localhost${path}`));
  expect((await call(`/api/v1/courses/${encodeURIComponent(c.id)}`)).status).toBe(200);
  for(const q of ['provider=bad','duration=bad','priceStatus=free&priceStatus=paid','freeOnly=true&priceStatus=paid','category=bad','limit=101','offset=-1','freeOnly=1','q='+ 'a'.repeat(201),'limit=1.5','upstream=private-secret']) {const r=await call('/api/v1/courses?'+q);expect(r.status).toBe(422);expect(await r.text()).not.toContain('private-secret');}
  expect((await call('/api/v1/courses/example:missing')).status).toBe(404);expect((await call('/api/v1/courses/bad')).status).toBe(422);
  const unavailable=createApp(health,undefined,{ publicCourses:{ list:async()=>{throw new Error('SQL password private-secret');},detail:async()=>({raw:'private-secret'} as unknown as PublicCourseDetail) } });
  for(const path of ['/api/v1/courses','/api/v1/courses/example:bad']) {const r=await unavailable.handle(new Request('http://localhost'+path));expect(r.status).toBe(503);expect(await r.text()).not.toMatch(/SQL|private-secret/);}
  const spec=await (await call('/docs/json')).json();for(const path of ['/api/v1/courses','/api/v1/courses/{courseId}'])for(const code of ['200','404','422','503'])expect(spec.paths[path].get.responses[code]).toBeDefined();
});
