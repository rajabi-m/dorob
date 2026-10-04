import { eq } from "drizzle-orm";
import type { Database } from "@dorob/db";
import { courses, revisions, groups, memberships, snapshots, runs } from "@dorob/db/schema";
import type { PublicCourse, PublicGroup } from "@dorob/core";

export function toPublicCourse(course: typeof courses.$inferSelect, revision: typeof revisions.$inferSelect): PublicCourse {
  const facts = revision.facts;
  return {
    id: course.id, revisionId: revision.id, providerId: course.providerId, title: facts.title,
    sourceUrl: course.sourceUrl, lastSuccessfulCheck: course.lastSuccessfulCheck!.toISOString(),
    availability: facts.availability, providerLevel: facts.providerLevel, durationMinutes: facts.duration.contentMinutes,
    offers: facts.offers?.map(offer => ({ id: offer.id, status: offer.status, amount: offer.amount,
      unit: offer.unit, accessDescription: offer.accessDescription })) ?? null,
    syllabusCoverage: facts.syllabusCoverage.status,
    // Operational warnings and evidence paths remain private; render curated labels.
    warnings: [
      ...(facts.source.warnings.length ? ["منبع داده دارای هشدار استخراج است."] : []),
      ...(facts.syllabusCoverage.status !== "complete" ? ["اطلاعات سرفصل‌ها کامل نیست."] : []),
    ],
  };
}

export async function readGroup(db: Database, slug: string, draft = false): Promise<PublicGroup | null> {
  // A consistent view across groups/members/revisions during simultaneous refreshes.
  return db.transaction(async tx => {
    const [group] = await tx.select().from(groups).where(eq(groups.slug, slug));
    if (!group || (!draft && group.state !== "published")) return null;
    const snapshotId = draft ? group.currentSnapshotId : group.publishedSnapshotId;
    if (!snapshotId) return null;
    const [snapshot] = await tx.select().from(snapshots).where(eq(snapshots.id, snapshotId));
    if (!snapshot) return null;
    const [run] = await tx.select().from(runs).where(eq(runs.id, snapshot.runId));
    const current = await tx.select({ course: courses, approvedRevisionId: memberships.approvedRevisionId, approvedDefinitionRevision: memberships.approvedDefinitionRevision, revision: revisions })
      .from(memberships).innerJoin(courses, eq(courses.id, memberships.courseId))
      .innerJoin(revisions, eq(revisions.id, courses.currentRevisionId)).where(eq(memberships.groupId, group.id));
    const eligible = current.filter(({ course, approvedRevisionId, approvedDefinitionRevision, revision }) => approvedDefinitionRevision === group.definitionRevision && course.currentRevisionId === approvedRevisionId && revision.facts.availability !== "unavailable");
    if (!draft && eligible.length < 2) return null; // Stable HTTP 404; no comparative recommendation below minimum.
    const stale = run.input.definitionRevision !== group.definitionRevision || current.length !== run.input.members.length ||
      run.input.members.some(member => !current.some(({ course, approvedRevisionId }) => course.id === member.courseId && course.currentRevisionId === member.revisionId && approvedRevisionId === member.revisionId));
    // Offers and freshness are read from current facts, independent of retained analysis.
    return { ...snapshot.data, slug: group.slug, generatedAt: snapshot.generatedAt.toISOString(), stale,
      courses: current.map(({ course, revision }) => toPublicCourse(course, revision)) };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
