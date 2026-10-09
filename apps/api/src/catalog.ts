import type { ReservedSQL, SQL } from "bun";
import type { CategoryId, CourseGroup, CourseReference, GroupDetail, Page } from "@dorob/core";

export type Pagination = { limit: number; offset: number };
export type CourseInput = Omit<CourseReference, "id">;
export type GroupInput = Omit<CourseGroup, "id" | "courseCount">;
export class CatalogError extends Error {
  constructor(public readonly status: 404 | 409 | 422 | 503) {
    super({ 404: "Record not found.", 409: "Catalog identity conflicts with an existing record.", 422: "Invalid catalog input.", 503: "Catalog database unavailable." }[status]);
  }
}
export interface CatalogRepository {
  registerCourse(input: CourseInput): Promise<{ course: CourseReference; created: boolean }>;
  listCourses(page: Pagination): Promise<Page<CourseReference>>;
  createGroup(input: GroupInput): Promise<CourseGroup>;
  updateGroup(id: string, patch: Partial<GroupInput>): Promise<CourseGroup>;
  listGroups(page: Pagination, publicOnly?: boolean, category?: CategoryId): Promise<Page<CourseGroup>>;
  groupDetail(key: string, page: Pagination, publicOnly?: boolean): Promise<GroupDetail>;
  membership(groupId: string, courseId: string, linked: boolean): Promise<void>;
}

function safeError(error: unknown): CatalogError {
  if (error instanceof CatalogError) return error;
  const code = typeof error === "object" && error !== null && "errno" in error ? String(error.errno) : "";
  if (code === "23505") return new CatalogError(409);
  if (code === "23503") return new CatalogError(404);
  if (["23514", "23502", "22P02"].includes(code)) return new CatalogError(422);
  return new CatalogError(503);
}

