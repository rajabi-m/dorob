import type { SQL } from 'bun';
import { COURSE_QUERY_VERSION, normalizeSearch, providerNames, type CategoryId, type CourseQuery, type Page, type PublicCourse, type PublicCourseDetail } from '@dorob/core';
import { CatalogError, transaction } from './catalog';
import { snapshotProjection, snapshotJoins, snapshotRow, type SnapshotRow } from './ingestion';
import type { ThumbnailService } from './thumbnails';
import { presentCourse } from './public-course-projection';
import { assertCourseQueryReady } from './course-query-preparation';
export interface PublicCourseRepository { list(query: CourseQuery): Promise<Page<PublicCourse>>; detail(id: string): Promise<PublicCourseDetail> }
export type CourseReadObserver=(event:{phase:'count'|'page'|'hydrate';rows:number;milliseconds:number})=>void|Promise<void>;
const eligibleGroups=`eligible_groups AS MATERIALIZED (
  SELECT g.id,g.category_id FROM course_groups g
  JOIN (SELECT group_id FROM course_group_courses GROUP BY group_id HAVING count(*)>=2) members ON members.group_id=g.id
  WHERE g.is_published
)`;
const categories=`COALESCE((SELECT jsonb_agg(DISTINCT g.category_id) FROM course_group_courses m JOIN eligible_groups g ON g.id=m.group_id WHERE m.course_id=c.id),'[]'::jsonb)`;
const entryJoins=`FROM course_catalog_entries e JOIN courses c ON c.id=e.course_id AND c.current_snapshot_id=e.snapshot_id
  JOIN course_catalog_preparation p ON p.singleton AND p.complete AND p.projection_version=e.projection_version AND p.generation=e.generation`;
// Only list-required JSON paths cross the database boundary. No descriptions,
// curriculum, feedback, full offer arrays, evidence or historical facts are loaded.
const cardFields=`c.id,s.id AS "snapshotId",s.payload#>>'{source,checkedAt}' AS "checkedAt",
  e.provider_id AS "providerId",s.payload->>'title' AS title,s.payload->>'sourceUrl' AS "sourceUrl",
  s.payload#>>'{classification,data,providerLevel}' AS level,e.content_minutes AS "contentMinutes",
  s.payload#>'{instructors,data}' AS instructors,e.price_summary AS price,
  f.id AS "assetId",f.width,f.height,COALESCE(s.payload#>>'{thumbnail,data,alt}','') AS alt`;
type CardRow=Omit<PublicCourse,'provider'|'thumbnail'|'categoryIds'> & {providerId:string;assetId:string|null;width:number;height:number;alt:string;categories:CategoryId[]};
export function createPublicCourseRepository(sql: SQL, thumbnails: Pick<ThumbnailService,'inspectAvailability'>, observe?:CourseReadObserver): PublicCourseRepository {
  void thumbnails; // Compatibility for callers; metadata never invokes image services.
  return {
    async list(query) {
      try { return await transaction(sql,true,async tx=>{
        await assertCourseQueryReady(tx);
        const values:unknown[]=[COURSE_QUERY_VERSION];const conditions=['e.projection_version=$1'];
        const add=(condition:string,value:unknown)=>{values.push(value);conditions.push(condition.replace('?',`$${values.length}`));};
        const search=normalizeSearch(query.q);if(search) add('strpos(e.search_text,?)>0',search);
        if(query.provider) add('e.provider_id=?',query.provider);
        if(query.freeOnly) add('e.price_status=?','free');
        if(query.priceStatus) add('e.price_status=?',query.priceStatus);
        if(query.duration) conditions.push(query.duration==='under-3h'?'e.content_minutes<180':query.duration==='3-to-10h'?'e.content_minutes>=180 AND e.content_minutes<600':'e.content_minutes>=600');
        if(query.category) add('EXISTS (SELECT 1 FROM course_group_courses m JOIN eligible_groups g ON g.id=m.group_id WHERE m.course_id=c.id AND g.category_id=?)',query.category);
        const where=conditions.map(c=>`(${c})`).join(' AND ');
        let started=performance.now();
        const [{total}]=await tx.unsafe<{total:number}[]>(`${query.category?`WITH ${eligibleGroups}`:''} SELECT count(*)::int AS total ${entryJoins} WHERE ${where}`,values);
        await observe?.({phase:'count',rows:total,milliseconds:performance.now()-started});
        started=performance.now();
        const rows=await tx.unsafe<CardRow[]>(`WITH ${eligibleGroups}, selected AS MATERIALIZED (
          SELECT e.* ${entryJoins} WHERE ${where} ORDER BY e.received_at DESC,e.course_id COLLATE "C" LIMIT $${values.length+1} OFFSET $${values.length+2}
        ) SELECT ${cardFields},${categories} AS categories
          FROM selected e JOIN courses c ON c.id=e.course_id JOIN course_snapshots s ON s.course_id=c.id AND s.id=e.snapshot_id
          LEFT JOIN thumbnail_attempts a ON a.snapshot_id=s.id AND a.status='ready' LEFT JOIN thumbnail_assets f ON f.id=a.asset_id
          ORDER BY e.received_at DESC,e.course_id COLLATE "C"`,[...values,query.limit,query.offset]);
        await observe?.({phase:'page',rows:rows.length,milliseconds:performance.now()-started});
        started=performance.now();
        const items:PublicCourse[]=rows.map(({providerId,assetId,width,height,alt,categories,...facts})=>({...facts,
          provider:{id:providerId,name:providerNames[providerId]??providerId},
          thumbnail:assetId?{id:assetId,path:`/assets/thumbnails/${assetId}`,width,height,alt}:null,categoryIds:[...categories].sort()}));
        await observe?.({phase:'hydrate',rows:items.length,milliseconds:performance.now()-started});
        return {items,total,limit:query.limit,offset:query.offset};
      }); } catch { throw new CatalogError(503); }
    },
    async detail(id) {
      try { return await transaction(sql,true,async tx=>{
        await assertCourseQueryReady(tx);
        const rows=await tx.unsafe<(SnapshotRow & {categories:CategoryId[]})[]>(`WITH ${eligibleGroups}
          SELECT ${snapshotProjection},${categories} AS categories ${snapshotJoins}
          JOIN courses c ON c.id=s.course_id AND c.current_snapshot_id=s.id WHERE c.id=$1`,[id]);
        if(!rows.length) throw new CatalogError(404);
        return presentCourse(snapshotRow(rows[0]),[...rows[0].categories].sort());
      }); } catch(error) { if(error instanceof CatalogError)throw error;throw new CatalogError(503); }
    },
  };
}
