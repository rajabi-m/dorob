import { Elysia, t } from "elysia";
import { categoryRegistry, targetLevels, type CategoryId, type TargetLevel } from "@dorob/core";
import { CatalogError, type CatalogRepository, type CourseInput, type GroupInput } from "./catalog";

const category = t.Unsafe<CategoryId>(t.Union(categoryRegistry.map(item => t.Literal(item.id))));
const level = t.Unsafe<TargetLevel | null>(t.Union([...targetLevels.map(value => t.Literal(value)), t.Null()]));
const text = (maxLength: number) => t.String({ minLength: 1, maxLength, pattern: "\\S" });
const slug = t.String({ minLength: 1, maxLength: 100, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" });
const courseInput = t.Object({
  providerId: t.String({ minLength: 1, maxLength: 64, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
  providerCourseId: text(200), title: text(300), sourceUrl: text(2048),
}, { additionalProperties: false, examples: [{ providerId: "local-test", providerCourseId: "python-one", title: "نمونهٔ آزمایشی پایتون یک", sourceUrl: "https://example.com/python-one" }] });
const groupProperties = { slug, title: text(300), description: text(2000), categoryId: category,
  targetLevel: t.Optional(level), isPublished: t.Optional(t.Boolean()) };
const groupInput = t.Object(groupProperties, { additionalProperties: false, examples: [{ slug: "local-test-python", title: "گروه آزمایشی پایتون", description: "دادهٔ آزمایشی برای بررسی گروه‌بندی دستی", categoryId: "code", targetLevel: "beginner" }] });
const groupPatch = t.Partial(groupInput, { minProperties: 1, additionalProperties: false });
const pagination = {
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, multipleOf: 1, default: 20 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 2147483647, multipleOf: 1, default: 0 })),
};
const pageQuery = t.Object(pagination);
const groupParams = t.Object({ id: t.String({ format: "uuid" }) });
const memberParams = t.Object({ id: t.String({ format: "uuid" }), courseId: text(265) });
const errorSchema = t.Object({ error: t.Object({ code: t.String(), message: t.String() }) });
const errors = { 404: errorSchema, 409: errorSchema, 422: errorSchema, 503: errorSchema };
const course = t.Object({ id: t.String(), providerId: t.String(), providerCourseId: t.String(), title: t.String(), sourceUrl: t.String() }, {
  description: "Manually registered minimal reference; no prices, syllabus, freshness, or provider-level facts.",
});
const group = t.Object({ id: t.String({ format: "uuid" }), slug: t.String(), title: t.String(), description: t.String(),
  categoryId: category, targetLevel: level, isPublished: t.Boolean(), courseCount: t.Integer({ minimum: 0 }) });
const page = <T extends typeof course | typeof group>(item: T) => t.Object({ items: t.Array(item), total: t.Integer(), limit: t.Integer(), offset: t.Integer() });
const detail = t.Object({ ...group.properties, courses: page(course) });
const paging = (query: { limit?: number; offset?: number }) => ({ limit: query.limit ?? 20, offset: query.offset ?? 0 });
const trim = <T extends Partial<CourseInput & GroupInput>>(input: T): T => Object.fromEntries(
  Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
) as T;

export function catalogRoutes(repository?: CatalogRepository) {
  function repo() { if (!repository) throw new CatalogError(503); return repository; }
  return new Elysia({ name: "catalog", normalize: false })
    .onError(({ error, code, set }) => {
      const failure = (code === "VALIDATION" && !("type" in error && error.type === "response")) || code === "PARSE" ? new CatalogError(422) : error instanceof CatalogError ? error : new CatalogError(503);
      set.status = failure.status;
      return { error: { code: { 404: "not_found", 409: "conflict", 422: "invalid_input", 503: "unavailable" }[failure.status], message: failure.message } };
    })
    .put("/api/v1/manage/courses", async ({ body, status }) => {
      const input = trim(body);
      try {
        const url = new URL(input.sourceUrl);
        if (!["http:", "https:"].includes(url.protocol) || /\s/.test(input.sourceUrl)) throw new Error();
      } catch { throw new CatalogError(422); }
      const result = await repo().registerCourse(input);
      return status(result.created ? 201 : 200, result.course);
    }, { body: courseInput, response: { 200: course, 201: course, ...errors }, detail: { tags: ["Local management"], summary: "Register or update a minimal course reference" } })
    .get("/api/v1/manage/courses", ({ query }) => repo().listCourses(paging(query)), {
      query: pageQuery, response: { 200: page(course), ...errors }, detail: { tags: ["Local management"], summary: "List registered references ordered by canonical ID" },
    })
    .post("/api/v1/manage/groups", async ({ body, status }) => status(201, await repo().createGroup({ ...trim(body), targetLevel: body.targetLevel ?? null, isPublished: body.isPublished ?? false })), {
      body: groupInput, response: { 201: group, ...errors }, detail: { tags: ["Local management"], summary: "Create an editorial group (draft by default)" },
    })
    .get("/api/v1/manage/groups", ({ query }) => repo().listGroups(paging(query)), {
      query: pageQuery, response: { 200: page(group), ...errors }, detail: { tags: ["Local management"], summary: "List all groups, including drafts" },
    })
    .get("/api/v1/manage/groups/:id", ({ params, query }) => repo().groupDetail(params.id, paging(query)), {
      params: groupParams, query: pageQuery, response: { 200: detail, ...errors }, detail: { tags: ["Local management"], summary: "Read a group with paginated minimal references" },
    })
    .patch("/api/v1/manage/groups/:id", ({ params, body }) => repo().updateGroup(params.id, trim(body)), {
      params: groupParams, body: groupPatch, response: { 200: group, ...errors }, detail: { tags: ["Local management"], summary: "Edit supplied fields, preserving ID and memberships" },
    })
    .put("/api/v1/manage/groups/:id/courses/:courseId", async ({ params, status }) => {
      await repo().membership(params.id, params.courseId, true); return status(204, undefined);
    }, { params: memberParams, response: { 204: t.Void(), ...errors }, detail: { tags: ["Local management"], summary: "Idempotently assign an existing course (URL-encode courseId)" } })
    .delete("/api/v1/manage/groups/:id/courses/:courseId", async ({ params, status }) => {
      await repo().membership(params.id, params.courseId, false); return status(204, undefined);
    }, { params: memberParams, response: { 204: t.Void(), ...errors }, detail: { tags: ["Local management"], summary: "Idempotently remove a link; both parents must exist" } })
    .get("/api/v1/groups", ({ query }) => repo().listGroups(paging(query), true, query.category), {
      query: t.Object({ ...pagination, category: t.Optional(category) }), response: { 200: page(group), ...errors },
      detail: { tags: ["Public catalog"], summary: "Published groups with at least two members; ordered by slug" },
    })
    .get("/api/v1/groups/:slug", ({ params, query }) => repo().groupDetail(params.slug, paging(query), true), {
      params: t.Object({ slug }), query: pageQuery, response: { 200: detail, ...errors },
      detail: { tags: ["Public catalog"], summary: "Eligible group with paginated minimal course references" },
    });
}
