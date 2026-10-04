import { and, eq, or } from "drizzle-orm";
import { jobSchema, type GroupJob, type GroupSnapshot } from "@dorob/core";
import type { Database } from "@dorob/db";
import { groups, runs, snapshots, attempts } from "@dorob/db/schema";
import { loadInputs } from "./groups.ts";
import { enqueue, FINALIZE_GROUP, type Queue } from "./queue.ts";
import { toPublicCourse } from "./queries.ts";

export async function buildGroup(db: Database, boss: Queue, payloadInput: GroupJob) {
  const payload = jobSchema.parse(payloadInput);
  return db.transaction(async tx => {
    const inputs = await loadInputs(tx, payload.groupId);
    const [run] = await tx.select().from(runs).where(and(eq(runs.id, payload.workflowRunId), eq(runs.groupId, payload.groupId))).for("update");
    if (!run) throw new Error("Workflow not found");
    if (run.operationVersion !== "facts-v1") throw new Error("Unsupported workflow operation version");
    const [existing] = await tx.select().from(snapshots).where(eq(snapshots.runId, run.id));
    if (existing || run.state === "superseded") return;
    if (!inputs.eligible || run.inputDigest !== inputs.inputDigest) {
      await tx.update(runs).set({ state: "superseded", updatedAt: new Date() }).where(eq(runs.id, run.id));
      return;
    }
    const data: GroupSnapshot = { schemaVersion: 1, kind: "source-facts", groupId: inputs.group.id,
      definitionRevision: inputs.group.definitionRevision, title: inputs.group.title, topic: inputs.group.topic,
      targetLevel: inputs.group.targetLevel, criteria: inputs.group.criteria,
      courses: inputs.facts.map(({ course, revision }) => toPublicCourse(course, revision)), analysis: null };
    await tx.insert(snapshots).values({ runId: run.id, groupId: inputs.group.id, data });
    await tx.update(runs).set({ state: "running", updatedAt: new Date() }).where(eq(runs.id, run.id));
    // Domain result and downstream job commit together, including under rollback.
    const finalizeJobId = await enqueue(boss, tx, FINALIZE_GROUP, payload);
    await tx.update(runs).set({ finalizeJobId }).where(eq(runs.id, run.id));
  });
}

export async function finalizeGroup(db: Database, payloadInput: GroupJob) {
  const payload = jobSchema.parse(payloadInput);
  await db.transaction(async tx => {
    const inputs = await loadInputs(tx, payload.groupId);
    const [run] = await tx.select().from(runs).where(and(eq(runs.id, payload.workflowRunId), eq(runs.groupId, payload.groupId))).for("update");
    if (!run) throw new Error("Workflow not found");
    if (run.state === "succeeded" || run.state === "superseded") return;
    if (!inputs.eligible || inputs.inputDigest !== run.inputDigest) {
      await tx.update(runs).set({ state: "superseded", updatedAt: new Date() }).where(eq(runs.id, run.id));
      return;
    }
    const [snapshot] = await tx.select().from(snapshots).where(eq(snapshots.runId, run.id));
    if (!snapshot) throw new Error("Missing build result");
    await tx.update(groups).set({ currentSnapshotId: snapshot.id,
      state: inputs.group.state === "published" ? "published" : "ready-for-review" }).where(eq(groups.id, inputs.group.id));
    await tx.update(runs).set({ state: "succeeded", updatedAt: new Date() }).where(eq(runs.id, run.id));
  });
}

export async function recordAttempt(db: Database, jobId: string, step: string, payload: GroupJob, handler: () => Promise<unknown>) {
  jobSchema.parse(payload);
  // A re-delivered job makes previously unfinished attempts visible as interrupted.
  await db.update(attempts).set({ state: "interrupted", finishedAt: new Date(), error: "Previous execution did not finish" })
    .where(and(eq(attempts.jobId, jobId), eq(attempts.state, "running")));
  const [attempt] = await db.insert(attempts).values({ runId: payload.workflowRunId, jobId, step, state: "running" }).returning();
  try {
    await handler();
    await db.update(attempts).set({ state: "succeeded", finishedAt: new Date() }).where(eq(attempts.id, attempt.id));
  } catch {
    // Payloads and connection errors may contain credentials; retain safe summaries.
    await db.update(attempts).set({ state: "failed", finishedAt: new Date(), error: "Step failed; retry or operator investigation required" }).where(eq(attempts.id, attempt.id));
    await db.update(runs).set({ state: "failed", updatedAt: new Date() }).where(and(eq(runs.id, payload.workflowRunId), or(eq(runs.state, "queued"), eq(runs.state, "running"))));
    throw new Error("Workflow step failed");
  }
}
