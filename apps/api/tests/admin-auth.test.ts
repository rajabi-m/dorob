import {test,expect} from 'bun:test';
import {createApp} from '../src/app';
import type {Database} from '../src/database';
const db={ready:async()=>true,close:async()=>{}} as Database;
const state={dev:false,token:'a'.repeat(43),generation:'1'.repeat(32)};
const app=createApp(db,undefined,{auth:state});
const req=(path:string,options:RequestInit={})=>app.handle(new Request('http://localhost'+path,options));
test('early guard rejects management methods and bodies',async()=>{
 for(const method of ['GET','POST','PATCH','PUT','DELETE','OPTIONS'])for(const path of ['/api/v1/manage','/api/v1/manage/groups','/api/v1/manage/thumbnail-uploads','/api/v1/manage/embeddings/runs','/api/v1/%6danage/groups']) {
  const r=await req(path,{method,...(['POST','PATCH','PUT'].includes(method)?{headers:{'content-type':'application/json'},body:'invalid json'}:{})});expect(r.status).toBe(401);expect(r.headers.get('www-authenticate')).toBe('Bearer');
 }
});
test('authorized request reaches domain handler while public routes need no token',async()=>{
 expect((await req('/api/v1/manage/groups',{headers:{authorization:'Bearer '+state.token}})).status).toBe(503);
 for(const path of ['/api/v1/hello','/api/v1/categories','/health/live','/health/ready'])expect((await req(path)).status).toBe(200);
 expect((await req('/api/v1/management')).status).not.toBe(401);
});
test('OpenAPI labels only management operations',async()=>{const response=await req('/docs/json');const spec=await response.json();expect(spec.components.securitySchemes.adminToken.scheme).toBe('bearer');expect(spec.paths['/api/v1/manage/groups'].get.security).toEqual([{adminToken:[]}]);expect(spec.paths['/api/v1/categories'].get.security).toBeUndefined();expect(JSON.stringify(spec)).not.toContain(state.token);});
test('explicit bypass works',async()=>{const dev=createApp(db,undefined,{auth:{dev:true,token:'',generation:'dev'}});expect((await dev.handle(new Request('http://localhost/api/v1/manage/groups'))).status).toBe(503);});
test('internal auth fails closed without a verified loopback peer, regardless of host headers',async()=>{
 for(const host of ['localhost','127.0.0.1','api.example.org']) {
  const response=await app.handle(new Request('http://localhost/internal/admin-auth',{headers:{host,'x-forwarded-for':'127.0.0.1'}}));
  expect(response.status).toBe(404);
  expect(await response.text()).not.toContain(state.generation);
 }
});
test('every documented management operation is guarded',async()=>{const spec=await (await req('/docs/json')).json();let count=0;for(const [path,methods] of Object.entries(spec.paths)){if(!path.startsWith('/api/v1/manage'))continue;for(const method of Object.keys(methods as object)){if(!['get','post','put','patch','delete'].includes(method))continue;const concrete=path.replace(/\{[^}]+\}/g,'11111111-1111-4111-8111-111111111111');expect((await req(concrete,{method:method.toUpperCase()})).status).toBe(401);count++;}}expect(count).toBeGreaterThan(30);});
