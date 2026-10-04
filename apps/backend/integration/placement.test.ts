import { beforeAll, beforeEach, afterAll, expect, test } from "bun:test";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq, sql } from "drizzle-orm";
import { createDatabase } from "@dorob/db";
import { groups, memberships, placementRequests, modelBudgets, modelAttempts, modelAdmission, placementOutbox, runs } from "@dorob/db/schema";
import { createCourse, type ProviderCourse } from "@dorob/utils/course";
import { importSavedExport } from "@dorob/backend/importer";
import { createQueue, setupQueues, type Queue } from "@dorob/backend/queue";
import { createDraftGroup, publishGroup } from "@dorob/backend/groups";
import { buildGroup, finalizeGroup } from "@dorob/backend/workflows";
import { seedTaxonomy, reviewTaxonomy, activateTaxonomy, createBudget, requestPlacement, inspectPlacement, processPlacement, resumePlacement, cancelPlacement, reviewPlacement } from "@dorob/backend/placement";
import { indexDocuments, saveVector, retrieveCandidates } from "@dorob/backend/retrieval";
import { provisionalTaxonomy, BUNDLE_VERSION } from "@dorob/backend/placement-contracts";
import { decisionFixture } from "../tests/placement-fixtures.ts";
const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== "/dorob_test") throw new Error("Isolated test database required");
const connection = createDatabase(url); const db = connection.db;
let boss: Queue;
function sample(id: string, checkedAt = "2026-10-04T00:00:00Z") {
  const c = createCourse("placement-test", id, "نمونه آزمایشی پایتون", `https://example.invalid/${id}`, checkedAt);
  c.description = "شواهد ساختگی Python"; c.prerequisites = "پیش‌نیاز ساختگی"; c.learningOutcomes = ["خروجی ساختگی"]; c.availability = "available";
  return c;
}
async function save(list: ProviderCourse[]) { await importSavedExport(db, { schemaVersion: 2, providerId: "placement-test", courses: list }); }
async function budget(maxCalls = 10) { return createBudget(db, { mode: "offline", maxCalls, maxUsd: 1, perCallUsd: 0.1 }); }
async function request(kind: "classify" | "evaluate" = "classify", groupId?: string, budgetId?: string, courseId = "placement-test:3") {
  return requestPlacement(db, boss, { kind, courseId, groupId, taxonomyVersion: provisionalTaxonomy.version, model: "offline-jev-fixture-v1", budgetId: budgetId ?? (await budget()).id });
}
async function group() {
  const result = await createDraftGroup(db, boss, { slug: "placement-python", title: "گروه آزمایشی", topic: "Python", targetLevel: null, criteria: "پیش‌نیاز و خروجی آزمایشی" }, ["placement-test:1", "placement-test:2"]);
  return result.groupId;
}
beforeAll(async () => {
  await migrate(db, { migrationsFolder: new URL("../../../packages/db/migrations", import.meta.url).pathname });
  boss = createQueue({ DATABASE_URL: url, PGBOSS_SCHEMA: "pgboss" }, true); await boss.start(); await setupQueues(boss);
});
beforeEach(async () => {
  await boss.deleteAllJobs();
  await db.execute(sql`truncate placement_settings, model_admission, model_budgets, placement_taxonomies, courses, comparison_groups, providers cascade`);
  await seedTaxonomy(db, provisionalTaxonomy); await reviewTaxonomy(db, provisionalTaxonomy.version, "test-reviewer"); await activateTaxonomy(db, provisionalTaxonomy.version);
  await save([sample("1"), sample("2"), sample("3")]);
});
afterAll(async () => { await boss.stop(); await connection.close(); });
test("new/revised course outbox shares importer transaction and unchanged inputs coalesce", async () => {
  expect(await db.select().from(placementOutbox)).toHaveLength(3);
  await save([sample("3")]); expect(await db.select().from(placementOutbox)).toHaveLength(3);
  const c = sample("3", "2026-10-05T00:00:00Z"); c.title = "جدید"; await save([c]);
  expect(await db.select().from(placementOutbox)).toHaveLength(4);
  const broken = sample("4"); await expect(save([broken, { ...c, title: "تعارض همزمان" }])).rejects.toThrow();
  expect(await db.select().from(placementOutbox)).toHaveLength(4);
});
test("duplicate requests/deliveries reuse completed response without spending another budget", async () => {
  const first = await request(); const second = await request(); expect(second.requestId).toBe(first.requestId); expect(second.coalesced).toBe(true);
  let calls = 0; const decision = async (r: Parameters<typeof decisionFixture>[0]) => { calls++; return decisionFixture(r); };
  await processPlacement(connection, boss, first.requestId, { decision }); await processPlacement(connection, boss, first.requestId, { decision });
  expect(calls).toBe(1); expect((await inspectPlacement(db, first.requestId)).request?.state).toBe("completed");
  const result = (await inspectPlacement(db, first.requestId)).request!.result as { classification: { level: string } };
  expect(result.classification.level).toBe("unknown"); expect(await db.select().from(memberships)).toHaveLength(0);
});
test("unknown level cannot become beginner; explicit provider/model multi-level stays separate", async () => {
  const first = await request(); await processPlacement(connection, boss, first.requestId, { decision: async r => decisionFixture(r, { level: "beginner" }) });
  expect(((await inspectPlacement(db, first.requestId)).request!.result as { classification: { level: string } }).classification.level).toBe("unknown");
  const c = sample("3", "2026-10-05T00:00:00Z"); c.providerLevel = "چند سطح"; await save([c]);
  const next = await request(); await processPlacement(connection, boss, next.requestId, { decision: async r => decisionFixture(r, { level: "multi-level" }) });
  expect(((await inspectPlacement(db, next.requestId)).request!.result as { classification: { level: string } }).classification.level).toBe("multi-level");
});
test("independent workers obey global admission and shared per-run budgets", async () => {
  const second = createDatabase(url!); const b = await budget(1); const a = await request("classify", undefined, b.id, "placement-test:1"); const c = await request("classify", undefined, b.id, "placement-test:2");
  let calls = 0; let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; }); let entered!: () => void; const started = new Promise<void>(resolve => { entered = resolve; });
  const decision = async (r: Parameters<typeof decisionFixture>[0]) => { calls++; entered(); await wait; return decisionFixture(r); };
  try {
    const running = processPlacement(connection, boss, a.requestId, { decision }); await started;
    await db.update(modelAdmission).set({ busyUntil: new Date(0) }); // Clock expiry cannot break session coordination.
    await processPlacement(second, boss, c.requestId, { decision }); expect(calls).toBe(1); release(); await running;
    await processPlacement(second, boss, c.requestId, { decision: async r => { calls++; return decisionFixture(r); } });
    expect(calls).toBe(1); expect((await inspectPlacement(db, c.requestId)).request!.state).toBe("failed");
    const [used] = await db.select().from(modelBudgets).where(eq(modelBudgets.id, b.id)); expect(used.usedCalls).toBe(1);
  } finally { release(); await second.close(); }
});
test("budget money reservations and reported overruns stop later calls", async () => {
  const b = await createBudget(db, { mode: "offline", maxCalls: 10, maxUsd: 0.1, perCallUsd: 0.1 });
  const a = await request("classify", undefined, b.id); const c = await request("classify", undefined, b.id, "placement-test:1");
  await processPlacement(connection, boss, a.requestId, { decision: async r => ({ ...decisionFixture(r), usage: { cost: 0.2 } }) });
  let calls = 0; await processPlacement(connection, boss, c.requestId, { decision: async r => { calls++; return decisionFixture(r); } }); expect(calls).toBe(0);
  const [used] = await db.select().from(modelBudgets).where(eq(modelBudgets.id, b.id)); expect(used.state).toBe("overrun"); expect(used.reservedMicros).toBe(200000);
});
test("timeouts are bounded even for noncooperative offline clients; unknown outcomes retain reservations", async () => {
  const a = await request();
  await processPlacement(connection, boss, a.requestId, { timeoutMs: 10, decision: () => new Promise(() => {}) });
  const inspected = await inspectPlacement(db, a.requestId); expect(inspected.request!.state).toBe("failed"); expect(inspected.attempts[0].state).toBe("cancelled-unknown");
  const [gate] = await db.select().from(modelAdmission); expect(gate.busyUntil > new Date()).toBe(true);
});
test("bounded retry/resume preserves unknown attempt history after worker loss", async () => {
  const a = await request();
  for (let i = 0; i < 3; i++) {
    await processPlacement(connection, boss, a.requestId, { decision: async () => { throw new Error("synthetic connection loss"); } });
    await db.update(modelAdmission).set({ busyUntil: new Date(0) });
    if (i < 2) await resumePlacement(db, boss, a.requestId);
  }
  const inspected = await inspectPlacement(db, a.requestId); expect(inspected.attempts).toHaveLength(3); expect(inspected.request!.attempts).toBe(3);
  await expect(resumePlacement(db, boss, a.requestId)).rejects.toThrow();
});
test("abandoned running attempt is marked unknown and charged on restart", async () => {
  const a = await request(); const inspected = await inspectPlacement(db, a.requestId); const b = inspected.request!.budgetId;
  await db.update(placementRequests).set({ state: "running", attempts: 1 }).where(eq(placementRequests.id, a.requestId));
  await db.insert(modelAttempts).values({ requestId: a.requestId, budgetId: b, state: "running", reservedMicros: 100000 });
  await db.update(modelBudgets).set({ usedCalls: 1, reservedMicros: 100000 }).where(eq(modelBudgets.id, b));
  await resumePlacement(db, boss, a.requestId); await processPlacement(connection, boss, a.requestId, { decision: async r => decisionFixture(r) });
  const after = await inspectPlacement(db, a.requestId); expect(after.attempts.map(x => x.state)).toEqual(["unknown", "succeeded"]);
});
test("revision/group/taxonomy changes fence results while retaining model history", async () => {
  const g = await group(); const a = await request("evaluate", g);
  await processPlacement(connection, boss, a.requestId, { decision: async r => { await db.update(groups).set({ definitionRevision: 2 }).where(eq(groups.id, g)); return decisionFixture(r); } });
  expect((await inspectPlacement(db, a.requestId)).request!.state).toBe("stale");
  const b = await request(); const c = sample("3", "2026-10-05T00:00:00Z"); c.title = "تغییر";
  await processPlacement(connection, boss, b.requestId, { decision: async r => { await save([c]); return decisionFixture(r); } });
  expect((await inspectPlacement(db, b.requestId)).request!.state).toBe("stale");
  const d = await request(); await seedTaxonomy(db, { ...provisionalTaxonomy, version: "test-v2", status: "test" }); await reviewTaxonomy(db, "test-v2", "test-reviewer"); await activateTaxonomy(db, "test-v2");
  let called = false; await processPlacement(connection, boss, d.requestId, { decision: async r => { called = true; return decisionFixture(r); } }); expect(called).toBe(false);
  expect((await inspectPlacement(db, d.requestId)).request!.state).toBe("stale");
});
test("cancelled in-flight results cannot be accepted", async () => {
  const a = await request(); await processPlacement(connection, boss, a.requestId, { decision: async r => { await cancelPlacement(db, a.requestId); return decisionFixture(r); } });
  expect((await inspectPlacement(db, a.requestId)).request!.state).toBe("cancelled"); expect((await inspectPlacement(db, a.requestId)).review).toBeUndefined();
});
test("failed result transaction reuses retained response rather than rebilling on resume", async () => {
  const a = await request(); let calls = 0;
  await connection.client`create function reject_test_review() returns trigger language plpgsql as $$ begin raise exception 'synthetic rollback'; end $$`;
  await connection.client`create trigger reject_test_review before insert on placement_reviews for each row execute function reject_test_review()`;
  try {
    await processPlacement(connection, boss, a.requestId, { decision: async r => { calls++; return { ...decisionFixture(r), usage: { cost: 1.1 } }; } }).catch(() => {});
    expect((await inspectPlacement(db, a.requestId)).request!.result).toBeNull();
    const [spent] = await db.select().from(modelBudgets).where(eq(modelBudgets.id, (await inspectPlacement(db, a.requestId)).request!.budgetId));
    expect(spent.state).toBe("overrun"); expect(spent.reservedMicros).toBe(1100000);
  } finally { await connection.client`drop trigger reject_test_review on placement_reviews`; await connection.client`drop function reject_test_review()`; }
  await db.update(modelAdmission).set({ busyUntil: new Date(Date.now() + 60000) }); // Another unknown call's reservation.
  await resumePlacement(db, boss, a.requestId); await processPlacement(connection, boss, a.requestId); // Reuse needs no transport/credentials.
  const [retainedGate] = await db.select().from(modelAdmission); expect(retainedGate.busyUntil > new Date()).toBe(true);
  expect(calls).toBe(1); expect((await inspectPlacement(db, a.requestId)).request!.state).toBe("completed");
});
test("approval and downstream insertion roll back together; membership never self-approves", async () => {
  const g = await group(); const a = await request("evaluate", g); await processPlacement(connection, boss, a.requestId, { decision: async r => decisionFixture(r) });
  expect(await db.select().from(memberships)).toHaveLength(2);
  const input = { requestId: a.requestId, action: "approve" as const, operator: "test-reviewer", note: "synthetic review" };
  const failing = { send: async () => { throw new Error("synthetic queue failure"); } } as unknown as Queue;
  await expect(reviewPlacement(db, failing, input)).rejects.toThrow(); expect(await db.select().from(memberships)).toHaveLength(2);
  expect((await inspectPlacement(db, a.requestId)).review!.state).toBe("pending");
  await reviewPlacement(db, boss, input); expect(await db.select().from(memberships)).toHaveLength(3);
  const pending = await db.select().from(runs).where(eq(runs.groupId, g)); expect(pending).toHaveLength(2); expect(pending.every(r => r.buildJobId)).toBe(true);
  await expect(publishGroup(db, "placement-python")).rejects.toThrow();
  const run = pending.find(r => r.input.members.length === 3)!; const payload = { version: 1 as const, groupId: g, workflowRunId: run.id };
  await buildGroup(db, boss, payload); await finalizeGroup(db, payload); await publishGroup(db, "placement-python");
  await expect(reviewPlacement(db, boss, input)).rejects.toThrow();
});
test("no-fit/uncertain/insufficient evidence permit rejection but cannot approve membership", async () => {
  const g = await group();
  for (const [courseId, probability] of [["placement-test:3", 0.01], ["placement-test:1", 0.5]] as const) {
    const a = await request("evaluate", g, undefined, courseId); await processPlacement(connection, boss, a.requestId, { decision: async r => decisionFixture(r, { probability }) });
    await expect(reviewPlacement(db, boss, { requestId: a.requestId, action: "approve", operator: "test", note: "test" })).rejects.toThrow();
    await reviewPlacement(db, boss, { requestId: a.requestId, action: "reject", operator: "test", note: "test" });
  }
  expect(await db.select().from(memberships)).toHaveLength(2);
});
test("request and first job are atomic under queue failure", async () => {
  const b = await budget(); const failing = { send: async () => { throw new Error("queue unavailable"); } } as unknown as Queue;
  await expect(requestPlacement(db, failing, { kind: "classify", courseId: "placement-test:3", taxonomyVersion: provisionalTaxonomy.version, model: "offline", budgetId: b.id })).rejects.toThrow();
  expect(await db.select().from(placementRequests)).toHaveLength(0);
});
test("PostgreSQL hybrid retrieval finds aliases, excludes self/approved identities and incompatible vectors", async () => {
  const g = await group(); const docs = await indexDocuments(db, provisionalTaxonomy.version, ["placement-test:1", "placement-test:2", "placement-test:3"], [g]);
  const identity = { model: "offline-vector-v1", dimensions: 2, bundleVersion: BUNDLE_VERSION };
  for (const id of docs) await db.transaction(tx => saveVector(tx, id, identity, [1, 0.1]));
  const [source] = await connection.client`select id from retrieval_documents where entity_id = 'placement-test:3'`;
  const retrieved = await retrieveCandidates(db, { documentId: source.id, kind: "group", limit: 10, embedding: identity }); expect(retrieved.candidates.map(c => c.id)).toEqual([g]);
  const unmatched = await retrieveCandidates(db, { documentId: source.id, kind: "unmatched-course", limit: 10, embedding: identity }); expect(unmatched.candidates).toHaveLength(0);
  await expect(retrieveCandidates(db, { documentId: source.id, kind: "group", limit: 10, embedding: { ...identity, model: "other" } })).rejects.toThrow();
  await expect(retrieveCandidates(db, { documentId: source.id, kind: "group", limit: 10, embedding: { ...identity, dimensions: 3 } })).rejects.toThrow();
  await expect(db.transaction(tx => saveVector(tx, source.id, identity, [1, 2, 3]))).rejects.toThrow();
  const embedding = await requestPlacement(db, boss, { kind: "embed", taxonomyVersion: provisionalTaxonomy.version, budgetId: (await budget()).id, model: "offline-vector-v2", dimensions: 2, documentId: source.id });
  await processPlacement(connection, boss, embedding.requestId, { embedding: async () => ({ model: "offline-vector-v2", data: [{ index: 0, embedding: [1, 0.2] }], usage: {} }) });
  expect((await inspectPlacement(db, embedding.requestId)).request!.state).toBe("completed");
});

