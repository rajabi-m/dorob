import { describe, test, expect } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { isolatedDatabase } from './helpers';
import { migrate, readMigrations } from '../src/migrations';
import { createIngestionRepository } from '../src/ingestion';
import { createCatalogRepository } from '../src/catalog';
import { createPublicCourseRepository } from '../src/public-courses';
import { createThumbnailService } from '../src/thumbnails';
import { createAssetStore } from '../src/asset-store';
import { createRasterProcessor } from '../src/raster';
import { minimal, rich } from '../src/ingestion-examples';
import { parseCourseQuery, isPublicCoursePage, isPublicCourseDetail } from '@dorob/core';
import { createApp } from '../src/app';
describe.skipIf(process.env.API_INTEGRATION !== '1')('public catalog PostgreSQL/storage', () => {
  test('eligibility, snapshot refresh, normalized literal filtering, category deduplication and tied-time paging',async () => {
    const directory = await mkdtemp(join(tmpdir(),'dorob-public-')), raster=createRasterProcessor();
    try { await isolatedDatabase(async sql => {
      await migrate(sql,await readMigrations());
      const ingestion=createIngestionRepository(sql), catalog=createCatalogRepository(sql), store=createAssetStore({ assetDirectory:join(directory,'assets'),stagingDirectory:join(directory,'stage') });
      const bytes=await sharp({ create:{ width:128,height:64,channels:3,background:'red' } }).png().toBuffer();
      const thumbnails=createThumbnailService(ingestion,store,raster,async () => bytes); await thumbnails.initialize();
      const publicRepo=createPublicCourseRepository(sql,thumbnails), query=(s='') => parseCourseQuery(new URLSearchParams(s));
      await catalog.registerCourse({ ...minimal(),providerCourseId:'reference' });
      const observations=[];
      for(let n=0;n<22;n++) {
        const input=rich(); input.providerCourseId=String(n).padStart(2,'0'); input.submissionId=`test-${n}`;
        input.title=n===21 ? 'يادگيري پایتون Python بین‌المللی 100%_ ویژه' : `دورهٔ نمونه ${n}`;
        input.source.fieldSources['instructors.data']='synthetic instructor'; input.instructors={ coverage:{ status:'complete',reason:null },data:[{ name:'مدرس كيان',role:null }] };
        if(n!==0) input.pricing=minimal().pricing;
        const s=(await ingestion.ingest(input)).snapshot; observations.push(await thumbnails.process(s.courseId,s.id));
      }
      await sql`UPDATE course_snapshots SET received_at='2026-10-10T00:00:00Z'`;
      const first=await publicRepo.list(query()); expect(first.total).toBe(22); expect(first.items).toHaveLength(18); expect(isPublicCoursePage(first)).toBe(true);
      const next=await publicRepo.list(query('offset=18')); expect(next.items).toHaveLength(4); expect(new Set([...first.items,...next.items].map(c=>c.id)).size).toBe(22);
      expect((await publicRepo.list(query('q=یادگیری'))).items[0].id).toBe('example:21');
      for(const q of ['بین المللی','100%_','کیان','EXAMPLE']) expect((await publicRepo.list(query(`q=${encodeURIComponent(q)}`))).total).toBe(q==='کیان'||q==='EXAMPLE'?22:1);
      expect((await publicRepo.list(query('q=%25'))).total).toBe(1); expect((await publicRepo.list(query('q=not-here'))).total).toBe(0);
      expect((await publicRepo.list(query('freeOnly=true'))).total).toBe(1);
      expect((await publicRepo.list(query('category=code'))).total).toBe(0);
      for(const slug of ['one','two']) { const g=await catalog.createGroup({ slug,title:'گروه',description:'شرح',categoryId:'code',isPublished:true,targetLevel:null }); for(const id of ['example:00','example:21']) await catalog.membership(g.id,id,true); }
      expect((await publicRepo.list(query('category=code'))).total).toBe(2); expect((await publicRepo.detail('example:00')).categoryIds).toEqual(['code']);
      const app=createApp({ sql,ready:async()=>true,close:async()=>{} },catalog,{ ingestion,thumbnails,publicCourses:publicRepo });
      const response=await app.handle(new Request('http://localhost/api/v1/courses?limit=1')); expect(response.status).toBe(200); expect(isPublicCoursePage(await response.json())).toBe(true);
      const detail=await app.handle(new Request(`http://localhost/api/v1/courses/${encodeURIComponent('example:21')}`)); expect(detail.status).toBe(200); expect(isPublicCourseDetail(await detail.json())).toBe(true);
      const spec=await (await app.handle(new Request('http://localhost/docs/json'))).json(); expect(spec.paths['/api/v1/courses'].get.responses['200']).toBeDefined();
      // New filters operate on current projected facts before totals and paging.
      for(const [n,minutes] of [null,179.5,180,599.5,600].entries()) {
        const input=rich(); input.providerId='roocket';input.providerCourseId='filter-'+n;input.submissionId='filters-'+n;
        input.title='فیلتر Python';input.education!.data!.duration.contentMinutes=minutes;
        if(n===0) input.pricing=minimal().pricing;
        else if(n===2) input.pricing.data=[input.pricing.data![1]];
        else if(n===3) input.pricing.data=[{...input.pricing.data![1],id:'subscription',type:'subscription',status:'subscription',billingPeriod:'monthly'}];
        const snapshot=(await ingestion.ingest(input)).snapshot;await thumbnails.process(snapshot.courseId,snapshot.id);
      }
      expect((await publicRepo.list(query('provider=roocket'))).total).toBe(5);
      expect((await publicRepo.list(query('provider=roocket&priceStatus=unknown'))).total).toBe(1);
      expect((await publicRepo.list(query('provider=roocket&priceStatus=free'))).total).toBe(2);
      expect((await publicRepo.list(query('provider=roocket&priceStatus=paid'))).items.map(c=>c.id)).toEqual(['roocket:filter-2']);
      expect((await publicRepo.list(query('provider=roocket&priceStatus=subscription'))).total).toBe(1);
      expect((await publicRepo.list(query('provider=roocket&duration=under-3h'))).items.map(c=>c.id)).toEqual(['roocket:filter-1']);
      expect((await publicRepo.list(query('provider=roocket&duration=3-to-10h'))).total).toBe(2);
      expect((await publicRepo.list(query('provider=roocket&duration=10h-plus'))).items.map(c=>c.id)).toEqual(['roocket:filter-4']);
      const combined=await publicRepo.list(query('q=python&provider=roocket&duration=3-to-10h&limit=1&offset=1'));
      expect(combined).toMatchObject({total:2,limit:1,offset:1});expect(combined.items).toHaveLength(1);
      for(const invalid of ['provider=bad','priceStatus=free&priceStatus=paid','duration=bad','freeOnly=true&priceStatus=paid']) expect((await app.handle(new Request('http://localhost/api/v1/courses?'+invalid))).status).toBe(422);
      const parameters=spec.paths['/api/v1/courses'].get.parameters.map((p:{name:string})=>p.name);
      for(const name of ['provider','priceStatus','duration'])expect(parameters).toContain(name);
      const refresh=rich(); refresh.providerCourseId='00';refresh.submissionId='refresh';const pending=(await ingestion.ingest(refresh)).snapshot;
      expect((await publicRepo.list(query())).total).toBe(26);await expect(publicRepo.detail('example:00')).rejects.toMatchObject({ status:404 });
      const claim=await ingestion.claim(pending.courseId,pending.id);await ingestion.fail(pending.id,claim.leaseId!,'processing_failed');expect((await publicRepo.list(query())).total).toBe(26);
      await thumbnails.process(pending.courseId,pending.id);expect((await publicRepo.list(query())).total).toBe(27);
      const asset=await ingestion.asset(observations[1].thumbnail.asset!.id);await rm(join(store.config.assetDirectory,asset.storageKey));
      const missing=await publicRepo.list(query());expect(missing.total).toBe(0);expect(missing.items).toEqual([]);
      await rm(store.config.assetDirectory,{ recursive:true });
      // New ready association points at unavailable storage: safe outage rather than false 404.
      await sql`UPDATE thumbnail_attempts SET status='ready',asset_id=${asset.id} WHERE snapshot_id=${pending.id}`;
      await expect(publicRepo.list(query())).rejects.toMatchObject({ status:503 });
    }); } finally { await raster.close();await rm(directory,{ recursive:true,force:true }); }
  },30000);
});
