import { test, expect, mock } from 'bun:test';
mock.module('server-only',()=>({}));
const { createCourseClient, apiOrigin, courseListHandler, courseDetailHandler }=await import('../src/lib/course-api');
import { example } from '../../../packages/core/tests/fixtures';
import { parseCourseQuery } from '@dorob/core';
const c=example(), { description,syllabus,offers,...item }=c;void description;void syllabus;void offers;
const page={ items:[item],total:1,limit:18,offset:0 };
test('validated origin, fixed paths, uncached requests and safe upstream failures',async()=> {
  for(const origin of ['https://user:secret@api.test','file:///tmp/x','https://api.test/path','https://api.test/?x=1','https://api.test/#x']) expect(()=>apiOrigin(origin)).toThrow();
  const seen: {url:string;init:RequestInit|undefined}[]=[];
  const client=createCourseClient({ origin:'http://api.test:3456',fetcher:(async(url,init)=>{seen.push({url:String(url),init});return Response.json(String(url).includes('?') ? page : c);}) });
  expect((await courseListHandler(new Request('http://web.test/api/courses?q=Python'),client)).status).toBe(200);
  expect((await courseDetailHandler(c.id,client)).status).toBe(200);expect(seen[1].url).toBe('http://api.test:3456/api/v1/courses/'+encodeURIComponent(c.id));
  expect(seen[0].init).toMatchObject({ cache:'no-store',redirect:'error',headers:{ accept:'application/json' } });
  for(const query of ['url=https://evil.test','offset=-1','q=x&q=y'])expect((await courseListHandler(new Request('http://web.test/api/courses?'+query),client)).status).toBe(422);
  expect((await courseDetailHandler('../manage/groups',client)).status).toBe(422);
  for(const response of [new Response('secret sql',{status:500}),Response.json({items:[]}),new Response('{}',{headers:{'content-type':'text/html'}}),new Response('{broken',{headers:{'content-type':'application/json'}})]) {
    const bad=createCourseClient({fetcher:(async()=>response)});expect(await bad.list(parseCourseQuery(new URLSearchParams()))).toMatchObject({ok:false,error:{code:'unavailable'}});
  }
  const timeout=createCourseClient({deadlineMs:10,fetcher:((_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('private timeout')))))});
  expect(await timeout.detail(c.id)).toMatchObject({ok:false,error:{code:'unavailable'}});
});
test('bounded hosted WebP, cache/ETag forwarding, conditional response and safe invalid image handling',async()=> {
  const id=c.thumbnail.id, etag='"'+'a'.repeat(64)+'"';let conditional='';
  const bytes=new TextEncoder().encode('RIFF0000WEBPtest');
  const client=createCourseClient({fetcher:(async(_url,init)=>{ conditional=new Headers(init?.headers).get('if-none-match') ?? '';return conditional ? new Response(null,{status:304,headers:{etag,'cache-control':'public, max-age=31536000, immutable'}}) : new Response(bytes,{headers:{etag,'content-type':'image/webp','cache-control':'public, max-age=31536000, immutable'}});})});
  const image=await client.image(id);expect(image.status).toBe(200);expect(new Uint8Array(await image.arrayBuffer())).toEqual(bytes);expect(image.headers.get('etag')).toBe(etag);expect(image.headers.get('cache-control')).toContain('immutable');
  expect((await client.image(id,etag)).status).toBe(304);expect(conditional).toBe(etag);expect((await client.image('../../private')).status).toBe(422);
  for(const response of [new Response('bad',{headers:{'content-type':'image/webp'}}),new Response(bytes,{headers:{'content-type':'text/html'}}),new Response(bytes,{headers:{'content-type':'image/webp','content-length':'524289'}}),new Response(new Uint8Array(524289),{headers:{'content-type':'image/webp'}})]) {
    expect((await createCourseClient({fetcher:(async()=>response)}).image(id)).status).toBe(503);
  }
});
test('native upstream deadline covers headers and response body',async()=>{
  const upstream=Bun.serve({hostname:'127.0.0.1',port:0,fetch(request){
    if(new URL(request.url).pathname.endsWith('slow-headers'))return new Promise<Response>(resolve=>setTimeout(()=>resolve(Response.json(c)),100));
    return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));setTimeout(()=>{try{controller.enqueue(new TextEncoder().encode('}'));controller.close();}catch{}},100);}}),{headers:{'content-type':'application/json'}});
  }});
  try {
    const client=createCourseClient({origin:`http://127.0.0.1:${upstream.port}`,deadlineMs:20});
    for(const id of ['example:slow-headers','example:slow-body']) {const started=Date.now();expect(await client.detail(id)).toMatchObject({ok:false,error:{code:'unavailable'}});expect(Date.now()-started).toBeLessThan(250);}
  }finally{upstream.stop(true);}
});
test('browser boundary rejects invalid content/identity/page responses without fixture substitution',async()=>{
  const { browserCourses }=await import('../src/lib/browser-courses');const saved=globalThis.fetch;
  try {
    for(const response of [Response.json({items:[],total:99,limit:18,offset:0}),new Response('{}',{headers:{'content-type':'text/html'}}),Response.json({...c,id:'example:someone-else'}),new Response('private-secret',{status:503})]) {
      globalThis.fetch=(async()=>response) as unknown as typeof fetch;
      const result=await browserCourses.detail(c.id,new AbortController().signal);expect(result.ok).toBe(false);expect(JSON.stringify(result)).not.toContain('private-secret');
    }
    globalThis.fetch=(async()=>Response.json({...page,offset:18})) as unknown as typeof fetch;
    expect((await browserCourses.list(parseCourseQuery(new URLSearchParams()),new AbortController().signal)).ok).toBe(false);
  }finally{globalThis.fetch=saved;}
});

test('new filters survive server and browser serialization; malformed filters fail safely',async()=>{
  let received='';
  const query=parseCourseQuery(new URLSearchParams('provider=roocket&priceStatus=paid&duration=3-to-10h'));
  const client=createCourseClient({origin:'http://api.test',fetcher:async url=>{received=String(url);return Response.json(page);}});
  expect((await courseListHandler(new Request('http://web.test/api/courses?provider=roocket&priceStatus=paid&duration=3-to-10h'),client)).status).toBe(200);
  for(const [key,value] of Object.entries({provider:'roocket',priceStatus:'paid',duration:'3-to-10h'}))expect(new URL(received).searchParams.get(key)).toBe(value);
  for(const q of ['provider=bad','duration=bad','priceStatus=paid&priceStatus=free','freeOnly=true&priceStatus=unknown'])expect((await courseListHandler(new Request('http://web.test/api/courses?'+q),client)).status).toBe(422);
  const saved=globalThis.fetch;
  try{
    const {browserCourses}=await import('../src/lib/browser-courses');
    globalThis.fetch=(async url=>{received=String(url);return Response.json(page);}) as typeof fetch;
    expect((await browserCourses.list(query,new AbortController().signal)).ok).toBe(true);
    expect(received).toStartWith('/api/courses?');
    expect(received).toContain('provider=roocket');expect(received).toContain('priceStatus=paid');expect(received).toContain('duration=3-to-10h');
  }finally{globalThis.fetch=saved;}
});
