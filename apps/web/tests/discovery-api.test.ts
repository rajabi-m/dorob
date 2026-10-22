import {test,expect,mock} from 'bun:test';
mock.module('server-only',()=>({}));
const {createAdminClient:realClient,adminHandler:realHandler}=await import('../src/lib/admin-api');
const testAuth=async()=>({dev:true,token:'',generation:'dev'});
const createAdminClient=(options:Parameters<typeof realClient>[0]={})=>realClient({...options,authorization:testAuth});
const adminHandler=(...args:Parameters<typeof realHandler>)=>realHandler(args[0],args[1],args[2],args[3],testAuth);

const {discoveryTransport}=await import('../src/lib/discovery-transport');
const id='11111111-1111-4111-8111-111111111111';
test('candidate sorting is forwarded with validated paging and invalid sorts never fetch',async()=>{
 const paths:string[]=[];const client=createAdminClient({fetcher:async url=>{paths.push(url);return Response.json({items:[],total:0,limit:2,offset:0});}});
 for(const sort of ['id','similarity','course-count']){const result=await client.request('discovery-candidates','GET',{id},new URLSearchParams({sort,limit:'2',offset:'0',suppressed:'true'}));expect(result.status).toBe(200);expect(new URL(paths.at(-1)!).searchParams.get('sort')).toBe(sort);}
 const calls=paths.length;for(const query of ['sort=bad','sort=similarity&sort=id','sort=','sort=course-count&limit=101'])await expect(client.request('discovery-candidates','GET',{id},new URLSearchParams(query))).rejects.toMatchObject({status:422});expect(paths).toHaveLength(calls);
});
test('concrete discovery routes validate paths, query/body and response envelopes',async()=>{
 const paths:string[]=[];const client=createAdminClient({fetcher:async(url,init)=>{paths.push(url);expect(init?.headers).not.toHaveProperty('origin');return Response.json({promotion:null});}});
 expect((await client.request('discovery-promotion','GET',{id})).data).toEqual({promotion:null});expect(paths[0]).toEndWith('/api/v1/manage/embeddings/discoveries/'+id+'/promotion');
 for(const [op,path] of Object.entries({'discovery-runs':'runs','discovery-run':'runs/'+id,'discovery-candidates':'runs/'+id+'/discoveries','discovery-evidence':'discoveries/'+id+'/evidence','discovery-history':'discoveries/'+id+'/history','discovery-overlap':'discoveries/'+id+'/overlap','discovery-inputs':'operations/'+id+'/inputs','discovery-manifest':'manifests/'+id,'discovery-revision':'revisions/'+id})){
  const result=discoveryTransport(op as Parameters<typeof discoveryTransport>[0],'GET',id,new URLSearchParams(),undefined);expect(result.path).toBe('/api/v1/manage/embeddings/'+path);expect(result.guard({})).toBe(false);
 }
 for(const q of ['limit=101','offset=-1','limit=2&limit=2','url=http://evil','suppressed=1'])await expect(client.request('discovery-candidates','GET',{id},new URLSearchParams(q))).rejects.toMatchObject({status:422});
 const review={requestId:id,expectedVersion:0,status:'approved',title:null,note:null,acceptPartial:false};
 expect(discoveryTransport('discovery-review','POST',id,new URLSearchParams(),review).guard({...review,version:1})).toBe(true);
 const promotion={requestId:id,expectedVersion:1,group:{title:'پایتون',slug:'python',description:'دامنه آموزشی',categoryId:'code',targetLevel:null}};
 expect(discoveryTransport('discovery-promote','POST',id,new URLSearchParams(),promotion).guard({promotionId:id,groupId:id})).toBe(true);
 for(const body of [{...promotion,group:{...promotion.group,isPublished:true}},{...promotion,group:{...promotion.group,slug:'فارسی'}},{...promotion,requestId:'bad'}])expect(()=>discoveryTransport('discovery-promote','POST',id,new URLSearchParams(),body)).toThrow();
 for(const operation of ['discovery-review','discovery-promote','discovery-delivery'] as const)await expect(client.request(operation,'POST',{id},new URLSearchParams(),{sql:'secret'})).rejects.toMatchObject({status:422});
 await expect(client.request('discovery-run','DELETE',{id})).rejects.toMatchObject({status:422});await expect(client.request('discovery-run','GET',{id:'../operations'})).rejects.toMatchObject({status:422});
});
test('discovery handlers retain same-origin, no-store, bounded and safe failure boundaries',async()=>{
 let calls=0;const client=createAdminClient({fetcher:async()=>{calls++;return Response.json({promotion:null});}});
 const url='http://localhost/api/admin/embeddings/discoveries/'+id+'/review';
 const make=(origin:string,body='{}')=>new Request(url,{method:'POST',headers:{origin,'content-type':'application/json'},body});
 expect((await adminHandler(make('http://foreign.test'),'discovery-review',{id},client)).status).toBe(403);expect(calls).toBe(0);
 expect((await adminHandler(make('http://localhost',' '.repeat(16385)),'discovery-review',{id},client)).status).toBe(422);expect(calls).toBe(0);
 for(const status of [404,409,422,503]){const bad=createAdminClient({fetcher:async()=>new Response('private SQL',{status})});const r=await adminHandler(new Request(url),'discovery-promotion',{id},bad);expect(r.status).toBe(status);expect(r.headers.get('cache-control')).toBe('no-store');expect(await r.text()).not.toContain('private');}
 for(const response of [Response.json({promotion:{id}}),Response.json({promotion:null,secret:'x'}),new Response('broken',{headers:{'content-type':'application/json'}}),new Response('{}',{headers:{'content-type':'text/html'}}),new Response('{}',{headers:{'content-type':'application/json','content-length':'2097153'}})]){const bad=createAdminClient({fetcher:async()=>response});await expect(bad.request('discovery-promotion','GET',{id})).rejects.toMatchObject({status:503});}
 const badPage=createAdminClient({fetcher:async()=>Response.json({items:[],total:0,limit:10,offset:0})});await expect(badPage.request('discovery-runs','GET')).rejects.toMatchObject({status:503});
 const timeout=createAdminClient({deadlineMs:5,fetcher:(_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(Error('private'))))});await expect(timeout.request('discovery-promotion','GET',{id})).rejects.toMatchObject({status:503});
});
