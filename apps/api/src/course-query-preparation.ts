import type { ReservedSQL, SQL } from 'bun';
import { COURSE_QUERY_VERSION, deriveCourseQueryFacts, type CourseIngestion } from '@dorob/core';

// Shared ingestion/preparation fence. Operators must also stop older writers.
export const COURSE_QUERY_LOCK = 718429311;
export async function writeCourseQueryEntry(tx: ReservedSQL, courseId: string, snapshotId: string, payload: CourseIngestion) {
  const f=deriveCourseQueryFacts(payload);
  const [state]=await tx`SELECT projection_version,generation FROM course_catalog_preparation WHERE singleton`;
  if (!state || state.projection_version !== COURSE_QUERY_VERSION) throw new Error('Course query version mismatch.');
  const rows=await tx`INSERT INTO course_catalog_entries(course_id,snapshot_id,projection_version,generation,received_at,provider_id,search_text,content_minutes,price_status,price_summary)
    SELECT c.id,s.id,${f.version},${state.generation}::uuid,s.received_at,${f.providerId},${f.searchText},${f.contentMinutes},${f.price.status},${f.price}::jsonb
    FROM courses c JOIN course_snapshots s ON s.course_id=c.id AND s.id=c.current_snapshot_id
    WHERE c.id=${courseId} AND s.id=${snapshotId}::uuid
    ON CONFLICT (course_id) DO UPDATE SET snapshot_id=EXCLUDED.snapshot_id,projection_version=EXCLUDED.projection_version,generation=EXCLUDED.generation,
      received_at=EXCLUDED.received_at,provider_id=EXCLUDED.provider_id,search_text=EXCLUDED.search_text,content_minutes=EXCLUDED.content_minutes,
      price_status=EXCLUDED.price_status,price_summary=EXCLUDED.price_summary RETURNING course_id`;
  if(rows.length !== 1) throw new Error('Current observation changed during preparation.');
}

export async function assertCourseQueryReady(tx: Pick<ReservedSQL,'unsafe'>) {
  const rows=await tx.unsafe<{ready:boolean}[]>(`SELECT complete AND projection_version=$1 AS ready FROM course_catalog_preparation WHERE singleton`,[COURSE_QUERY_VERSION]);
  if (!rows[0]?.ready) throw new Error('Course query preparation incomplete; run explicit migration/preparation.');
}

export async function courseQueryGaps(tx: ReservedSQL) {
  const [row]=await tx`SELECT EXISTS (SELECT 1 FROM courses c CROSS JOIN course_catalog_preparation p
    WHERE c.current_snapshot_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM course_catalog_entries e WHERE e.course_id=c.id AND e.snapshot_id=c.current_snapshot_id
        AND e.projection_version=p.projection_version AND e.generation=p.generation)) AS missing`;
  return row.missing as boolean;
}

/** Explicit upgrade only. Committed batches survive failures and process deadlines. */
export async function prepareCourseQueries(sql: SQL, options: {rebuild?:boolean; batchSize?:number; afterBatch?:(batches:number)=>void|Promise<void>} = {}) {
  const size=options.batchSize ?? 100;
  if (!Number.isInteger(size) || size<1 || size>100) throw new Error('Preparation batch size must be 1..100.');
  const tx=await sql.reserve();let locked=false;
  try {
    await tx`SELECT pg_advisory_lock(${COURSE_QUERY_LOCK})`;locked=true;
    if(options.rebuild) await tx`UPDATE course_catalog_preparation SET projection_version=${COURSE_QUERY_VERSION},generation=gen_random_uuid(),complete=false,last_course_id=NULL,batches=0`;
    const [state]=await tx`SELECT * FROM course_catalog_preparation WHERE singleton`;
    if(!state || state.projection_version!==COURSE_QUERY_VERSION) throw new Error('Projection version changed; use --rebuild-course-queries with writers stopped.');
    if(state.complete && !await courseQueryGaps(tx)) return;
    await tx`UPDATE course_catalog_preparation SET complete=false`;
    for(;;) {
      await tx.unsafe('BEGIN');
      let batches:number;
      try {
        const [checkpoint]=await tx`SELECT last_course_id FROM course_catalog_preparation WHERE singleton`;
        const rows=await tx<{id:string;snapshotId:string;payload:CourseIngestion}[]>`SELECT c.id,s.id AS "snapshotId",s.payload
          FROM courses c JOIN course_snapshots s ON s.course_id=c.id AND s.id=c.current_snapshot_id
          WHERE (${checkpoint.last_course_id}::text IS NULL OR c.id COLLATE "C">${checkpoint.last_course_id}::text COLLATE "C")
          ORDER BY c.id COLLATE "C" LIMIT ${size} FOR UPDATE OF c`;
        if(!rows.length) {
          // Serialize final verification with the deferred old-writer guard.
          // A pointer committed after this check must invalidate our marker.
          await tx`SELECT singleton FROM course_catalog_preparation WHERE singleton FOR UPDATE`;
          if(await courseQueryGaps(tx)) {
            await tx`UPDATE course_catalog_preparation SET last_course_id=NULL`;
            await tx.unsafe('COMMIT');continue;
          }
          await tx`UPDATE course_catalog_preparation SET complete=true,last_course_id=NULL`;
          await tx.unsafe('COMMIT');return;
        }
        for(const row of rows) await writeCourseQueryEntry(tx,row.id,row.snapshotId,row.payload);
        const [progress]=await tx`UPDATE course_catalog_preparation SET last_course_id=${rows.at(-1)!.id},batches=batches+1 RETURNING batches`;
        batches=progress.batches;
        await tx.unsafe('COMMIT');
      } catch(error) { await tx.unsafe('ROLLBACK');throw error; }
      await options.afterBatch?.(batches);
    }
  } finally {
    try {if(locked) await tx`SELECT pg_advisory_unlock(${COURSE_QUERY_LOCK})`;}
    finally {tx.release();}
  }
}
