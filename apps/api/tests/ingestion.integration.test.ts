import { describe, test, expect } from "bun:test";
import { isolatedDatabase } from "./helpers";
import { migrate, readMigrations } from "../src/migrations";
import { createIngestionRepository } from "../src/ingestion";
import { createCatalogRepository } from "../src/catalog";
import { minimal, rich } from "./ingestion-validation.test";

describe.skipIf(process.env.API_INTEGRATION !== "1")("retained observations", () => {
  test("concurrent identity, retries, acceptance order, memberships and whole current", async () => {
    await isolatedDatabase(async sql => {
      await migrate(sql, await readMigrations()); const repo = createIngestionRepository(sql), catalog = createCatalogRepository(sql);
      const input = rich();
      const registered = await catalog.registerCourse(input);
      const group = await catalog.createGroup({ slug: "sample", title: "نمونه", description: "شرح", categoryId: "code", targetLevel: null, isPublished: true });
      await catalog.membership(group.id, registered.course.id, true);
      const concurrent = await Promise.all([repo.ingest(input), repo.ingest(input), repo.ingest(input)]);
      expect(concurrent.filter(row => row.created)).toHaveLength(1); expect(new Set(concurrent.map(row => row.snapshot.id)).size).toBe(1);
      const first = concurrent[0].snapshot;
      const later = rich(); later.submissionId = "later"; later.source.checkedAt = "2026-10-11T00:00:00Z";
      const second = (await repo.ingest(later)).snapshot;
      expect(second.id).not.toBe(first.id); expect(second.factHash).toBe(first.factHash);
      expect((await repo.ingest(input)).created).toBe(false); expect((await repo.current(first.courseId)).snapshot?.id).toBe(second.id);
      const conflict = rich(); conflict.title = "changed"; await expect(repo.ingest(conflict)).rejects.toMatchObject({ status: 409 });
      const sparse = minimal(); sparse.submissionId = "sparse"; sparse.source.checkedAt = "2026-10-09T00:00:00Z"; sparse.description = { coverage: { status: "failed", reason: "Unavailable" }, data: null };
      const third = (await repo.ingest(sparse)).snapshot; const current = await repo.current(first.courseId);
      expect(current.snapshot!.id).toBe(third.id); expect(current.snapshot!.payload.education).toBeUndefined(); expect(current.snapshot!.payload.feedback).toBeUndefined();
      expect(current.snapshot!.payload.description!.coverage.status).toBe("failed"); expect(current.presentationReady).toBe(false);
      expect((await repo.snapshot(first.courseId, first.id)).payload).toEqual(input);
      expect((await catalog.groupDetail(group.id, { limit: 20, offset: 0 })).courses.items[0].id).toBe(first.courseId);
      expect((await repo.history(first.courseId, { limit: 2, offset: 0 })).items.map(item => item.id)).toEqual([third.id, second.id]);
      expect((await repo.history(first.courseId, { limit: 2, offset: 2 })).items.map(item => item.id)).toEqual([first.id]);
      const checks = await Promise.all(Array.from({ length: 5 }, (_, n) => repo.ingest({ ...sparse, submissionId: `parallel-${n}` })));
      expect(new Set(checks.map(row => row.snapshot.acceptanceOrder)).size).toBe(5);
      expect((await repo.current(first.courseId)).snapshot!.acceptanceOrder).toBe(8);
      await migrate(sql, await readMigrations()); const restarted = createIngestionRepository(sql);
      expect((await restarted.history(first.courseId, { limit: 100, offset: 0 })).total).toBe(8);
      await catalog.registerCourse({ ...input, title: "manual reference edit" });
      expect((await repo.current(first.courseId)).reference.title).toBe("manual reference edit"); expect((await repo.current(first.courseId)).snapshot!.payload.title).toBe(sparse.title);
    });
  });
  test("legacy has no implied facts; invalid/rejected submissions are atomic", async () => {
    await isolatedDatabase(async sql => {
      await migrate(sql, await readMigrations()); const repo = createIngestionRepository(sql);
      const catalog = createCatalogRepository(sql); await catalog.registerCourse(minimal());
      expect((await repo.current("example:101")).snapshot).toBeNull(); expect((await repo.history("example:101", { limit: 20, offset: 0 })).total).toBe(0);
      await expect(repo.current("missing")).rejects.toMatchObject({ status: 404 });
      const bad = rich(); bad.providerCourseId = "upload"; bad.thumbnail.data = { kind: "upload", uploadId: "a".repeat(64), alt: "test" };
      await expect(repo.ingest(bad)).rejects.toMatchObject({ status: 404 }); expect((await sql`SELECT id FROM courses WHERE id='example:upload'`).length).toBe(0);
      const first = (await repo.ingest(minimal())).snapshot;
      const other = minimal(); other.providerCourseId = "other"; const second = (await repo.ingest(other)).snapshot;
      let rejected = false;
      try { await sql`UPDATE courses SET current_snapshot_id=${first.id} WHERE id=${second.courseId}`; } catch { rejected = true; }
      expect(rejected).toBe(true);
      await expect(repo.snapshot(second.courseId, first.id)).rejects.toMatchObject({ status: 404 });
    });
  });
});
