import { beforeAll, beforeEach, afterAll, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "@dorob/db";
import { courses, revisions, observations, groups, memberships, runs, snapshots, attempts, collections, selections, ingestionAttempts, providerLimits, invalidations } from "@dorob/db/schema";
import { createCourse, type ProviderCourse } from "@dorob/utils/course";
import { importSavedExport } from "@dorob/backend/importer";
import { createQueue, setupQueues, BUILD_GROUP, FINALIZE_GROUP, COLLECT, RECONCILE, type Queue } from "@dorob/backend/queue";
import { createDraftGroup, publishGroup } from "@dorob/backend/groups";
import { buildGroup, finalizeGroup, recordAttempt } from "@dorob/backend/workflows";
import { readGroup } from "@dorob/backend/queries";
import type { GroupJob } from "@dorob/core";
import { createHandler } from "../src/http.ts";

import { enqueueCollection, inspectCollection, processCollection, resumeCollection, dispatchInvalidations, reconcileInvalidation, type CollectionJob } from "@dorob/backend/ingestion";
import { coordinatedFetch } from "@dorob/backend/provider-transport";
import { fixtureTransport, maktabUrl, roocketUrl } from "../tests/provider-fixtures.ts";

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
  await db.execute(sql`truncate refresh_requests, provider_limits, ingestion_attempts, ingestion_selections, ingestion_collections, group_invalidations, workflow_attempts, group_snapshots, workflow_runs, group_memberships, comparison_groups, course_observations, course_revisions, courses, providers cascade`);
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

// Milestone 2: real queue delivery and PostgreSQL; all remote responses are fixtures.

async function drainCollections(transport = fixtureTransport()) {
  for (let step = 0; step < 20; step++) {
    const jobs = await boss.fetch<CollectionJob>(COLLECT);
    if (!jobs.length) return;
    for (const job of jobs) {
      await processCollection(connection, boss, job.data, { fetch: transport, delayMs: 0 });
      await boss.complete(COLLECT, job.id);
    }
  }
  throw new Error("Collection did not terminate within bounded test steps");
}
for (const providerId of ["maktabkhooneh", "roocket"] as const) {
  test(`${providerId}: bounded discovery records partial results and duplicate queue delivery coalesces`, async () => {
    const id = await enqueueCollection(db, boss, { providerId, maxCourses: 2 });
    const [job] = await boss.fetch<CollectionJob>(COLLECT);
    await Promise.all([processCollection(connection, boss, job.data, { fetch: fixtureTransport(), delayMs: 0 }),
      processCollection(connection, boss, job.data, { fetch: fixtureTransport(), delayMs: 0 })]);
    await boss.complete(COLLECT, job.id);
    await drainCollections();
    const result = await inspectCollection(db, id);
    expect(result.state).toBe("partial");
    expect(result.discoveredUrls).toHaveLength(2);
    expect(result.selections.map(item => item.state).sort()).toEqual(["malformed-evidence", "succeeded"]);
    expect(await db.select().from(courses)).toHaveLength(1);
    expect(await db.select().from(revisions)).toHaveLength(1);
    const calls = result.attempts.length;
    await resumeCollection(db, boss, id);
    await drainCollections();
    expect((await inspectCollection(db, id)).attempts).toHaveLength(calls);
  });
}
test("explicit URL bounds and atomic collection/queue insertion", async () => {
  await expect(enqueueCollection(db, boss, { providerId: "roocket" })).rejects.toThrow();
  await expect(enqueueCollection(db, boss, { providerId: "roocket", maxCourses: 1, urls: [roocketUrl, "https://roocket.ir/series/other/"] })).rejects.toThrow();
  await expect(enqueueCollection(db, boss, { providerId: "roocket", urls: [maktabUrl] })).rejects.toThrow();
  const failing = new Proxy(boss, { get(target, prop) { return prop === "send" ? async () => { throw new Error("Injected"); } : Reflect.get(target, prop); } });
  await expect(enqueueCollection(db, failing, { providerId: "roocket", urls: [roocketUrl] })).rejects.toThrow();
  expect(await db.select().from(collections)).toHaveLength(0);
  expect(await db.select().from(selections)).toHaveLength(0);
});
test("retry/resume after worker interruption preserves accepted URLs and total attempt cap", async () => {
  const id = await enqueueCollection(db, boss, { providerId: "maktabkhooneh", urls: [maktabUrl] });
  let failed = false;
  const fixtures = fixtureTransport();
  const transient = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (String(input) === maktabUrl && !failed) { failed = true; return new Response("retry", { status: 503 }); }
    return fixtures(input, init);
  }) as unknown as typeof fetch;
  const [job] = await boss.fetch<CollectionJob>(COLLECT);
  await processCollection(connection, boss, job.data, { fetch: transient, delayMs: 0 });
  await boss.complete(COLLECT, job.id);
  expect((await inspectCollection(db, id)).selections[0].state).toBe("retryable");
  await boss.stop(); boss = createQueue(config); await boss.start();
  await drainCollections();
  const result = await inspectCollection(db, id);
  expect(result.state).toBe("succeeded"); expect(result.selections[0].attempts).toBe(2);
  await resumeCollection(db, boss, id); await drainCollections();
  expect(await db.select().from(revisions)).toHaveLength(1);
  // An unfinished application attempt left by an abruptly lost host is retained.
  await db.update(collections).set({ state: "running" }).where(eq(collections.id, id));
  await db.insert(ingestionAttempts).values({ collectionId: id, state: "running" });
  await resumeCollection(db, boss, id); await drainCollections();
  expect((await inspectCollection(db, id)).attempts.some(a => a.state === "interrupted")).toBe(true);
});
test("transient failures stop at three attempts; denial pauses all independent workers", async () => {
  const id = await enqueueCollection(db, boss, { providerId: "roocket", urls: [roocketUrl] });
  await drainCollections((async () => new Response("temporary", { status: 503 })) as unknown as typeof fetch);
  expect((await inspectCollection(db, id)).selections[0].attempts).toBe(3);
  expect((await inspectCollection(db, id)).selections[0].state).toBe("exhausted");
  await resumeCollection(db, boss, id); await drainCollections();
  expect((await inspectCollection(db, id)).selections[0].attempts).toBe(3);
  const denied = await enqueueCollection(db, boss, { providerId: "roocket", urls: [roocketUrl] });
  await drainCollections((async () => new Response("denied", { status: 403 })) as unknown as typeof fetch);
  expect((await inspectCollection(db, denied)).state).toBe("paused");
  await expect(resumeCollection(db, boss, denied)).rejects.toThrow();
  const other = createDatabase(url!, 1);
  try {
    let calls = 0;
    await expect(coordinatedFetch(other, "roocket", 0, (async () => { calls++; return new Response("unsafe"); }) as unknown as typeof fetch)(roocketUrl)).rejects.toThrow();
    expect(calls).toBe(0);
  } finally { await other.close(); }
});
test("provider coordination spans independent connections, bodies, new instances and abandoned leases", async () => {
  const other = createDatabase(url!, 1);
  let active = 0, maximum = 0;
  const starts: number[] = [];
  const transport = (async () => {
    active++; maximum = Math.max(maximum, active); starts.push(Date.now());
    return new Response(new ReadableStream({ async start(controller) {
      await Bun.sleep(70); controller.enqueue(new TextEncoder().encode("fixture")); controller.close(); active--;
    } }));
  }) as unknown as typeof fetch;
  try {
    await Promise.all([coordinatedFetch(connection, "roocket", 100, transport)(roocketUrl), coordinatedFetch(other, "roocket", 0, transport)(roocketUrl)]);
    expect(maximum).toBe(1); expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(100);
    // New transport instance/worker restart cannot erase persisted spacing/lease.
    await db.update(providerLimits).set({ busyUntil: new Date(Date.now() + 350), nextAt: new Date(0) }).where(eq(providerLimits.providerId, "roocket"));
    const before = Date.now();
    await coordinatedFetch(other, "roocket", 0, transport)(roocketUrl);
    expect(Date.now() - before).toBeGreaterThanOrEqual(350);
  } finally { await other.close(); }
});
test("robots delay and Retry-After persist; unsafe redirects and cancellation are bounded", async () => {
  const transport = (async (input: Parameters<typeof fetch>[0]) => String(input).endsWith("robots.txt") ? new Response("User-agent: *\nCrawl-delay: 0.1\nAllow: /") : new Response("fixture")) as unknown as typeof fetch;
  await coordinatedFetch(connection, "roocket", 0, transport)("https://roocket.ir/robots.txt");
  expect((await db.select().from(providerLimits))[0].delayMs).toBe(100);
  await expect(coordinatedFetch(connection, "roocket", 0, (async () => new Response("retry", { status: 429, headers: { "retry-after": "2" } })) as unknown as typeof fetch)(roocketUrl)).rejects.toThrow();
  expect((await db.select().from(providerLimits))[0].nextAt.getTime()).toBeGreaterThan(Date.now() + 1500);
  const cancelled = new AbortController(); cancelled.abort();
  await expect(coordinatedFetch(connection, "roocket", 0, transport, cancelled.signal)(roocketUrl)).rejects.toThrow();
  await db.execute(sql`truncate provider_limits`);
  const id = await enqueueCollection(db, boss, { providerId: "roocket", urls: [roocketUrl] });
  await drainCollections((async () => new Response(null, { status: 302, headers: { location: "https://private.invalid/" } })) as unknown as typeof fetch);
  expect((await inspectCollection(db, id)).selections[0].state).toBe("malformed-evidence");
});
test("revision invalidation rolls back atomically, coalesces outbox jobs and never approves changed evidence", async () => {
  const group = await seedGroup();
  await buildGroup(db, boss, payload(group)); await finalizeGroup(db, payload(group)); await publishGroup(db, definition.slug);
  const changed = sample("1", "2026-10-02T00:00:00Z"); changed.learningOutcomes = ["مدرک آموزشی تازه آزمایشی"];
  // The second conflicting record forces rollback after the first invalidation.
  const conflict = sample("2"); conflict.title = "conflict";
  await expect(importSavedExport(db, saved([changed, conflict]))).rejects.toThrow();
  expect(await db.select().from(invalidations)).toHaveLength(0);
  expect((await readGroup(db, definition.slug))?.stale).toBe(false);
  const approved = (await db.select().from(memberships)).find(m => m.courseId === changed.id)!.approvedRevisionId;
  await importSavedExport(db, saved([changed])); await importSavedExport(db, saved([changed]));
  expect(await db.select().from(invalidations)).toHaveLength(1);
  expect((await db.select().from(memberships)).find(m => m.courseId === changed.id)!.approvedRevisionId).toBe(approved);
  expect(await readGroup(db, definition.slug)).toBeNull();
  const failing = new Proxy(boss, { get(target, prop) { return prop === "send" ? async () => { throw new Error("Injected"); } : Reflect.get(target, prop); } });
  await expect(dispatchInvalidations(db, failing)).rejects.toThrow();
  expect((await db.select().from(invalidations))[0].state).toBe("pending");
  await Promise.all([dispatchInvalidations(db, boss), dispatchInvalidations(db, boss)]);
  expect(await boss.findJobs(RECONCILE)).toHaveLength(1);
  const [job] = await boss.fetch(RECONCILE);
  await reconcileInvalidation(db, job.data); await reconcileInvalidation(db, job.data);
  expect((await db.select().from(invalidations))[0].state).toBe("waiting-review");
  expect((await db.select().from(groups))[0].publishedSnapshotId).not.toBeNull();
  const newer = sample("1", "2026-10-03T00:00:00Z"); newer.availability = "unavailable";
  await importSavedExport(db, saved([newer]));
  // Retrying an old reconciliation cannot promote obsolete evidence.
  const [old] = await db.select().from(invalidations);
  await db.update(invalidations).set({ state: "queued" }).where(eq(invalidations.id, old.id));
  await reconcileInvalidation(db, { invalidationId: old.id });
  expect((await db.select().from(invalidations).where(eq(invalidations.id, old.id)))[0].state).toBe("superseded");
  await expect(createDraftGroup(db, boss, definition, ["offline-test:1", "offline-test:2"])).rejects.toThrow();
});
test("accepted ingestion and continuation roll back together; single-connection worker can retry", async () => {
  const id = await enqueueCollection(db, boss, { providerId: "maktabkhooneh", urls: [maktabUrl] });
  const [job] = await boss.fetch<CollectionJob>(COLLECT);
  const failing = new Proxy(boss, { get(target, prop) { return prop === "send" ? async () => { throw new Error("Injected continuation failure"); } : Reflect.get(target, prop); } });
  await expect(processCollection(connection, failing, job.data, { fetch: fixtureTransport(), delayMs: 0 })).rejects.toThrow();
  expect(await db.select().from(courses)).toHaveLength(0);
  expect(await db.select().from(revisions)).toHaveLength(0);
  expect((await inspectCollection(db, id)).selections[0].state).toBe("running");
  const independent = createDatabase(url!, 1);
  try { await processCollection(independent, boss, job.data, { fetch: fixtureTransport(), delayMs: 0 }); }
  finally { await independent.close(); }
  await processCollection(connection, boss, job.data, { fetch: fixtureTransport(), delayMs: 0 });
  await boss.complete(COLLECT, job.id); await drainCollections();
  const result = await inspectCollection(db, id);
  expect(result.state).toBe("succeeded");
  expect(result.attempts.map(a => a.state).sort()).toEqual(["interrupted", "succeeded"]);
  expect(await db.select().from(revisions)).toHaveLength(1);
  await expect(db.update(collections).set({ maxCourses: 2 }).where(eq(collections.id, id)).execute()).rejects.toThrow();
  await expect(db.update(selections).set({ sourceUrl: "https://example.invalid/" }).where(eq(selections.collectionId, id)).execute()).rejects.toThrow();
});
test("cancellation persists resumable outcomes without accepting failed evidence", async () => {
  const id = await enqueueCollection(db, boss, { providerId: "maktabkhooneh", urls: [maktabUrl] });
  const [job] = await boss.fetch<CollectionJob>(COLLECT);
  const controller = new AbortController();
  const fixture = fixtureTransport();
  const transport = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (String(input) === maktabUrl) { controller.abort(); throw new DOMException("Cancelled", "AbortError"); }
    return fixture(input, init);
  }) as unknown as typeof fetch;
  await processCollection(connection, boss, job.data, { fetch: transport, delayMs: 0, signal: controller.signal });
  await boss.complete(COLLECT, job.id);
  expect((await inspectCollection(db, id)).state).toBe("failed");
  expect((await inspectCollection(db, id)).attempts[0].state).toBe("interrupted");
  expect(await db.select().from(courses)).toHaveLength(0);
  await resumeCollection(db, boss, id); await drainCollections();
  expect((await inspectCollection(db, id)).state).toBe("succeeded");
});
test("provider session lock prevents overlap even when a reservation has expired", async () => {
  const holder = createDatabase(url!, 1);
  let calls = 0;
  try {
    await holder.client`select pg_advisory_lock(hashtextextended('roocket', 13))`;
    const request = coordinatedFetch(connection, "roocket", 0, (async () => { calls++; return new Response("fixture"); }) as unknown as typeof fetch)(roocketUrl);
    await Bun.sleep(75);
    expect(calls).toBe(0);
    await holder.client`select pg_advisory_unlock(hashtextextended('roocket', 13))`;
    await request; expect(calls).toBe(1);
  } finally { await holder.close(); }
});
test("a lost request reservation cannot accept a response or release its replacement", async () => {
  const replacement = crypto.randomUUID();
  const transport = (async () => {
    await db.update(providerLimits).set({ token: replacement, busyUntil: new Date(Date.now() + 60000) }).where(eq(providerLimits.providerId, "roocket"));
    return new Response("Obsolete fixture response");
  }) as unknown as typeof fetch;
  await expect(coordinatedFetch(connection, "roocket", 0, transport)(roocketUrl)).rejects.toThrow();
  expect((await db.select().from(providerLimits))[0].token).toBe(replacement);
});
test("attempt claim rollback cannot consume or reset only half of the durable budget", async () => {
  const id = await enqueueCollection(db, boss, { providerId: "maktabkhooneh", urls: [maktabUrl] });
  const [job] = await boss.fetch<CollectionJob>(COLLECT);
  await db.execute(sql`create function reject_test_ingestion_claim() returns trigger language plpgsql as $$ begin raise exception 'Injected claim failure'; end $$`);
  await db.execute(sql`create trigger reject_test_ingestion_claim before insert on ingestion_attempts for each row execute function reject_test_ingestion_claim()`);
  try {
    await expect(processCollection(connection, boss, job.data, { fetch: fixtureTransport(), delayMs: 0 })).rejects.toThrow();
    const result = await inspectCollection(db, id);
    expect(result.attempts).toHaveLength(0);
    expect(result.selections[0].attempts).toBe(0);
    expect(result.selections[0].state).toBe("pending");
  } finally {
    await db.execute(sql`drop trigger reject_test_ingestion_claim on ingestion_attempts`);
    await db.execute(sql`drop function reject_test_ingestion_claim()`);
  }
  await processCollection(connection, boss, job.data, { fetch: fixtureTransport(), delayMs: 0 });
  await boss.complete(COLLECT, job.id); await drainCollections();
  expect((await inspectCollection(db, id)).selections[0].attempts).toBe(1);
});

