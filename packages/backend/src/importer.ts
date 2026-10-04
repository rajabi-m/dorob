import { placementOutbox, coursePlacements } from "@dorob/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { Database, Transaction } from "@dorob/db";
import { courses, revisions, providers, observations, memberships, groups, runs, invalidations } from "@dorob/db/schema";
import type { ProviderCourse } from "@dorob/utils/course";
import { validateExport } from "./course-validation.ts";
import { digest } from "./hashing.ts";

async function saveCourse(tx: Transaction, course: ProviderCourse) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${course.id}, 0))`);
  await tx.insert(courses).values({ id: course.id, providerId: course.providerId, providerCourseId: course.providerCourseId,
    sourceUrl: course.sourceUrl }).onConflictDoNothing();
  const [existing] = await tx.select().from(courses).where(eq(courses.id, course.id)).for("update");
  const sourceEvidence: Partial<ProviderCourse["source"]> = { ...course.source };
  delete sourceEvidence.checkedAt;
  delete sourceEvidence.contentHash;
  // Full evidence identity differs from the adapter's facts-only hash. Retain changed
  // locators/warnings/raw evidence even when the normalized facts are unchanged.
  const evidenceHash = digest({ ...course, source: sourceEvidence });
  await tx.insert(revisions).values({ courseId: course.id, contentHash: course.source.contentHash, evidenceHash, facts: course })
    .onConflictDoNothing();
  const [revision] = await tx.select().from(revisions).where(and(eq(revisions.courseId, course.id), eq(revisions.evidenceHash, evidenceHash)));
  const observedAt = new Date(course.source.checkedAt);
  if (existing.lastSuccessfulCheck?.getTime() === observedAt.getTime() && existing.currentRevisionId !== revision.id) {
    throw new Error("Conflicting course evidence at the same observation timestamp");
  }
  const [observation] = await tx.insert(observations).values({ courseId: course.id, revisionId: revision.id, checkedAt: observedAt, status: "succeeded" })
    .onConflictDoNothing().returning();
  if (!observation) {
    const [prior] = await tx.select().from(observations).where(and(eq(observations.courseId, course.id), eq(observations.checkedAt, observedAt), eq(observations.status, "succeeded")));
    if (prior.revisionId !== revision.id) throw new Error("Conflicting retained observation at the same timestamp");
  }
  // Out-of-order saved exports remain evidence but cannot replace newer facts.
  if (!existing.lastSuccessfulCheck || observedAt > existing.lastSuccessfulCheck) {
    if (existing.currentRevisionId && existing.currentRevisionId !== revision.id) {
      // Conservative: every retained evidence revision requires operator reapproval.
      // Includes offers/availability/provenance, not just educational text.
      const affected = await tx.select().from(memberships).where(eq(memberships.courseId, course.id));
      for (const member of affected.sort((a, b) => a.groupId.localeCompare(b.groupId))) {
        await tx.update(groups).set({ currentSnapshotId: null }).where(eq(groups.id, member.groupId));
        await tx.update(runs).set({ state: "superseded", updatedAt: new Date() })
          .where(and(eq(runs.groupId, member.groupId), sql`${runs.state} in ('queued', 'running', 'failed')`));
        // Transactional outbox: never lose work if the queue/client is unavailable.
        await tx.insert(invalidations).values({ groupId: member.groupId, courseId: course.id, revisionId: revision.id }).onConflictDoNothing();
      }
    }
    await tx.update(courses).set({ currentRevisionId: revision.id, lastSuccessfulCheck: observedAt, sourceUrl: course.sourceUrl }).where(eq(courses.id, course.id));
    if (existing.currentRevisionId !== revision.id) {
      await tx.insert(placementOutbox).values({ revisionId: revision.id, courseId: course.id }).onConflictDoNothing();
      await tx.insert(coursePlacements).values({ courseId: course.id, revisionId: revision.id, status: "unmatched" })
        .onConflictDoUpdate({ target: coursePlacements.courseId, set: { revisionId: revision.id, taxonomyVersion: null, status: "unmatched" } });
    }
  }
  return { courseId: course.id, revisionId: revision.id };
}

export async function importSavedExport(db: Database, input: unknown) {
  const data = validateExport(input); // Validate the entire file before any writes.
  return db.transaction(tx => importExportTransaction(tx, data));
}

export async function importExportTransaction(tx: Transaction, input: unknown) {
  const data = validateExport(input);
  await tx.insert(providers).values({ id: data.providerId }).onConflictDoNothing();
  const imported = [];
  // Stable lock order permits simultaneous imports on separate cloud hosts.
  for (const course of [...data.courses].sort((a, b) => a.id.localeCompare(b.id))) imported.push(await saveCourse(tx, course));
  let failuresRecorded = 0;
  for (const error of data.errors) {
    const [course] = await tx.select().from(courses).where(and(eq(courses.providerId, data.providerId), eq(courses.sourceUrl, error.sourceUrl)));
    if (!course) continue; // No fabricated identity for an undiscovered failed URL.
    await tx.insert(observations).values({ courseId: course.id, checkedAt: new Date(error.attemptedAt), status: "failed",
      error: error.message.slice(0, 2000) }).onConflictDoNothing();
    failuresRecorded++;
  }
  return { imported, exportFailures: data.errors.length, failuresRecorded };
}
