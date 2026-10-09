import { describe, expect, test } from "bun:test";
import { createCatalogRepository, transaction } from "../src/catalog";
import { migrate, readMigrations } from "../src/migrations";
import { isolatedDatabase } from "./helpers";

const page = { limit: 20, offset: 0 };
describe.skipIf(process.env.API_INTEGRATION !== "1")("PostgreSQL curation", () => {
  test("identity, editing, multi-group links, concurrent assignment and public transitions", async () => {
    await isolatedDatabase(async sql => {
      await migrate(sql, await readMigrations());
      const repo = createCatalogRepository(sql);
      const group = await repo.createGroup({ slug: "python-test", title: "پایتون نمونه", description: "شرح نمونه", categoryId: "code", targetLevel: null, isPublished: true });
      const other = await repo.createGroup({ slug: "other-test", title: "گروه نمونه", description: "شرح", categoryId: "tools", targetLevel: "mixed", isPublished: false });
      const input = { providerId: "test", providerCourseId: "opaque/آموزش:1", title: "مرجع نمونه", sourceUrl: "https://example.com/1" };
      const { course, created } = await repo.registerCourse(input);
      expect(created).toBe(true);
      await Promise.all(Array.from({ length: 8 }, () => repo.membership(group.id, course.id, true)));
      await repo.membership(other.id, course.id, true);
      expect((await repo.groupDetail(group.id, page)).courseCount).toBe(1);
      const update = await repo.registerCourse({ ...input, title: "عنوان جدید", sourceUrl: "http://example.com/new" });
      expect(update.created).toBe(false);
      expect(update.course.id).toBe(course.id);
      expect((await repo.listCourses(page)).total).toBe(1);
      expect((await repo.groupDetail(other.id, page)).courseCount).toBe(1);
      const edited = await repo.updateGroup(group.id, { description: "شرح جدید", targetLevel: "beginner" });
      expect(edited.id).toBe(group.id);
      expect(edited.courseCount).toBe(1);
      await expect(repo.updateGroup(group.id, { slug: other.slug })).rejects.toMatchObject({ status: 409 });
      expect((await repo.groupDetail(group.id, page)).slug).toBe(group.slug);
      expect((await repo.listGroups(page, true)).total).toBe(0);
      await expect(repo.groupDetail(group.slug, page, true)).rejects.toMatchObject({ status: 404 });
      const second = (await repo.registerCourse({ ...input, providerCourseId: "2" })).course;
      await repo.membership(group.id, second.id, true);
      expect((await repo.listGroups(page, true, "code")).total).toBe(1);
      expect((await repo.listGroups(page, true, "tools")).total).toBe(0);
      const publicDetail = await repo.groupDetail(group.slug, { limit: 1, offset: 1 }, true);
      expect(publicDetail.courses.total).toBe(2);
      expect(publicDetail.courses.items).toHaveLength(1);
      expect(publicDetail.courses.items[0].id).toBe(course.id);
      expect((await repo.listGroups({ limit: 1, offset: 99 }, true)).total).toBe(1);
      await repo.membership(group.id, second.id, false);
      await repo.membership(group.id, second.id, false);
      expect((await repo.listGroups(page, true)).total).toBe(0);
      expect((await repo.groupDetail(group.id, page)).isPublished).toBe(true);
      await repo.membership(group.id, second.id, true);
      expect((await repo.groupDetail(group.slug, page, true)).courseCount).toBe(2);
      await expect(repo.membership(group.id, "missing", true)).rejects.toMatchObject({ status: 404 });
      await expect(repo.membership(crypto.randomUUID(), course.id, false)).rejects.toMatchObject({ status: 404 });
      expect((await repo.groupDetail(group.id, page)).courseCount).toBe(2);
      await expect(transaction(sql, false, async tx => {
        await tx`UPDATE course_groups SET title='تغییر ناموفق' WHERE id=${group.id}::uuid`;
        await tx`INSERT INTO course_group_courses(group_id,course_id) VALUES (${group.id}::uuid,'missing')`;
      })).rejects.toMatchObject({ status: 404 });
      expect((await repo.groupDetail(group.id, page)).title).toBe(group.title);
    });
  });
});

describe.skipIf(process.env.API_INTEGRATION !== "1")("PostgreSQL HTTP catalog", () => {
  test("real route wiring, upserts, missing references and conflict rollback", async () => {
    const { createApp } = await import("../src/app");
    await isolatedDatabase(async sql => {
      await migrate(sql, await readMigrations());
      const app = createApp({ sql, ready: async () => true, close: async () => {} });
      const call = async (method: string, path: string, body?: unknown) => {
        const response = await app.handle(new Request(`http://localhost${path}`, { method, ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) }));
        return { status: response.status, body: response.status === 204 ? null : await response.json() };
      };
      const input = { providerId: "test", providerCourseId: "path/آموزش:1", title: "مرجع نمونه", sourceUrl: "https://example.com" };
      const c = await call("PUT", "/api/v1/manage/courses", input);
      expect(c.status).toBe(201);
      const gInput = { slug: "http-test", title: "عنوان نمونه", description: "شرح", categoryId: "code", isPublished: true };
      const g = (await call("POST", "/api/v1/manage/groups", gInput)).body;
      const member = `/api/v1/manage/groups/${g.id}/courses/${encodeURIComponent(c.body.id)}`;
      expect((await call("PUT", member)).status).toBe(204);
      expect((await call("PUT", member)).status).toBe(204);
      expect((await call("PUT", "/api/v1/manage/courses", { ...input, title: "عنوان جدید" })).body.id).toBe(c.body.id);
      expect((await call("GET", `/api/v1/manage/groups/${g.id}`)).body.courseCount).toBe(1);
      const conflict = await call("POST", "/api/v1/manage/groups", gInput);
      expect(conflict.status).toBe(409);
      expect(JSON.stringify(conflict.body)).not.toMatch(/INSERT|constraint|postgres/);
      expect((await call("PUT", `/api/v1/manage/groups/${g.id}/courses/missing`)).status).toBe(404);
      expect((await call("PATCH", `/api/v1/manage/groups/${g.id}`, { categoryId: "invalid" })).status).toBe(422);
      expect((await call("GET", `/api/v1/manage/groups/${g.id}`)).body.categoryId).toBe("code");
      const c2 = (await call("PUT", "/api/v1/manage/courses", { ...input, providerCourseId: "2" })).body;
      await call("PUT", `/api/v1/manage/groups/${g.id}/courses/${encodeURIComponent(c2.id)}`);
      expect((await call("GET", "/api/v1/groups?category=code&limit=1")).body.total).toBe(1);
      expect((await call("GET", `/api/v1/groups/${g.slug}?limit=1`)).body.courses.total).toBe(2);
      expect((await call("DELETE", member)).status).toBe(204);
      expect((await call("DELETE", member)).status).toBe(204);
      expect((await call("GET", `/api/v1/groups/${g.slug}`)).status).toBe(404);
    });
  });
  test("real connection failure yields safe 503 while categories remain available", async () => {
    const { createApp } = await import("../src/app");
    const { createDatabase } = await import("../src/database");
    const db = createDatabase("postgres://test:private-secret@127.0.0.1:1/test");
    try {
      const app = createApp(db);
      const response = await app.handle(new Request("http://localhost/api/v1/manage/groups"));
      expect(response.status).toBe(503);
      expect(await response.text()).not.toMatch(/private-secret|SELECT|postgres|127\.0/);
      expect((await app.handle(new Request("http://localhost/api/v1/categories"))).status).toBe(200);
    } finally { await db.close(); }
  });
});
