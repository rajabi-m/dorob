import type { CourseSnapshot, CourseReference } from "@dorob/core";
import type { IngestionRepository } from "../src/ingestion";
import { CatalogError } from "../src/catalog";
import { requestHash, factHash } from "../src/ingestion-validation";

/** In-memory boundary fixture; SQL concurrency/durability are tested separately. */
export function memoryIngestion(): IngestionRepository {
  const snapshots = new Map<string, CourseSnapshot>(), references = new Map<string, CourseReference>(), current = new Map<string, string>();
  function get(courseId: string, id: string) { const snapshot = snapshots.get(id); if (!snapshot || snapshot.courseId !== courseId) throw new CatalogError(404); return structuredClone(snapshot); }
  const unavailable = async (): Promise<never> => { throw new CatalogError(503); };
  return {
    async ingest(input) {
      const courseId = `${input.providerId}:${input.providerCourseId}`;
      const older = [...snapshots.values()].find(row => row.courseId === courseId && row.payload.submissionId === input.submissionId);
      if (older) { if (older.requestHash !== requestHash(input)) throw new CatalogError(409); return { snapshot: get(courseId, older.id), created: false }; }
      const snapshot: CourseSnapshot = { id: crypto.randomUUID(), courseId, acceptanceOrder: [...snapshots.values()].filter(row => row.courseId === courseId).length + 1, receivedAt: new Date().toISOString(), requestHash: requestHash(input), factHash: factHash(input), payload: structuredClone(input), thumbnail: { status: input.thumbnail.data ? "pending" : "missing", asset: null, failureCode: null }, presentationReady: false };
      snapshots.set(snapshot.id, snapshot); current.set(courseId, snapshot.id); references.set(courseId, { id: courseId, providerId: input.providerId, providerCourseId: input.providerCourseId, title: input.title, sourceUrl: input.sourceUrl });
      return { snapshot: structuredClone(snapshot), created: true };
    },
    async current(courseId) { const reference = references.get(courseId); if (!reference) throw new CatalogError(404); return { reference, snapshot: get(courseId, current.get(courseId)!), presentationReady: false }; },
    async history(courseId, page) { if (!references.has(courseId)) throw new CatalogError(404); const rows = [...snapshots.values()].filter(row => row.courseId === courseId).sort((a,b) => b.acceptanceOrder - a.acceptanceOrder); return { items: structuredClone(rows.slice(page.offset, page.offset + page.limit)), total: rows.length, ...page }; },
    async snapshot(courseId, id) { return get(courseId, id); },
    asset: unavailable, saveUpload: unavailable, upload: unavailable, cleanupUploads: unavailable, stageReferenced: unavailable, invalidate: unavailable, claim: unavailable, finish: unavailable, fail: unavailable,
  };
}