test("taxonomy/request/document identities are immutable in PostgreSQL", async () => {
  const a = await request();
  await expect(Promise.resolve(connection.client`update placement_taxonomies set digest = 'altered'`)).rejects.toThrow();
  await expect(Promise.resolve(connection.client`update placement_requests set input = '{}'::jsonb where id = ${a.requestId}`)).rejects.toThrow();
  const [doc] = await indexDocuments(db, provisionalTaxonomy.version, ["placement-test:3"], []);
  await expect(Promise.resolve(connection.client`update retrieval_documents set lexical_text = 'altered' where id = ${doc}`)).rejects.toThrow();
});

test("group definition changes invalidate publication eligibility and old membership approval", async () => {
  const g = await group(); const [run] = await db.select().from(runs).where(eq(runs.groupId, g));
  const payload = { version: 1 as const, groupId: g, workflowRunId: run.id };
  await buildGroup(db, boss, payload); await finalizeGroup(db, payload); await publishGroup(db, "placement-python");
  await db.update(groups).set({ definitionRevision: 2 }).where(eq(groups.id, g));
  await expect(publishGroup(db, "placement-python")).rejects.toThrow();
  const { readGroup } = await import("@dorob/backend/queries"); expect(await readGroup(db, "placement-python")).toBeNull();
});
test("reviewed active taxonomy and evidence-bound topic are required for approval", async () => {
  const a = await request(); await processPlacement(connection, boss, a.requestId, { decision: async r => decisionFixture(r) });
  await db.execute(sql`delete from placement_settings`);
  await expect(reviewPlacement(db, boss, { requestId: a.requestId, action: "approve", operator: "test", note: "test" })).rejects.toThrow();
  await activateTaxonomy(db, provisionalTaxonomy.version);
  await reviewPlacement(db, boss, { requestId: a.requestId, action: "approve", operator: "test", note: "test" });
  expect(await db.select().from(memberships)).toHaveLength(0);
});
test("current placement status retains unmatched/review states without approving membership", async () => {
  const [initial] = await connection.client`select status from course_placements where course_id = 'placement-test:3'`; expect(initial.status).toBe("unmatched");
  const g = await group(); const a = await request("evaluate", g);
  await processPlacement(connection, boss, a.requestId, { decision: async r => decisionFixture(r, { probability: 0.01 }) });
  const [unmatched] = await connection.client`select status from course_placements where course_id = 'placement-test:3'`; expect(unmatched.status).toBe("unmatched");
  expect((await inspectPlacement(db, a.requestId)).review!.outcome).toBe("no-fit");
});

test("lost attempt token cannot accept a late response or release its replacement reservation", async () => {
  const a = await request(); const replacement = crypto.randomUUID();
  await processPlacement(connection, boss, a.requestId, { decision: async r => {
    await db.update(placementRequests).set({ activeAttemptId: replacement, state: "queued" }).where(eq(placementRequests.id, a.requestId));
    await db.update(modelAdmission).set({ token: replacement, busyUntil: new Date(Date.now() + 60000) });
    return decisionFixture(r);
  } });
  const inspected = await inspectPlacement(db, a.requestId);
  expect(inspected.request!.state).toBe("queued"); expect(inspected.request!.result).toBeNull(); expect(inspected.attempts[0].state).toBe("superseded");
  const [admission] = await db.select().from(modelAdmission); expect(admission.token).toBe(replacement); expect(admission.busyUntil > new Date()).toBe(true);
});