// Milestone 5: public discovery applies the publication gate before pagination.
import { discoverGroups, discoverCategories } from "@dorob/backend/discovery";
import { parseDiscoveryParams, publicGroupSchema } from "@dorob/core";
import { requestRefresh, inspectRefresh } from "@dorob/backend/refresh";
import { cancelCollection } from "@dorob/backend/ingestion";
import { refreshRequests } from "@dorob/db/schema";
const publicQuery = (value = "") => parseDiscoveryParams(new URLSearchParams(value));
test("published discovery paginates eligible groups, normalizes aliases and filters unknown level/categories", async () => {
  await importSavedExport(db, saved([sample("1"), sample("2")]));
  for (const slug of ["a-draft", "b-public", "c-withdrawn", "d-public"]) {
    const result = await createDraftGroup(db, boss, { ...definition, slug, topic: "پایتون", title: "مقایسه پایتون" }, ["offline-test:1", "offline-test:2"]);
    await buildGroup(db, boss, payload(result)); await finalizeGroup(db, payload(result));
    if (slug !== "a-draft") await publishGroup(db, slug);
    if (slug === "c-withdrawn") await db.update(groups).set({ state: "withdrawn" }).where(eq(groups.id, result.groupId));
  }
  const first = await discoverGroups(db, publicQuery("q=Python&pageSize=1&level=unknown&category=programming"));
  expect(first.items.map(g => g.slug)).toEqual(["b-public"]); expect(first.hasNext).toBe(true);
  const second = await discoverGroups(db, publicQuery("q=پایتون&pageSize=1&page=2"));
  expect(second.items.map(g => g.slug)).toEqual(["d-public"]); expect(second.hasNext).toBe(false);
  expect((await discoverGroups(db, publicQuery("level=multi-level"))).items).toHaveLength(0);
  expect((await discoverGroups(db, publicQuery("category=other"))).items).toHaveLength(0);
  expect((await discoverGroups(db, publicQuery("page=1000"))).items).toHaveLength(0);
  expect((await discoverCategories(db)).items.map(c => c.id)).toEqual(["programming"]);
  const handler = createHandler({ ready: async () => {}, group: (slug, draft) => readGroup(db, slug, draft), discovery: q => discoverGroups(db, q), categories: () => discoverCategories(db) });
  const response = await handler(new Request("http://localhost/v1/groups?q=Python"));
  expect(response.status).toBe(200); const text = await response.text(); expect(text).not.toContain("MUST_NOT_REACH_HTTP"); expect(text).not.toContain("criteria");
  expect((await handler(new Request("http://localhost/v1/groups?page=0"))).status).toBe(400);
  expect((await handler(new Request("http://localhost/v1/groups?page=1&page=2"))).status).toBe(400);
  expect((await handler(new Request("http://localhost/v1/categories"))).status).toBe(200);
  // Changed unapproved sources remove ALL affected groups from discovery and categories.
  const changed = sample("1", "2026-10-03T00:00:00Z"); changed.title = "منبع تغییرکرده";
  await importSavedExport(db, saved([changed]));
  expect((await discoverGroups(db, publicQuery())).items).toHaveLength(0); expect((await discoverCategories(db)).items).toHaveLength(0);
});
test("public projection excludes changed/unapproved alternatives while retaining current facts and published history", async () => {
  await importSavedExport(db, saved([sample("1"), sample("2"), sample("3")]));
  const result = await createDraftGroup(db, boss, definition, ["offline-test:1", "offline-test:2", "offline-test:3"]);
  await buildGroup(db, boss, payload(result)); await finalizeGroup(db, payload(result)); await publishGroup(db, definition.slug);
  const before = await readGroup(db, definition.slug); publicGroupSchema.parse(before);
  const changed = sample("3", "2026-10-03T00:00:00Z"); changed.title = "تغییر تأییدنشده";
  await importSavedExport(db, saved([changed]));
  const after = await readGroup(db, definition.slug); expect(after?.courses.map(c => c.id)).toEqual(["offline-test:1", "offline-test:2"]); expect(after?.stale).toBe(true);
  const discovery = await discoverGroups(db, publicQuery()); expect(discovery.items[0].alternativeCount).toBe(2); expect(discovery.items[0].stale).toBe(true);
  expect(await db.select().from(snapshots)).toHaveLength(1);
});
test("refresh defaults off, coalesces across connections, is bounded and transactionally hands off collections", async () => {
  const initial = await enqueueCollection(db, boss, { providerId: "roocket", urls: [roocketUrl] }); await drainCollections();
  const courseId = (await inspectCollection(db, initial)).selections[0].revisionId;
  const [revision] = await db.select().from(revisions).where(eq(revisions.id, courseId!));
  const input = { requestKey: "selected-refresh", mode: "offline", providers: ["roocket"], courseIds: [revision.courseId], maxCourses: 1, operator: "synthetic-test-reviewer" };
  await expect(requestRefresh(db, boss, input, { enabled: false, liveEnabled: false })).rejects.toThrow();
  await expect(requestRefresh(db, boss, { ...input, mode: "live" }, { enabled: true, liveEnabled: false })).rejects.toThrow();
  const other = createDatabase(url!, 2);
  let ids: string[];
  try { ids = await Promise.all([requestRefresh(db, boss, input, { enabled: true, liveEnabled: false }), requestRefresh(other.db, boss, input, { enabled: true, liveEnabled: false })]); } finally { await other.close(); }
  expect(ids![0]).toBe(ids![1]); expect(await db.select().from(refreshRequests)).toHaveLength(1);
  const refresh = await inspectRefresh(db, ids![0]); expect(refresh.collections).toHaveLength(1); expect(refresh.collections[0].transportMode).toBe("offline");
  await expect(requestRefresh(db, boss, { ...input, maxCourses: 2 }, { enabled: true, liveEnabled: false })).rejects.toThrow();
  const failing = new Proxy(boss, { get(target, prop) { return prop === "send" ? async () => { throw new Error("Injected queue failure"); } : Reflect.get(target, prop); } });
  await expect(requestRefresh(db, failing, { ...input, requestKey: "rollback-refresh" }, { enabled: true, liveEnabled: false })).rejects.toThrow();
  expect(await db.select().from(refreshRequests)).toHaveLength(1); expect(await db.select().from(collections)).toHaveLength(2);
  await drainCollections(); expect((await inspectRefresh(db, ids![0])).collections[0].state).toBe("succeeded"); expect(await db.select().from(revisions)).toHaveLength(1);
});
test("overlapping refresh groups cannot truncate distinct courses before the total budget gate", async () => {
  const data = Array.from({ length: 101 }, (_, i) => sample(String(i + 1)));
  await importSavedExport(db, saved(data));
  const left = await createDraftGroup(db, boss, { ...definition, slug: "refresh-left" }, data.slice(0, 60).map(c => c.id));
  const right = await createDraftGroup(db, boss, { ...definition, slug: "refresh-right" }, data.slice(40).map(c => c.id));
  await expect(requestRefresh(db, boss, { requestKey: "overlapping-refresh", mode: "offline", providers: ["roocket"], groupIds: [left.groupId, right.groupId], maxCourses: 100, operator: "synthetic" }, { enabled: true, liveEnabled: false })).rejects.toThrow("course budget");
  expect(await db.select().from(refreshRequests)).toHaveLength(0);
  expect(await db.select().from(collections)).toHaveLength(0);
});
test("offline refresh cannot call live transport; cancellation fences an in-flight acceptance and resume preserves budgets", async () => {
  const initial = await enqueueCollection(db, boss, { providerId: "roocket", urls: [roocketUrl] }); await drainCollections();
  const [course] = await db.select().from(courses);
  const id = await requestRefresh(db, boss, { requestKey: "cancel-refresh", mode: "offline", providers: ["roocket"], courseIds: [course.id], maxCourses: 1, operator: "synthetic" }, { enabled: true, liveEnabled: false });
  const refresh = await inspectRefresh(db, id); const collectionId = refresh.collectionIds[0];
  const [job] = await boss.fetch<CollectionJob>(COLLECT);
  await processCollection(connection, boss, job.data); await boss.complete(COLLECT, job.id);
  expect((await inspectCollection(db, collectionId)).error).toContain("transport disabled"); expect((await inspectCollection(db, collectionId)).attempts).toHaveLength(0);
  await resumeCollection(db, boss, collectionId);
  const [next] = await boss.fetch<CollectionJob>(COLLECT);
  let entered!: () => void; const started = new Promise<void>(r => entered = r); let release!: () => void; const hold = new Promise<void>(r => release = r);
  const fixture = fixtureTransport(); const blocked = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => { entered(); await hold; return fixture(input, init); }) as unknown as typeof fetch;
  const active = processCollection(connection, boss, next.data, { fetch: blocked, delayMs: 0 }); await started;
  await cancelCollection(db, collectionId); release(); await active; await boss.complete(COLLECT, next.id);
  const cancelled = await inspectCollection(db, collectionId); expect(cancelled.state).toBe("failed"); expect(cancelled.selections[0].attempts).toBe(1); expect(cancelled.selections[0].revisionId).toBeNull();
  await processCollection(connection, boss, next.data, { fetch: fixture, delayMs: 0 }); expect((await inspectCollection(db, collectionId)).selections[0].attempts).toBe(1);
  await resumeCollection(db, boss, collectionId); await drainCollections(); expect((await inspectCollection(db, collectionId)).selections[0].attempts).toBe(2);
  expect((await inspectCollection(db, initial)).state).toBe("succeeded");
});
