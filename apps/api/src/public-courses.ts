import type { SQL } from 'bun';
import type { CategoryId, CourseQuery, Page, PublicCourse, PublicCourseDetail } from '@dorob/core';
import { CatalogError, transaction } from './catalog';
import { snapshotProjection, snapshotJoins, snapshotRow, type SnapshotRow } from './ingestion';
import type { ThumbnailService } from './thumbnails';
import { normalizeSearch, presentCourse } from './public-course-projection';
export interface PublicCourseRepository { list(query: CourseQuery): Promise<Page<PublicCourse>>; detail(id: string): Promise<PublicCourseDetail> }
export function createPublicCourseRepository(sql: SQL, thumbnails: Pick<ThumbnailService,'inspectAvailability'>): PublicCourseRepository {
  async function read(id?: string) {
    // One consistent DB view for current facts and editorial eligibility. No per-course management calls.
    const rows = await transaction(sql,true,async tx => tx.unsafe<(SnapshotRow & { storageKey:string; categories:CategoryId[] })[]>(`
      SELECT ${snapshotProjection}, COALESCE((SELECT jsonb_agg(DISTINCT g.category_id) FROM course_group_courses m JOIN course_groups g ON g.id=m.group_id
        WHERE m.course_id=s.course_id AND g.is_published AND (SELECT count(*) FROM course_group_courses x WHERE x.group_id=g.id)>=2),'[]'::jsonb) AS categories
      ${snapshotJoins} JOIN courses c ON c.current_snapshot_id=s.id
      WHERE a.status='ready' AND f.id IS NOT NULL AND ($1::text IS NULL OR c.id=$1)
      ORDER BY s.received_at DESC,c.id COLLATE "C"`,[id ?? null]));
    const ready = new Array<boolean>(rows.length);
    let cursor = 0;
    await Promise.all(Array.from({ length:Math.min(4,rows.length) },async () => {
      while (cursor < rows.length) { const index = cursor++; ready[index] = await thumbnails.inspectAvailability(snapshotRow(rows[index]),rows[index].storageKey); }
    }));
    return rows.filter((_,i) => ready[i]).map(row => presentCourse(snapshotRow(row),[...row.categories].sort()));
  }
  return {
    async list(query) {
      try {
        const search = normalizeSearch(query.q);
        const matches = (await read()).filter(c => (!query.category || c.categoryIds.includes(query.category)) && (!query.freeOnly || c.price.status === 'free') && (!query.provider || c.provider.id === query.provider) && (!query.priceStatus || c.price.status === query.priceStatus) && (!query.duration || (c.contentMinutes !== null && (query.duration === 'under-3h' ? c.contentMinutes < 180 : query.duration === '3-to-10h' ? c.contentMinutes >= 180 && c.contentMinutes < 600 : c.contentMinutes >= 600))) && normalizeSearch(`${c.title} ${c.provider.id} ${c.provider.name} ${c.instructors?.map(i => i.name).join(' ') ?? ''}`).includes(search));
        // Literal in-memory substring normalization deliberately avoids SQL LIKE wildcards.
        const items = matches.slice(query.offset,query.offset+query.limit).map(c => { const { description,syllabus,offers,...item } = c; void description; void syllabus; void offers; return item; });
        return { items,total:matches.length,limit:query.limit,offset:query.offset };
      } catch { throw new CatalogError(503); }
    },
    async detail(id) {
      try { const [course] = await read(id); if (!course) throw new CatalogError(404); return course; }
      catch(error) { if (error instanceof CatalogError) throw error; throw new CatalogError(503); }
    },
  };
}
