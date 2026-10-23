import {prepareCourseQueries} from '../src/course-query-preparation';
import {describe,test,expect} from 'bun:test';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import sharp from 'sharp';
import {isolatedDatabase} from './helpers';import {migrate,readMigrations} from '../src/migrations';import {createCatalogRepository} from '../src/catalog';import {createIngestionRepository} from '../src/ingestion';import {createJudgmentRepository} from '../src/group-judgments';import {createPublicGroupJudgmentRepository} from '../src/public-group-judgments';import {createThumbnailService} from '../src/thumbnails';import {createAssetStore} from '../src/asset-store';import {createRasterProcessor} from '../src/raster';import {rich} from '../src/ingestion-examples';import {createApp} from '../src/app';import {isPublicJudgedGroupDetail,isPublicJudgedGroupPage} from '@dorob/core';
const q={limit:12,offset:0};
describe.skipIf(process.env.API_INTEGRATION!=='1')('public judged groups PostgreSQL/storage',()=>{
 test('retained eligibility, selected order, paging, safe projection and HTTP compatibility',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'dorob-judged-')),raster=createRasterProcessor();
 try{await isolatedDatabase(async sql=>{
  await migrate(sql,await readMigrations());await prepareCourseQueries(sql);const c=createCatalogRepository(sql),i=createIngestionRepository(sql),j=createJudgmentRepository(sql);
  const store=createAssetStore({assetDirectory:join(directory,'assets'),stagingDirectory:join(directory,'stage')});const bytes=await sharp({create:{width:64,height:32,channels:3,background:'red'}}).png().toBuffer();const t=createThumbnailService(i,store,raster,async()=>bytes);await t.initialize();
  const p=createPublicGroupJudgmentRepository(sql,t);const sources=[];
  for(let n=0;n<3;n++){const source=rich();source.providerCourseId=String(n);source.submissionId='source-'+n;source.pricing.data=source.pricing.data!.filter(o=>o.type==='full').map(o=>({...o,amount:[200,50,100][n]!,sourcePrice:{...o.sourcePrice,amount:[2000,500,1000][n]!}}));sources.push(source);const s=(await i.ingest(source)).snapshot;await t.process(s.courseId,s.id);}
  const g=await c.createGroup({slug:'python',title:'پایتون',description:'شروع',categoryId:'code',targetLevel:'beginner',isPublished:false});for(let n=0;n<3;n++)await c.membership(g.id,'example:'+n,true);
  const content={schemaVersion:1 as const,hero:{title:'مسیر پایتون',subtitle:'شروع',description:'توضیح',topicLabel:'پایتون',levelSummary:'مقدماتی'},courses:[2,0,1].map((n)=>({courseId:'example:'+n,tags:n===2?['expensive' as const]:[],strengths:n===2?['تمرین']:[],weaknesses:[]}))};
  const submit=async()=> (await j.submit(g.id,{systemId:'test',submissionId:crypto.randomUUID(),inputRevision:(await j.context(g.id)).inputRevision,content})).judgment;
  await submit();expect((await p.list(q)).total).toBe(0);await c.updateGroup(g.id,{isPublished:true});expect((await p.list(q)).total).toBe(0);const accepted=await submit();
  const small=await c.createGroup({slug:'small',title:'کوچک',description:'شرح',categoryId:'code',targetLevel:null,isPublished:true});await c.membership(small.id,'example:0',true);
  const unjudged=await c.createGroup({slug:'unjudged',title:'بی بررسی',description:'شرح',categoryId:'code',targetLevel:null,isPublished:true});for(let n=0;n<2;n++)await c.membership(unjudged.id,'example:'+n,true);
  const tieId=crypto.randomUUID();await sql`INSERT INTO course_group_judgments(id,group_id,system_id,submission_id,request_hash,input_revision,group_context,input_manifest,content,received_at) SELECT ${tieId},group_id,'tie','tie',request_hash,input_revision,group_context,input_manifest,content,received_at FROM course_group_judgments WHERE id=${accepted.id}`;
  const selectedId=[accepted.id,tieId].sort()[0];expect((await p.detail('python',q)).judgmentId).toBe(selectedId);

  const before=JSON.stringify(await sql`SELECT * FROM course_group_judgments ORDER BY id`);const list=await p.list(q);expect(list.total).toBe(1);expect(isPublicJudgedGroupPage(list)).toBe(true);expect(list.items[0].providers).toHaveLength(1);expect(list.items[0].covers.map(c=>c.courseId)).toEqual(['example:2','example:0','example:1']);
  const detail=await p.detail('python',{limit:2,offset:0});expect(isPublicJudgedGroupDetail(detail)).toBe(true);expect(detail.courses.items.map(c=>c.course.id)).toEqual(['example:2','example:0']);expect(detail.courses.items[0].assessment.tags).toEqual(['expensive']);expect(detail.courses.items[1].assessment.weaknesses).toEqual([]);
  const second=await p.detail('python',{limit:2,offset:2,judgmentId:selectedId});expect(second.courses.items.map(c=>c.course.id)).toEqual(['example:1']);expect(isPublicJudgedGroupDetail(second)).toBe(true);
  for(const sort of ['price-asc','price-desc'] as const){
   const page1=await p.detail('python',{limit:2,offset:0,sort,judgmentId:selectedId});
   const page2=await p.detail('python',{limit:2,offset:2,sort,judgmentId:selectedId});
   expect([...page1.courses.items,...page2.courses.items].map(e=>e.course.id)).toEqual(sort==='price-asc'?['example:1','example:2','example:0']:['example:0','example:2','example:1']);
  }
  expect((await p.list(q)).items[0]!.covers.map(c=>c.courseId)).toEqual(['example:2','example:0','example:1']);
  const json=JSON.stringify(detail);for(const forbidden of ['inputManifest','submissionId','systemId','requestHash','sourceLocator','reviews','storageKey'])expect(json).not.toContain(forbidden);
  expect(JSON.stringify(await sql`SELECT * FROM course_group_judgments ORDER BY id`)).toBe(before);
  const newer=await submit();await expect(p.detail('python',{...q,judgmentId:accepted.id})).rejects.toMatchObject({status:409});expect((await p.detail('python',q)).judgmentId).toBe(newer.id);
  const other=await c.createGroup({slug:'aaa',title:'گروه',description:'شرح',categoryId:'tools',targetLevel:null,isPublished:true});for(let n=0;n<3;n++)await c.membership(other.id,'example:'+n,true);await j.submit(other.id,{systemId:'test',submissionId:crypto.randomUUID(),inputRevision:(await j.context(other.id)).inputRevision,content});
  expect((await p.list({limit:1,offset:0})).items[0].slug).toBe('aaa');expect((await p.list({limit:1,offset:1})).items[0].slug).toBe('python');
  const app=createApp({sql,ready:async()=>true,close:async()=>{}},c,{ingestion:i,thumbnails:t});
  for(const path of ['/api/v1/judged-groups','/api/v1/judged-groups/python','/api/v1/groups','/api/v1/courses'])expect((await app.handle(new Request('http://localhost'+path))).status).toBe(200);
  for(const path of ['?limit=101','?offset=-1','?offset=1&offset=2','?url=evil'])expect((await app.handle(new Request('http://localhost/api/v1/judged-groups'+path))).status).toBe(422);
  expect((await app.handle(new Request('http://localhost/api/v1/judged-groups/python?judgmentId=bad'))).status).toBe(422);
  const spec=await (await app.handle(new Request('http://localhost/docs/json'))).json();expect(spec.paths['/api/v1/judged-groups/{slug}'].get.responses['409']).toBeDefined();
  await c.updateGroup(g.id,{description:'جدید',categoryId:'design'});expect((await p.list(q)).total).toBe(2);expect((await p.detail('python',{...q,judgmentId:newer.id})).categoryId).toBe('code');expect((await j.detail(g.id,newer.id)).isCurrent).toBe(false);expect((await p.list({...q,category:'tools'})).total).toBe(1);
  await c.updateGroup(g.id,{description:'شروع',categoryId:'code'});expect((await p.list(q)).total).toBe(2);
  await c.registerCourse({...sources[0],title:'عنوان جدید'});expect((await p.list(q)).total).toBe(2);await c.registerCourse(sources[0]);expect((await p.list(q)).total).toBe(2);
  await c.membership(g.id,'example:0',false);expect((await p.list(q)).total).toBe(1);await c.membership(g.id,'example:0',true);expect((await p.list(q)).total).toBe(2);
  const source=structuredClone(sources[0]);source.submissionId='refresh';await i.ingest(source);expect((await p.list(q)).total).toBe(2);
  const ss=(await i.current('example:0')).snapshot!;await t.process(ss.courseId,ss.id);await submit();expect((await p.list(q)).total).toBe(2);
  for(const status of ['unknown','paid','subscription'] as const){const variant=structuredClone(sources[0]);variant.submissionId='price-'+status;delete variant.feedback;
   if(status==='unknown')variant.pricing={coverage:{status:'unknown',reason:'غير معروف'},data:null};
   else {variant.pricing.data=variant.pricing.data!.filter(o=>o.id==='full');Object.assign(variant.pricing.data[0],{status,type:status==='subscription'?'subscription':'full',billingPeriod:status==='subscription'?'monthly':null});}
   const snapshot=(await i.ingest(variant)).snapshot;await t.process(snapshot.courseId,snapshot.id);await submit();const facts=(await p.detail('python',q)).courses.items.find(c=>c.course.id==='example:0')!.course;expect(facts.price.status).toBe(status);expect(facts.rating).toBeNull();expect(isPublicJudgedGroupDetail(await p.detail('python',q))).toBe(true);
  }
  // More than a page of independent groups, reusing only this isolated schema's courses.
  for(let n=0;n<14;n++){
   const slug='catalog-'+String(n).padStart(2,'0');
   const extra=await c.createGroup({slug,title:'گروه '+n,description:'شرح',categoryId:n%2?'design':'code',targetLevel:null,isPublished:true});
   for(let k=0;k<3;k++)await c.membership(extra.id,'example:'+k,true);
   await j.submit(extra.id,{systemId:'catalog-test',submissionId:crypto.randomUUID(),inputRevision:(await j.context(extra.id)).inputRevision,content:{...content,hero:{...content.hero,title:'کاتالوگ Python '+n,description:n===13?'جست‌وجوی ویژه':'شرح'}}});
  }
  const catalog=await p.list({...q,q:'کاتالوگ'});expect(catalog.total).toBe(14);expect(catalog.items).toHaveLength(12);
  const tail=await p.list({...q,q:'کاتالوگ',offset:12});expect(tail.items.map(g=>g.slug)).toEqual(['catalog-12','catalog-13']);
  expect((await p.list({...q,q:'جست وجوی ویژه',category:'design'})).items.map(g=>g.slug)).toEqual(['catalog-13']);
  expect((await p.list({...q,q:'python',category:'design'})).total).toBe(7);
  expect((await p.list({...q,q:'کاتالوگ',category:'code',limit:2,offset:2})).items.map(g=>g.slug)).toEqual(['catalog-04','catalog-06']);
  expect((await p.list({...q,q:'کاتالوگ',category:'tools'})).total).toBe(0);
  await c.updateGroup(g.id,{description:'stale search match'});expect((await p.list({...q,q:content.hero.title})).total).toBe(2);
  const attemptsBefore=JSON.stringify(await sql`SELECT * FROM thumbnail_attempts ORDER BY snapshot_id`);
  const asset=await i.asset((await i.current('example:1')).snapshot!.thumbnail.asset!.id);await rm(join(store.config.assetDirectory,asset.storageKey));expect((await p.list(q)).total).toBe(0);
  expect(JSON.stringify(await sql`SELECT * FROM thumbnail_attempts ORDER BY snapshot_id`)).toBe(attemptsBefore);
  await rm(store.config.assetDirectory,{recursive:true,force:true});await expect(p.list(q)).rejects.toMatchObject({status:503});
 });}finally{await raster.close();await rm(directory,{recursive:true,force:true});}
 },30000);
});
