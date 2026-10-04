import { beforeAll, beforeEach, afterAll, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "@dorob/db";
import { courses, revisions, observations, groups, memberships, runs, snapshots, attempts } from "@dorob/db/schema";
import { createCourse, type ProviderCourse } from "@dorob/utils/course";
import { importSavedExport } from "@dorob/backend/importer";
import { createQueue, setupQueues, BUILD_GROUP, FINALIZE_GROUP, type Queue } from "@dorob/backend/queue";
import { createDraftGroup, publishGroup } from "@dorob/backend/groups";
import { buildGroup, finalizeGroup, recordAttempt } from "@dorob/backend/workflows";
import { readGroup } from "@dorob/backend/queries";
import type { GroupJob } from "@dorob/core";
import { createHandler } from "../src/http.ts";

const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== "/dorob_test") throw new Error("Integration tests require an isolated dorob_test database; use test:backend:integration");
const connection = createDatabase(url, 5);
const db = connection.db;
let boss: Queue;
const config = { DATABASE_URL: url, PGBOSS_SCHEMA: "pgboss" };

function sample(id: string, checkedAt = "2026-10-01T00:00:00Z") {
  const course = createCourse("offline-test", id, `نمونه آزمایشی Python ${id}`, `https://example.invalid/course/${id}`, checkedAt);
  course.availability = "available";
  course.raw = { privateEvidence: "MUST_NOT_REACH_HTTP" };
  course.source.warnings = ["secret source evidence MUST_NOT_REACH_HTTP"];
  return course;
}
function saved(courses: ProviderCourse[], errors: { sourceUrl: string; message: string; attemptedAt: string }[] = []) {
  return { schemaVersion: 2, providerId: "offline-test", courses, errors };
}
const definition = { slug: "python-test", title: "مقایسه آزمایشی پایتون", topic: "Python", targetLevel: null,
  criteria: "تعریف دستی برای آزمایش آفلاین؛ معیار واقعی انتشار نیست." };
async function seedGroup() {
  await importSavedExport(db, saved([sample("1"), sample("2")]));
  return createDraftGroup(db, boss, definition, ["offline-test:1", "offline-test:2"]);
}
function payload(result: { groupId: string; workflowRunId: string }): GroupJob {
  return { version: 1, groupId: result.groupId, workflowRunId: result.workflowRunId };
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: new URL("../../../packages/db/migrations", import.meta.url).pathname });
  // Second invocation demonstrates idempotent migration application.
  await migrate(db, { migrationsFolder: new URL("../../../packages/db/migrations", import.meta.url).pathname });
  boss = createQueue(config, true);
  await boss.start();
  await setupQueues(boss);
  await boss.updateQueue(BUILD_GROUP, { retryDelay: 0, retryBackoff: false });
});
beforeEach(async () => {
  await boss.deleteAllJobs();
  // Guard above confines this reset to an ephemeral database with test credentials.
  await db.execute(sql`truncate workflow_attempts, group_snapshots, workflow_runs, group_memberships, comparison_groups, course_observations, course_revisions, courses, providers cascade`);
});
afterAll(async () => { if (boss) await boss.stop(); await connection.close(); });

