import {test,expect,mock} from 'bun:test';
mock.module('server-only',()=>({}));
const {createAdminClient:realClient,adminHandler:realHandler,summarizeCourse}=await import('../src/lib/admin-api');
const testAuth=async()=>({dev:true,token:'',generation:'dev'});
const createAdminClient=(options:Parameters<typeof realClient>[0]={})=>realClient({...options,authorization:testAuth});
const adminHandler=(...args:Parameters<typeof realHandler>)=>realHandler(args[0],args[1],args[2],args[3],testAuth);

const id=crypto.randomUUID(),courseId='test:Python / فارسی';
const group={id,slug:'test',title:'نمونه',description:'شرح',categoryId:'code',targetLevel:null,isPublished:false,courseCount:0};
test('fixed admin methods/paths, origin/content boundary, response guards and safe conflicts',async()=>{
 let called=0;const seen:RequestInit[]=[];
 const client=createAdminClient({origin:'http://api.test',fetcher:(async(url,init)=>{called++;seen.push(init!);expect(String(url)).toContain('/api/v1/manage/');return Response.json({items:[group],total:1,limit:20,offset:0});})});
 expect((await adminHandler(new Request('http://localhost/api/admin/groups'),'groups',{},client)).status).toBe(200);
 for(const origin of [undefined,'http://foreign.test']){
  expect((await adminHandler(new Request('http://localhost/api/admin/groups',{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(group)}),'groups',{},client)).status).toBe(403);
 }
 expect(called).toBe(1);expect(seen[0]).toMatchObject({cache:'no-store',redirect:'error'});
 for(const path of ['url=http://evil','q=x&q=y','limit=101'])expect((await adminHandler(new Request('http://localhost/api/admin/groups?'+path),'groups',{},client)).status).toBe(422);
 await expect(client.request('membership','POST',{id,courseId})).rejects.toMatchObject({status:422});
 await expect(client.request('course','GET',{courseId:'../manage'})).rejects.toMatchObject({status:422});
 for(const response of [new Response('secret SQL',{status:500}),new Response('secret conflict',{status:409}),Response.json({items:[]}),new Response('broken',{headers:{'content-type':'application/json'}}),new Response('{}',{headers:{'content-type':'text/html'}}),new Response('{}',{headers:{'content-type':'application/json','content-length':'2097153'}})]){
  const bad=createAdminClient({fetcher:(async()=>response)});const result=await adminHandler(new Request('http://localhost/api/admin/groups'),'groups',{},bad);expect([409,503]).toContain(result.status);expect(await result.text()).not.toContain('secret');
 }
 const jsonRequest=new Request('http://localhost/api/admin/groups',{method:'POST',headers:{origin:'http://localhost','content-type':'text/plain'},body:'{}'});expect((await adminHandler(jsonRequest,'groups',{},client)).status).toBe(422);
 const timeout=createAdminClient({deadlineMs:5,fetcher:((_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('private')))))});await expect(timeout.request('groups','GET')).rejects.toMatchObject({status:503});
});
test('inspection keeps minimal and unready courses while removing evidence and diagnostics',()=>{
 const reference={id:courseId,providerId:'test',providerCourseId:'Python / فارسی',title:'پایتون',sourceUrl:'https://example.com'};
 expect(summarizeCourse({reference,snapshot:null,presentationReady:false})).toMatchObject({reference,checkedAt:null,prices:[],description:null});
 const summary=summarizeCourse({reference,presentationReady:false,snapshot:{courseId,thumbnail:{status:'failed',failureCode:'private'},payload:{providerId:'test',title:'پایتون',source:{checkedAt:new Date().toISOString()},description:{data:'شرح'},raw:{data:{secret:'private'}},pricing:{data:[]}}}});
 expect(summary.thumbnailStatus).toBe('failed');expect(summary.description).toBe('شرح');expect(JSON.stringify(summary)).not.toContain('private');
});
test('same-origin uses request authority when Next development URL has an internal host',async()=>{
 const client=createAdminClient({fetcher:async()=>Response.json(group,{status:201})});
 const make=(origin:string)=>new Request('http://localhost:3100/api/admin/groups',{method:'POST',headers:{host:'127.0.0.1:3100',origin,'content-type':'application/json'},body:JSON.stringify({slug:'test',title:'نمونه',description:'شرح',categoryId:'code'})});
 expect((await adminHandler(make('http://127.0.0.1:3100'),'groups',{},client)).status).toBe(201);
 expect((await adminHandler(make('http://foreign.test'),'groups',{},client)).status).toBe(403);
});
test('inspection exposes only ready retained thumbnail UUIDs for the existing image handler',()=>{
 const reference={id:courseId,providerId:'test',providerCourseId:'Python / فارسی',title:'پایتون',sourceUrl:'https://example.com'};
 const value={reference,presentationReady:true,snapshot:{courseId,thumbnail:{status:'ready',asset:{id,url:'https://private.example/secret'}},payload:{providerId:'test',title:'پایتون',source:{checkedAt:new Date().toISOString()}}}};
 const summary=summarizeCourse(value);expect(summary.thumbnailAssetId).toBe(id);expect(JSON.stringify(summary)).not.toContain('private.example');
 expect(summarizeCourse({...value,snapshot:{...value.snapshot,thumbnail:{status:'failed',asset:{id}}}}).thumbnailAssetId).toBeNull();
 expect(summarizeCourse({...value,snapshot:{...value.snapshot,thumbnail:{status:'ready',asset:{id:'../../private'}}}}).thumbnailAssetId).toBeNull();
});
