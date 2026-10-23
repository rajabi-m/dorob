import {test,expect} from 'bun:test';
import {publicGroupJudgmentRoutes} from '../src/public-group-judgment-routes';
import {CatalogError} from '../src/catalog';
test('public routes validate inputs, preserve documented conflicts and hide diagnostics',async()=>{
 const app=publicGroupJudgmentRoutes({list:async q=>({items:[],total:0,...q}),detail:async()=>{throw new CatalogError(409);}});
 const get=(path:string)=>app.handle(new Request('http://localhost/api/v1/judged-groups'+path));
 expect((await get('')).status).toBe(200);expect((await get('')).headers.get('cache-control')).toBe('no-store');
 for(const q of ['?limit=0','?limit=101','?offset=-1','?offset=2&offset=1','?url=evil','/bad_slug'])expect((await get(q)).status).toBe(422);
 expect((await get('/python')).status).toBe(409);
 const bad=publicGroupJudgmentRoutes({list:async()=>{throw new Error('private SQL path');},detail:async()=>{throw new CatalogError(404);}});const r=await bad.handle(new Request('http://localhost/api/v1/judged-groups'));expect(r.status).toBe(503);expect(await r.text()).not.toContain('private');
 expect((await publicGroupJudgmentRoutes().handle(new Request('http://localhost/api/v1/judged-groups'))).status).toBe(503);
});

import {publicGroupDetailExample,publicGroupSummaryExample} from '../src/public-group-judgment-examples';
import {isPublicJudgedGroupDetail,isPublicJudgedGroupPage} from '@dorob/core';
test('OpenAPI synthetic public examples conform to strict runtime boundaries',()=>{expect(isPublicJudgedGroupDetail(publicGroupDetailExample)).toBe(true);expect(isPublicJudgedGroupPage({items:[publicGroupSummaryExample],total:1,limit:12,offset:0})).toBe(true);});

test('group list filters reach the repository and invalid list/detail filters fail safely',async()=>{
 let received:unknown;
 const app=publicGroupJudgmentRoutes({list:async q=>{received=q;return {items:[],total:0,limit:q.limit,offset:q.offset};},detail:async()=>{throw new CatalogError(404);}});
 const get=(query:string)=>app.handle(new Request('http://localhost/api/v1/judged-groups'+query));
 expect((await get('?q='+encodeURIComponent('پایتون %_')+'&category=code')).status).toBe(200);
 expect(received).toEqual({q:'پایتون %_',category:'code',limit:12,offset:0});
 for(const q of ['?category=nope','?q=a&q=b','?q='+ 'a'.repeat(201),'?provider=example','/python?q=a','/python?category=code'])expect((await get(q)).status).toBe(422);
});


test('detail sort modes reach repository, preserve pins and reject malformed queries',async()=>{
 let received:unknown;
 const app=publicGroupJudgmentRoutes({list:async()=>({items:[],total:0,limit:12,offset:0}),detail:async(_slug,q)=>{received=q;if(q.judgmentId==='00000000-0000-0000-0000-000000000000')throw new CatalogError(409);return publicGroupDetailExample;}});
 const get=(path:string)=>app.handle(new Request('http://localhost/api/v1/judged-groups'+path));
 for(const sort of ['recommended','price-asc','price-desc']){
  const r=await get('/python?sort='+sort);expect(r.status).toBe(200);expect(received).toMatchObject({sort,limit:20,offset:0});
  expect((await r.json()).courses.items[0].course.price).toEqual(publicGroupDetailExample.courses.items[0]!.course.price);
 }
 for(const q of ['/python?sort=','/python?sort=bad','/python?sort=price-asc&sort=price-desc','?sort=recommended'])expect((await get(q)).status).toBe(422);
 expect((await get('/python?sort=price-asc&judgmentId=00000000-0000-0000-0000-000000000000')).status).toBe(409);
});
