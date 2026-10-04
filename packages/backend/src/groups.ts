import { and, eq, sql } from "drizzle-orm";
import { groupDefinitionSchema, type GroupDefinition } from "@dorob/core";
import type { Database, Transaction } from "@dorob/db";
import { groups, memberships, courses, revisions, runs, snapshots, coursePlacements, groupReviews } from "@dorob/db/schema";
import { digest } from "./hashing.ts";
import { BUILD_GROUP, enqueue, type Queue } from "./queue.ts";

export async function loadInputs(tx: Transaction, groupId: string) {
  const [group] = await tx.select().from(groups).where(eq(groups.id, groupId)).for("update");
  if (!group) throw new Error("Group not found");
  const members = await tx.select({ course: courses, approvedRevisionId: memberships.approvedRevisionId, approvedDefinitionRevision: memberships.approvedDefinitionRevision })
    .from(memberships).innerJoin(courses, eq(courses.id, memberships.courseId))
    .where(eq(memberships.groupId, group.id)).orderBy(courses.id).for("share", { of: courses });
  const input = { definitionRevision: group.definitionRevision,
    members: members.map(({ course, approvedRevisionId }) => ({ courseId: course.id, revisionId: approvedRevisionId })) };
  const current = members.every(({ course, approvedRevisionId, approvedDefinitionRevision }) => course.currentRevisionId === approvedRevisionId && approvedDefinitionRevision === group.definitionRevision);
  const facts = [];
  for (const member of members) {
    const [revision] = await tx.select().from(revisions).where(and(eq(revisions.id, member.approvedRevisionId), eq(revisions.courseId, member.course.id)));
    if (!revision || !member.course.lastSuccessfulCheck) throw new Error("Missing retained membership evidence");
    facts.push({ course: member.course, revision });
  }
  const eligible = current && facts.length >= 2 && facts.every(({ revision }) => revision.facts.availability !== "unavailable");
  return { group, input, facts, eligible, inputDigest: digest(input) };
}

/** An explicit operator action accepts each current source revision for this group. */
export async function createDraftGroup(db: Database, boss: Queue, definitionInput: GroupDefinition, courseIds: string[]) {
  const definition = groupDefinitionSchema.parse(definitionInput);
  if (courseIds.length < 2 || courseIds.length > 100 || new Set(courseIds).size !== courseIds.length) throw new Error("Select 2–100 distinct source courses");
  return db.transaction(async tx => {
    await tx.insert(groups).values(definition).onConflictDoNothing();
    const [group] = await tx.select().from(groups).where(eq(groups.slug, definition.slug)).for("update");
    if (digest({ slug: group.slug, title: group.title, topic: group.topic, targetLevel: group.targetLevel, criteria: group.criteria }) !== digest(definition)) {
      throw new Error("Slug already belongs to a different definition; editing definitions is deferred");
    }
    const existingMembers = await tx.select().from(memberships).where(eq(memberships.groupId, group.id));
    if (existingMembers.length && digest(existingMembers.map(member => member.courseId).sort()) !== digest([...courseIds].sort())) throw new Error("Changing the member set is not implemented");
    for (const courseId of [...courseIds].sort()) {
      const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).for("share");
      if (!course?.currentRevisionId) throw new Error(`No imported current revision for ${courseId}`);
      await tx.insert(memberships).values({ groupId: group.id, courseId, approvedRevisionId: course.currentRevisionId, approvedDefinitionRevision: group.definitionRevision })
        .onConflictDoUpdate({ target: [memberships.groupId, memberships.courseId], set: { approvedRevisionId: course.currentRevisionId, approvedDefinitionRevision: group.definitionRevision } });
      await tx.insert(coursePlacements).values({ courseId, revisionId: course.currentRevisionId, status: "matched" })
        .onConflictDoUpdate({ target: coursePlacements.courseId, set: { revisionId: course.currentRevisionId, status: "matched" } });
    }
    const { input, inputDigest, eligible } = await loadInputs(tx, group.id);
    if (!eligible) throw new Error("Group needs at least two available or explicitly unknown alternatives");
    const [run] = await tx.insert(runs).values({ groupId: group.id, input, inputDigest }).onConflictDoNothing().returning();
    if (!run) {
      const [existing] = await tx.select().from(runs).where(and(eq(runs.groupId, group.id), eq(runs.inputDigest, inputDigest), eq(runs.operationVersion, "facts-v1")));
      return { groupId: group.id, workflowRunId: existing.id, queued: false };
    }
    const buildJobId = await enqueue(boss, tx, BUILD_GROUP, { version: 1, groupId: group.id, workflowRunId: run.id });
    await tx.update(runs).set({ buildJobId }).where(eq(runs.id, run.id));
    return { groupId: group.id, workflowRunId: run.id, queued: true };
  });
}

export async function publishGroup(db: Database, slug: string, review?: { operator: string; note: string }) {
  return db.transaction(async tx => {
    const [identity] = await tx.select({ id: groups.id }).from(groups).where(eq(groups.slug, slug));
    if (!identity) throw new Error("Group not found");
    const { group, inputDigest, eligible } = await loadInputs(tx, identity.id);
    if (!group.currentSnapshotId || !eligible) throw new Error("Publication requires two current, eligible alternatives and a reviewed snapshot");
    const [snapshot] = await tx.select().from(snapshots).where(eq(snapshots.id, group.currentSnapshotId));
    const [run] = await tx.select().from(runs).where(eq(runs.id, snapshot.runId));
    if (snapshot.data.analysis && (!review?.operator.trim() || !review.note.trim())) throw new Error("Explicit recorded publication approval required");
    if (snapshot.data.analysis && !await (await import("./group-ai.ts")).analysisCurrent(tx, snapshot.data.analysis.analysisId)) throw new Error("Reviewed current assessment required");
    if (run.state !== "succeeded" || run.inputDigest !== inputDigest) throw new Error("Cannot publish superseded or incomplete inputs");
    if (snapshot.data.analysis) await tx.insert(groupReviews).values({ definitionId: snapshot.data.analysis.definitionId, action: "publish", operator: review!.operator, note: review!.note, data: { snapshotId: snapshot.id, analysisId: snapshot.data.analysis.analysisId } });
    await tx.update(groups).set({ state: "published", publishedSnapshotId: snapshot.id }).where(eq(groups.id, group.id));
    return { slug, snapshotId: snapshot.id };
  });
}

export async function databaseReady(db: Database) {
  // Verify application and queue schemas were explicitly initialized.
  await db.execute(sql`select 1 from comparison_groups limit 1`);
}