/** Reserved sessions avoid Bun 1.3.8 transaction callback rejection leakage. */
export async function transaction<T>(sql: SQL, readOnly: boolean, work: (tx: ReservedSQL) => Promise<T>): Promise<T> {
  let tx: ReservedSQL | undefined;
  let active = false;
  try {
    tx = await sql.reserve();
    await tx.unsafe(readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN");
    active = true;
    const result = await work(tx);
    await tx.unsafe("COMMIT");
    active = false;
    return result;
  } catch (error) {
    if (active && tx) { try { await tx.unsafe("ROLLBACK"); } catch { /* Preserve the original safe error. */ } }
    throw safeError(error);
  } finally { tx?.release(); }
}

// Static projection strings only; all caller values use SQL parameters.
const courseFields = `id, provider_id AS "providerId", provider_course_id AS "providerCourseId", title, source_url AS "sourceUrl"`;
const groupFields = `g.id, g.slug, g.title, g.description, g.category_id AS "categoryId", g.target_level AS "targetLevel", g.is_published AS "isPublished", (SELECT count(*)::int FROM course_group_courses m WHERE m.group_id=g.id) AS "courseCount"`;
const eligibility = `g.is_published AND (SELECT count(*) FROM course_group_courses m WHERE m.group_id=g.id) >= 2`;

export function createCatalogRepository(sql: SQL): CatalogRepository {
  return {
    registerCourse(input) {
      return transaction(sql, false, async tx => {
        const id = `${input.providerId}:${input.providerCourseId}`;
        const rows: (CourseReference & { created: boolean })[] = await tx.unsafe(`
          INSERT INTO courses(id,provider_id,provider_course_id,title,source_url) VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (provider_id,provider_course_id) DO UPDATE SET title=EXCLUDED.title, source_url=EXCLUDED.source_url, updated_at=now()
          RETURNING ${courseFields}, (xmax=0) AS created`, [id, input.providerId, input.providerCourseId, input.title, input.sourceUrl]);
        const { created, ...course } = rows[0];
        return { course, created };
      });
    },
    listCourses(page) {
      return transaction(sql, true, async tx => {
        const items: CourseReference[] = await tx.unsafe(`SELECT ${courseFields} FROM courses ORDER BY id COLLATE "C" LIMIT $1 OFFSET $2`, [page.limit, page.offset]);
        const [{ total }] = await tx`SELECT count(*)::int AS total FROM courses`;
        return { items, total, ...page };
      });
    },
    createGroup(input) {
      return transaction(sql, false, async tx => {
        const [row] = await tx`INSERT INTO course_groups(slug,title,description,category_id,target_level,is_published)
          VALUES (${input.slug},${input.title},${input.description},${input.categoryId},${input.targetLevel},${input.isPublished}) RETURNING id`;
        const groups: CourseGroup[] = await tx.unsafe(`SELECT ${groupFields} FROM course_groups g WHERE g.id=$1`, [row.id]);
        return groups[0];
      });
    },
    updateGroup(id, patch) {
      return transaction(sql, false, async tx => {
        const columns: Record<keyof GroupInput, string> = { slug: "slug", title: "title", description: "description", categoryId: "category_id", targetLevel: "target_level", isPublished: "is_published" };
        const entries = Object.entries(patch) as [keyof GroupInput, GroupInput[keyof GroupInput]][];
        if (!entries.length || entries.some(([key]) => !Object.hasOwn(columns, key))) throw new CatalogError(422);
        const assignments = entries.map(([key], index) => `${columns[key]}=$${index + 2}`).join(",");
        const rows = await tx.unsafe(`UPDATE course_groups SET ${assignments}, updated_at=now() WHERE id=$1 RETURNING id`, [id, ...entries.map(([, value]) => value)]);
        if (!rows.length) throw new CatalogError(404);
        const groups: CourseGroup[] = await tx.unsafe(`SELECT ${groupFields} FROM course_groups g WHERE g.id=$1`, [id]);
        return groups[0];
      });
    },
    listGroups(page, publicOnly = false, category) {
      return transaction(sql, true, async tx => {
        const predicate = `${publicOnly ? eligibility : "TRUE"} AND ($1::text IS NULL OR g.category_id=$1)`;
        const items: CourseGroup[] = await tx.unsafe(`SELECT ${groupFields} FROM course_groups g WHERE ${predicate} ORDER BY g.slug COLLATE "C", g.id LIMIT $2 OFFSET $3`, [category ?? null, page.limit, page.offset]);
        const [{ total }] = await tx.unsafe(`SELECT count(*)::int AS total FROM course_groups g WHERE ${predicate}`, [category ?? null]);
        return { items, total, ...page };
      });
    },
    groupDetail(key, page, publicOnly = false) {
      return transaction(sql, true, async tx => {
        const groups: CourseGroup[] = await tx.unsafe(`SELECT ${groupFields} FROM course_groups g WHERE ${publicOnly ? `g.slug=$1 AND ${eligibility}` : "g.id=$1::uuid"}`, [key]);
        const group = groups[0];
        if (!group) throw new CatalogError(404);
        const items: CourseReference[] = await tx.unsafe(`SELECT ${courseFields} FROM courses WHERE id IN (SELECT course_id FROM course_group_courses WHERE group_id=$1) ORDER BY id COLLATE "C" LIMIT $2 OFFSET $3`, [group.id, page.limit, page.offset]);
        return { ...group, courses: { items, total: group.courseCount, ...page } };
      });
    },
    membership(groupId, courseId, linked) {
      return transaction(sql, false, async tx => {
        const groups = await tx`SELECT id FROM course_groups WHERE id=${groupId}::uuid FOR KEY SHARE`;
        const courses = await tx`SELECT id FROM courses WHERE id=${courseId} FOR KEY SHARE`;
        if (!groups.length || !courses.length) throw new CatalogError(404);
        if (linked) await tx`INSERT INTO course_group_courses(group_id,course_id) VALUES (${groupId}::uuid,${courseId}) ON CONFLICT DO NOTHING`;
        else await tx`DELETE FROM course_group_courses WHERE group_id=${groupId}::uuid AND course_id=${courseId}`;
      });
    },
  };
}
