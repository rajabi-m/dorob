import { z } from "zod";
import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@dorob/db";
import { courses, memberships, refreshRequests } from "@dorob/db/schema";
import type { Queue } from "./queue.ts";
import { collectionRequest, enqueueCollectionTransaction, inspectCollection } from "./ingestion.ts";
import { digest } from "./hashing.ts";
export const refreshRequestSchema = z.strictObject({ requestKey: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/), mode: z.enum(["offline", "live"]),
  providers: z.array(z.enum(["maktabkhooneh", "roocket"])).min(1).max(2), courseIds: z.array(z.string().min(1).max(300)).max(100).default([]),
  groupIds: z.array(z.uuid()).max(12).default([]), maxCourses: z.number().int().min(1).max(100), operator: z.string().trim().min(1).max(200),
}).refine(v => v.courseIds.length + v.groupIds.length > 0, "Explicit retained selection required");
export async function requestRefresh(db: Database, boss: Queue, input: unknown, controls: { enabled: boolean; liveEnabled: boolean }) {
  const parsed = refreshRequestSchema.parse(input);
  if (!controls.enabled || parsed.mode === "live" && !controls.liveEnabled) throw new Error("Refresh disabled; explicit opt-in required");
  const data = { ...parsed, providers: [...new Set(parsed.providers)].sort(), courseIds: [...new Set(parsed.courseIds)].sort(), groupIds: [...new Set(parsed.groupIds)].sort() };
  const inputDigest = digest(data);
  return db.transaction(async tx => {
    // Cross-host submission coalescing; no process-local mutex or save-then-enqueue gap.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${data.requestKey}, 91))`);
    const [existing] = await tx.select().from(refreshRequests).where(eq(refreshRequests.requestKey, data.requestKey));
    if (existing) { if (existing.inputDigest !== inputDigest) throw new Error("Refresh key already owns a different selection"); return existing.id; }
    // Bound distinct courses, not membership rows: overlapping groups must never
    // truncate the retained selection before checking its total budget.
    const retainedGroups = data.groupIds.length ? await tx.selectDistinct({ groupId: memberships.groupId }).from(memberships).where(inArray(memberships.groupId, data.groupIds)) : [];
    if (data.groupIds.some(id => !retainedGroups.some(m => m.groupId === id))) throw new Error("Selected group has no retained members");
    const members = data.groupIds.length ? await tx.selectDistinct({ courseId: memberships.courseId }).from(memberships).where(inArray(memberships.groupId, data.groupIds)).limit(101) : [];
    const ids = [...new Set([...data.courseIds, ...members.map(m => m.courseId)])].sort();
    if (!ids.length || ids.length > data.maxCourses) throw new Error("Refresh selection exceeds course budget");
    const selected = await tx.select().from(courses).where(inArray(courses.id, ids)).for("share");
    if (selected.length !== ids.length || selected.some(c => !data.providers.includes(c.providerId as "maktabkhooneh" | "roocket"))) throw new Error("Selection must exist and belong to explicit supported providers");
    const collectionIds: string[] = [];
    for (const providerId of data.providers) {
      const urls = selected.filter(c => c.providerId === providerId).map(c => c.sourceUrl).sort();
      if (!urls.length) throw new Error("Each selected provider needs retained courses");
      const collection = collectionRequest.parse({ providerId, urls, maxCourses: urls.length });
      collectionIds.push(await enqueueCollectionTransaction(tx, boss, collection, urls, data.mode, true));
    }
    const [request] = await tx.insert(refreshRequests).values({ requestKey: data.requestKey, inputDigest, operator: data.operator,
      input: { ...data, selected: selected.map(c => ({ courseId: c.id, revisionId: c.currentRevisionId, sourceUrl: c.sourceUrl })) }, collectionIds }).returning();
    return request.id;
  });
}
export async function inspectRefresh(db: Database, id: string) {
  z.uuid().parse(id);
  const [request] = await db.select().from(refreshRequests).where(eq(refreshRequests.id, id));
  if (!request) throw new Error("Refresh not found");
  return { ...request, collections: await Promise.all(request.collectionIds.map(id => inspectCollection(db, id))) };
}
