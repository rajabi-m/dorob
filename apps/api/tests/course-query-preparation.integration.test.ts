import { describe,test,expect } from 'bun:test';
import { isolatedDatabase } from './helpers';
import { migrate,readMigrations } from '../src/migrations';
import { createIngestionRepository } from '../src/ingestion';
import { rich } from '../src/ingestion-examples';
import { transaction } from '../src/catalog';
import { writeCourseQueryEntry, prepareCourseQueries, assertCourseQueryReady } from '../src/course-query-preparation';
describe.skipIf(process.env.API_INTEGRATION!=='1')('course query projection',()=>{
 test('atomic current facts, serialized acceptance, replay and same-course constraints',async()=>{
  await isolatedDatabase(async sql=>{
   await migrate(sql,await readMigrations());const ingest=createIngestionRepository(sql);
   const old=rich();old.submissionId='old';const before=await ingest.ingest(old);
   const results=await Promise.all(['a','b'].map(submissionId=>ingest.ingest({...rich(),submissionId,title:submissionId})));
   const [c]=await sql`SELECT c.current_snapshot_id,e.snapshot_id,e.search_text FROM courses c JOIN course_catalog_entries e ON e.course_id=c.id`;
   expect(c.snapshot_id).toBe(c.current_snapshot_id);expect(results.map(r=>r.snapshot.id)).toContain(c.snapshot_id);
   expect((await ingest.ingest(old)).created).toBe(false);
   expect((await sql`SELECT snapshot_id FROM course_catalog_entries`)[0].snapshot_id).toBe(c.snapshot_id);
   await expect(transaction(sql,false,tx=>writeCourseQueryEntry(tx,before.snapshot.courseId,before.snapshot.id,old))).rejects.toMatchObject({status:503});
   const other=await ingest.ingest({...rich(),providerCourseId:'other',submissionId:'other'});
   await expect(sql`UPDATE course_catalog_entries SET snapshot_id=${other.snapshot.id} WHERE course_id=${before.snapshot.courseId}`.execute()).rejects.toThrow();
   // Fail derivation/persistence after the new snapshot/pointer have been written.
   await sql`UPDATE course_catalog_preparation SET projection_version=99`;
   await expect(ingest.ingest({...rich(),submissionId:'rollback'})).rejects.toMatchObject({status:503});
   expect((await sql`SELECT current_snapshot_id FROM courses WHERE id=${before.snapshot.courseId}`)[0].current_snapshot_id).toBe(c.snapshot_id);
   expect((await sql`SELECT count(*)::int AS n FROM course_snapshots WHERE submission_id='rollback'`)[0].n).toBe(0);
  });
 },30000);
 test('populated upgrade, durable interruption/resume, repeat, old writer and rebuild',async()=>{
  await isolatedDatabase(async sql=>{
   const migrations=await readMigrations();await migrate(sql,migrations.slice(0,-1));
   // Reproduce an old writer before the additive schema exists using its accepted payload.
   const input=rich();
   await sql`INSERT INTO courses(id,provider_id,provider_course_id,title,source_url) VALUES ('example:old','example','old','old',${input.sourceUrl})`;
   const [snapshot]=await sql`INSERT INTO course_snapshots(course_id,submission_id,acceptance_order,schema_version,checked_at,request_hash,fact_hash,payload)
     VALUES ('example:old','old',1,3,now(),${'a'.repeat(64)},${'b'.repeat(64)},${input}::jsonb) RETURNING id`;
   await sql`UPDATE courses SET current_snapshot_id=${snapshot.id} WHERE id='example:old'`;
   await migrate(sql,migrations);
   await expect(assertCourseQueryReady(sql)).rejects.toThrow();
   await expect(prepareCourseQueries(sql,{batchSize:1,afterBatch:()=>{throw Error('interruption');}})).rejects.toThrow('interruption');
   expect((await sql`SELECT batches,complete FROM course_catalog_preparation`)[0]).toMatchObject({batches:1,complete:false});
   await prepareCourseQueries(sql);await assertCourseQueryReady(sql);
   const checkpoint=await sql`SELECT * FROM course_catalog_preparation`;
   await prepareCourseQueries(sql);expect(await sql`SELECT * FROM course_catalog_preparation`).toEqual(checkpoint);
   // Old writer acceptance after rollback invalidates the retained completion marker.
   const [next]=await sql`INSERT INTO course_snapshots(course_id,submission_id,acceptance_order,schema_version,checked_at,request_hash,fact_hash,payload)
     VALUES ('example:old','old-next',2,3,now(),${'c'.repeat(64)},${'d'.repeat(64)},${input}::jsonb) RETURNING id`;
   await sql`UPDATE courses SET current_snapshot_id=${next.id} WHERE id='example:old'`;
   await expect(assertCourseQueryReady(sql)).rejects.toThrow();
   await prepareCourseQueries(sql,{rebuild:true});await assertCourseQueryReady(sql);
   expect((await sql`SELECT snapshot_id FROM course_catalog_entries`)[0].snapshot_id).toBe(next.id);
   expect((await sql`SELECT generation FROM course_catalog_preparation`)[0].generation).not.toBe(checkpoint[0].generation);
  });
 },30000);

});
