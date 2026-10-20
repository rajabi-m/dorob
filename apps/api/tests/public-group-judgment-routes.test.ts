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
