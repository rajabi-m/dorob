import {test,expect,mock} from 'bun:test';mock.module('server-only',()=>({}));
const {createGroupClient,groupListHandler,groupDetailHandler}=await import('../src/lib/group-api');
import {groupExample} from '../../../packages/core/tests/public-group-fixture';
test('public web group boundary uses fixed paths and bounded no-store requests',async()=>{
 const g=groupExample();const seen:string[]=[];const client=createGroupClient({origin:'http://api.test:4567',fetcher:async(url,init)=>{seen.push(url);expect(init).toMatchObject({cache:'no-store',redirect:'error'});return Response.json(url.includes('/python?')?g:{items:[],total:0,limit:12,offset:0});}});
 expect((await groupListHandler(new Request('http://web.test/api/judged-groups'),client)).status).toBe(200);expect((await groupDetailHandler(new Request('http://web.test/api/judged-groups/python'),'python',client)).status).toBe(200);expect(seen[1]).toBe('http://api.test:4567/api/v1/judged-groups/python?limit=20&offset=0');
 expect((await client.detail('../manage',{limit:20,offset:0})).ok).toBe(false);
 for(const q of ['url=evil','offset=-1','limit=1&limit=2'])expect((await groupListHandler(new Request('http://web.test/?'+q),client)).status).toBe(422);
 for(const response of [Response.json({...g,slug:'wrong'}),Response.json({...g,inputManifest:{secret:1}}),new Response('{}',{headers:{'content-type':'text/html'}}),new Response('{}',{headers:{'content-type':'application/json','content-length':'8388609'}}),new Response(new Uint8Array(8388609),{headers:{'content-type':'application/json'}})])expect((await createGroupClient({fetcher:async()=>response}).detail('python',{limit:20,offset:0})).ok).toBe(false);
 for(const status of [404,409,503]){const result=await groupDetailHandler(new Request('http://web.test/'),'python',createGroupClient({fetcher:async()=>new Response('secret',{status})}));expect(result.status).toBe(status);expect(await result.text()).not.toContain('secret');}
 const timeout=createGroupClient({deadlineMs:5,fetcher:async(_url,init)=>new Promise((_,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('secret'))))});expect((await timeout.detail('python',{limit:20,offset:0})).ok).toBe(false);
});