test("pgvector and pinned queue schema are installed", async () => {
  const rows = await connection.client`select '[1,2,3]'::vector <-> '[1,2,4]'::vector as distance`;
  expect(Number(rows[0].distance)).toBe(1);
  const [row] = await connection.client`select version from pgboss.version`;
  expect(row.version).toBe(43);
});
test("unchanged imports deduplicate revisions and advance successful freshness", async () => {
  await importSavedExport(db, saved([sample("1")]));
  await importSavedExport(db, saved([sample("1")]));
  await importSavedExport(db, saved([sample("1", "2026-10-02T00:00:00Z")]));
  expect(await db.select().from(courses)).toHaveLength(1);
  expect(await db.select().from(revisions)).toHaveLength(1);
  expect(await db.select().from(observations)).toHaveLength(2);
  const [course] = await db.select().from(courses);
  expect(course.lastSuccessfulCheck!.toISOString()).toBe("2026-10-02T00:00:00.000Z");
});
test("failed and out-of-order observations preserve newer valid facts", async () => {
  const newer = sample("1", "2026-10-03T00:00:00Z"); newer.title = "عنوان تازه";
  await importSavedExport(db, saved([newer]));
  const [before] = await db.select().from(courses);
  await importSavedExport(db, saved([sample("1")], [{ sourceUrl: newer.sourceUrl, message: "Collection failed", attemptedAt: "2026-10-04T00:00:00Z" }]));
  const [after] = await db.select().from(courses);
  expect(after.currentRevisionId).toBe(before.currentRevisionId);
  expect(after.lastSuccessfulCheck).toEqual(before.lastSuccessfulCheck);
  expect(await db.select().from(revisions)).toHaveLength(2);
  expect(await db.select().from(observations)).toHaveLength(3);
});
test("evidence-only changes retain an immutable revision", async () => {
  const first = sample("1");
  await importSavedExport(db, saved([first]));
  const changed = sample("1", "2026-10-02T00:00:00Z"); changed.raw = { otherLocator: "new evidence" };
  await importSavedExport(db, saved([changed]));
  const rows = await db.select().from(revisions);
  expect(rows).toHaveLength(2);
  expect(rows[0].contentHash).toBe(rows[1].contentHash);
  expect(rows[0].evidenceHash).not.toBe(rows[1].evidenceHash);
});
test("malformed whole export and conflicting observation roll back all writes", async () => {
  const invalid = { ...sample("2"), offers: "invented" };
  await expect(importSavedExport(db, { schemaVersion: 2, providerId: "offline-test", courses: [sample("1"), invalid] })).rejects.toThrow();
  expect(await db.select().from(courses)).toHaveLength(0);
  await importSavedExport(db, saved([sample("1")]));
  const conflicting = sample("1"); conflicting.title = "متناقض";
  await expect(importSavedExport(db, saved([conflicting, sample("2")]))).rejects.toThrow();
  expect(await db.select().from(courses)).toHaveLength(1);
  expect(await db.select().from(revisions)).toHaveLength(1);
});
test("conflicting historical timestamps are rejected after a newer refresh", async () => {
  await importSavedExport(db, saved([sample("1")]));
  const newer = sample("1", "2026-10-03T00:00:00Z"); newer.title = "مدرک تازه";
  await importSavedExport(db, saved([newer]));
  const conflict = sample("1"); conflict.title = "تغییر متناقض در تاریخ قبلی";
  await expect(importSavedExport(db, saved([conflict]))).rejects.toThrow();
  expect(await db.select().from(revisions)).toHaveLength(2);
  expect(await db.select().from(observations)).toHaveLength(2);
});
test("parallel imports converge on the same source identity", async () => {
  await Promise.all([importSavedExport(db, saved([sample("1"), sample("2")])), importSavedExport(db, saved([sample("2"), sample("1")]))]);
  expect(await db.select().from(courses)).toHaveLength(2);
  expect(await db.select().from(revisions)).toHaveLength(2);
  expect(await db.select().from(observations)).toHaveLength(2);
});
test("group creation and job insertion roll back together", async () => {
  await importSavedExport(db, saved([sample("1"), sample("2")]));
  const failing = new Proxy(boss, { get(target, property) { return property === "send" ? async () => { throw new Error("Injected queue failure"); } : Reflect.get(target, property); } });
  await expect(createDraftGroup(db, failing, definition, ["offline-test:1", "offline-test:2"])).rejects.toThrow();
  expect(await db.select().from(groups)).toHaveLength(0);
  expect(await db.select().from(runs)).toHaveLength(0);
  expect(await boss.findJobs(BUILD_GROUP)).toHaveLength(0);
});
test("result/follow-up rollback, retry and restart cannot duplicate accepted outputs", async () => {
  const result = await seedGroup();
  const message = payload(result);
  const failing = new Proxy(boss, { get(target, property) { return property === "send" ? async () => { throw new Error("Injected queue failure"); } : Reflect.get(target, property); } });
  await expect(buildGroup(db, failing, message)).rejects.toThrow();
  expect(await db.select().from(snapshots)).toHaveLength(0);
  expect(await boss.findJobs(FINALIZE_GROUP)).toHaveLength(0);
  const [job] = await boss.fetch<GroupJob>(BUILD_GROUP);
  await expect(recordAttempt(db, job.id, BUILD_GROUP, message, () => buildGroup(db, failing, message))).rejects.toThrow();
  await boss.fail(BUILD_GROUP, job.id, { error: "Injected transient failure" });
  await boss.stop();
  boss = createQueue(config);
  await boss.start();
  const [retried] = await boss.fetch<GroupJob>(BUILD_GROUP);
  expect(retried.id).toBe(job.id);
  await recordAttempt(db, retried.id, BUILD_GROUP, message, () => buildGroup(db, boss, message));
  await buildGroup(db, boss, message); // Crash after commit, before queue completion.
  expect(await db.select().from(snapshots)).toHaveLength(1);
  expect(await boss.findJobs(FINALIZE_GROUP)).toHaveLength(1);
  await boss.complete(BUILD_GROUP, retried.id);
  const [next] = await boss.fetch<GroupJob>(FINALIZE_GROUP);
  await recordAttempt(db, next.id, FINALIZE_GROUP, message, () => finalizeGroup(db, message));
  await finalizeGroup(db, message);
  await boss.complete(FINALIZE_GROUP, next.id);
  const history = await db.select().from(attempts);
  expect(history.map(attempt => attempt.state).sort()).toEqual(["failed", "succeeded", "succeeded"]);
  expect((await db.select().from(runs))[0].state).toBe("succeeded");
});
test("duplicate group requests coalesce without overwriting definitions", async () => {
  const result = await seedGroup();
  const again = await createDraftGroup(db, boss, definition, ["offline-test:2", "offline-test:1"]);
  expect(again.workflowRunId).toBe(result.workflowRunId);
  expect(again.queued).toBe(false);
  expect(await boss.findJobs(BUILD_GROUP)).toHaveLength(1);
  await expect(createDraftGroup(db, boss, { ...definition, topic: "Other" }, ["offline-test:1", "offline-test:2"])).rejects.toThrow();
});
test("newer evidence supersedes a stale job and blocks publication", async () => {
  const result = await seedGroup();
  const changed = sample("1", "2026-10-02T00:00:00Z"); changed.title = "مدرک جدید";
  await importSavedExport(db, saved([changed]));
  await buildGroup(db, boss, payload(result));
  expect((await db.select().from(runs))[0].state).toBe("superseded");
  expect(await db.select().from(snapshots)).toHaveLength(0);
  await expect(publishGroup(db, definition.slug)).rejects.toThrow();
});
test("changes between build and finalize cannot promote stale results", async () => {
  const result = await seedGroup();
  await buildGroup(db, boss, payload(result));
  const changed = sample("2", "2026-10-02T00:00:00Z"); changed.availability = "unavailable";
  await importSavedExport(db, saved([changed]));
  await finalizeGroup(db, payload(result));
  expect((await db.select().from(runs))[0].state).toBe("superseded");
  expect((await db.select().from(groups))[0].currentSnapshotId).toBeNull();
});
test("manual publication serves only curated facts, then hides below-minimum groups", async () => {
  const result = await seedGroup();
  await buildGroup(db, boss, payload(result));
  await finalizeGroup(db, payload(result));
  expect(await readGroup(db, definition.slug)).toBeNull();
  expect((await readGroup(db, definition.slug, true))?.analysis).toBeNull();
  await publishGroup(db, definition.slug);
  const handler = createHandler({ ready: async () => {}, group: (slug, draft) => readGroup(db, slug, draft) });
  const response = await handler(new Request(`http://localhost/v1/groups/${definition.slug}`));
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).not.toContain("MUST_NOT_REACH_HTTP");
  expect(body).not.toContain('"raw"');
  expect(JSON.parse(body).courses).toHaveLength(2);
  const changed = sample("1", "2026-10-02T00:00:00Z"); changed.availability = "unavailable";
  await importSavedExport(db, saved([changed]));
  expect(await readGroup(db, definition.slug)).toBeNull();
  expect((await db.select().from(groups))[0].publishedSnapshotId).not.toBeNull();
  expect(await db.select().from(snapshots)).toHaveLength(1);
});
test("membership cannot point at another course's revision", async () => {
  const result = await seedGroup();
  const [other] = await db.select().from(courses).where(eq(courses.id, "offline-test:2"));
  await expect(db.update(memberships).set({ approvedRevisionId: other.currentRevisionId! })
    .where(eq(memberships.courseId, "offline-test:1")).execute()).rejects.toThrow();
  expect(result.queued).toBe(true);
});
test("retained evidence cannot be edited or deleted", async () => {
  const result = await seedGroup();
  await buildGroup(db, boss, payload(result));
  const [revision] = await db.select().from(revisions);
  await expect(db.update(revisions).set({ contentHash: "tampered" }).where(eq(revisions.id, revision.id)).execute()).rejects.toThrow();
  await expect(db.delete(snapshots).execute()).rejects.toThrow();
  expect((await db.select().from(revisions))[0].contentHash).not.toBe("tampered");
});
test("operator reapproval keeps current source facts separate from retained publication", async () => {
  const result = await seedGroup();
  await buildGroup(db, boss, payload(result));
  await finalizeGroup(db, payload(result));
  await publishGroup(db, definition.slug);
  const changed = sample("1", "2026-10-02T00:00:00Z");
  changed.duration.contentMinutes = 120;
  await importSavedExport(db, saved([changed]));
  const next = await createDraftGroup(db, boss, definition, ["offline-test:1", "offline-test:2"]);
  expect(next.workflowRunId).not.toBe(result.workflowRunId);
  const published = await readGroup(db, definition.slug);
  expect(published?.stale).toBe(true);
  expect(published?.courses.find(course => course.id === changed.id)?.durationMinutes).toBe(120);
  await expect(publishGroup(db, definition.slug)).rejects.toThrow();
  await buildGroup(db, boss, payload(next));
  await finalizeGroup(db, payload(next));
  await publishGroup(db, definition.slug);
  expect((await readGroup(db, definition.slug))?.stale).toBe(false);
});
