import {SQL} from 'bun';
import {test,describe,expect} from 'bun:test';
import {isolatedDatabase} from './helpers';
import {migrate,readMigrations} from '../src/migrations';
import {createCatalogRepository,CatalogError} from '../src/catalog';
import {createSuggestionRepository} from '../src/group-suggestions';
const page={limit:20,offset:0};
describe.skipIf(process.env.API_INTEGRATION!=='1')('durable group suggestions',()=>{
 test('immutable replay, independent scores, sorting, missing parents and reconnect reads',async()=>{
  await isolatedDatabase(async sql=>{
   await migrate(sql,await readMigrations());const c=createCatalogRepository(sql),r=createSuggestionRepository(sql);
   const course=(await c.registerCourse({providerId:'test',providerCourseId:'Python / یک',title:'پایتون',sourceUrl:'https://example.com'})).course;
   const g=await c.createGroup({slug:'suggestions',title:'پایتون',description:'شرح',categoryId:'code',targetLevel:null,isPublished:false});
   const body={courseId:course.id,systemId:'one',systemName:'نمونه',submissionId:'first',confidencePercent:75.63581726395481};
   const concurrent=await Promise.all([r.submit(g.id,body),r.submit(g.id,body)]);expect(concurrent.filter(x=>x.created)).toHaveLength(1);const a=concurrent[0];expect((await r.submit(g.id,body)).suggestion.id).toBe(a.suggestion.id);
   await expect(r.submit(g.id,{...body,confidencePercent:90})).rejects.toMatchObject({status:409});
   const b=await r.submit(g.id,{...body,systemId:'two',confidencePercent:94});
   const d=await r.submit(g.id,{...body,submissionId:'tie',confidencePercent:94});
   const ordered=await r.list(g.id,'pending',page);expect(ordered.total).toBe(3);expect(ordered.items.map(x=>x.id)).toEqual([d.suggestion.id,b.suggestion.id,a.suggestion.id]);
   expect((await r.list(g.id,'pending',{limit:1,offset:1})).items[0].id).toBe(b.suggestion.id);
   expect((await c.groupDetail(g.id,page)).courseCount).toBe(0);
   await expect(r.submit(crypto.randomUUID(),body)).rejects.toMatchObject({status:404});await expect(r.submit(g.id,{...body,courseId:'test:missing'})).rejects.toMatchObject({status:404});
   expect((await createSuggestionRepository(sql).list(g.id,'pending',page)).total).toBe(3);
  });
 });
 test('atomic review, conflicting tabs, sticky rejection, retry history and manual provenance',async()=>{
  await isolatedDatabase(async sql=>{
   await migrate(sql,await readMigrations());const c=createCatalogRepository(sql),r=createSuggestionRepository(sql);
   const course=(await c.registerCourse({providerId:'test',providerCourseId:'1',title:'نمونه',sourceUrl:'https://example.com'})).course;
   const g=await c.createGroup({slug:'reviews',title:'نمونه',description:'شرح',categoryId:'code',targetLevel:null,isPublished:false});
   const body={courseId:course.id,systemId:'one',systemName:'نمونه',submissionId:'first',confidencePercent:72};
   const {suggestion:s}=await r.submit(g.id,body);
   await sql.unsafe(`CREATE FUNCTION fail_membership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'failure'; END $$; CREATE TRIGGER fail_member BEFORE UPDATE ON group_pair_reviews FOR EACH ROW EXECUTE FUNCTION fail_membership()`);
   await expect(r.review(s.id,'approve',0)).rejects.toBeInstanceOf(CatalogError);
   expect((await r.list(g.id,'pending',page)).items[0].review.version).toBe(0);expect((await c.groupDetail(g.id,page)).courseCount).toBe(0);
   await sql.unsafe('DROP TRIGGER fail_member ON group_pair_reviews');
   const outcomes=await Promise.allSettled([r.review(s.id,'reject',0),r.review(s.id,'approve',0)]);expect(outcomes.filter(x=>x.status==='fulfilled')).toHaveLength(1);
   const winner=outcomes.find(x=>x.status==='fulfilled')! as PromiseFulfilledResult<Awaited<ReturnType<typeof r.review>>>;
   if(winner.value.membership)await c.membership(g.id,course.id,false);
   let latest=(await r.list(g.id,'rejected',page)).items[0];
   await r.submit(g.id,{...body,submissionId:'higher',confidencePercent:99});expect((await r.list(g.id,'pending',page)).total).toBe(0);
   await expect(r.review(s.id,'approve',latest.review.version)).rejects.toMatchObject({status:409});
   const reopened=await r.review(s.id,'reopen',latest.review.version);expect(await r.review(s.id,'reopen',latest.review.version)).toEqual(reopened);
   const approved=await r.review(s.id,'approve',reopened.review.version);expect(await r.review(s.id,'approve',reopened.review.version)).toEqual(approved);
   expect((await r.members(g.id,page)).items[0].suggestion!.confidencePercent).toBe(72);
   await expect(r.review(s.id,'reopen',latest.review.version)).rejects.toMatchObject({status:409});
   const history=(await r.history(s.id,page)).total;
   await c.membership(g.id,course.id,true);expect((await r.history(s.id,page)).total).toBe(history);expect((await r.members(g.id,page)).items[0].review.origin).toBe('suggestion');
   await c.membership(g.id,course.id,false);await c.membership(g.id,course.id,false);await c.membership(g.id,course.id,true);
   expect((await r.members(g.id,page)).items[0]).toMatchObject({suggestion:null,review:{origin:'manual'}});
   expect((await r.history(s.id,page)).total).toBe(history+2);
   const [{schema}]=await sql`SELECT current_schema() AS schema`;const reconnected=new SQL(process.env.DATABASE_URL??'postgres://dorob:dorob_dev@127.0.0.1:5432/dorob',{connection:{options:`-c search_path=${schema}`}});try{expect((await createSuggestionRepository(reconnected).members(g.id,page)).items[0].review.origin).toBe('manual');}finally{await reconnected.close();}
   latest=(await r.list(g.id,'approved',page)).items[0];expect(latest.review.status).toBe('approved');
   const other=(await c.registerCourse({providerId:'test',providerCourseId:'2',title:'نمونه دوم',sourceUrl:'https://example.com/two'})).course;await Promise.all([c.membership(g.id,other.id,true),r.submit(g.id,{...body,courseId:other.id,submissionId:'concurrent-manual'})]);expect((await r.members(g.id,page)).items.find(m=>m.course.id===other.id)?.review.origin).toBe('manual');
  });
 });
});
describe.skipIf(process.env.API_INTEGRATION!=='1')('management search',()=>{
 test('normalizes Persian and filters before pagination without changing old ordering',async()=>{
  await isolatedDatabase(async sql=>{
   await migrate(sql,await readMigrations());const r=createCatalogRepository(sql);
   for(let i=0;i<22;i++)await r.createGroup({slug:'group-'+String(i).padStart(2,'0'),title:i===21?'آموزش کتاب پایتون':'نمونه',description:'شرح',categoryId:i===21?'code':'tools',targetLevel:null,isPublished:i===21});
   const groups=await r.listGroups({limit:1,offset:0},false,'code',{q:'كتاب   پايتون',isPublished:true});expect(groups.total).toBe(1);expect(groups.items[0].slug).toBe('group-21');
   expect((await r.listGroups(page)).total).toBe(22);expect((await r.listGroups(page)).items[0].slug).toBe('group-00');
   await r.registerCourse({providerId:'test',providerCourseId:'1',title:'کتاب پایتون',sourceUrl:'https://example.com'});
   expect((await r.listCourses(page,'كتاب پايتون')).total).toBe(1);
  });
 });
});
