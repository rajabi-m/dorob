import type { SQL, ReservedSQL } from "bun";
import type { CourseIngestion, CourseSnapshot, CourseReference, IngestedCourseDetail, Page, ThumbnailAsset } from "@dorob/core";
import { CatalogError, transaction, type Pagination } from "./catalog";
import { factHash, requestHash, validateIngestion } from "./ingestion-validation";

import { COURSE_QUERY_LOCK, writeCourseQueryEntry } from "./course-query-preparation";

export interface StoredAsset extends ThumbnailAsset { storageKey: string }
export interface UploadRecord { id: string; stagingKey: string; hash: string; profile: string; width: number; height: number; byteSize: number; expiresAt: string; consumedSnapshotId: string | null }
export interface IngestionRepository {
  ingest(input: CourseIngestion): Promise<{ snapshot: CourseSnapshot; created: boolean }>;
  current(courseId: string): Promise<IngestedCourseDetail>;
  history(courseId: string, page: Pagination): Promise<Page<CourseSnapshot>>;
  snapshot(courseId: string, snapshotId: string): Promise<CourseSnapshot>;
  asset(id: string): Promise<StoredAsset>;
  saveUpload(upload: UploadRecord): Promise<void>;
  upload(id: string): Promise<UploadRecord>;
  cleanupUploads(): Promise<string[]>;
  stageReferenced(key: string): Promise<boolean>;
  invalidate(snapshotId: string, assetId: string): Promise<void>;
  claim(courseId: string, snapshotId: string): Promise<{ snapshot: CourseSnapshot; leaseId: string | null }>;
  finish(snapshotId: string, leaseId: string, asset: Omit<StoredAsset, "id" | "url">): Promise<void>;
  fail(snapshotId: string, leaseId: string, code: string): Promise<void>;
}
const referenceFields = `id,provider_id AS "providerId",provider_course_id AS "providerCourseId",title,source_url AS "sourceUrl"`;
export const snapshotProjection = `s.id,s.course_id AS "courseId",s.acceptance_order AS "acceptanceOrder",s.received_at::text AS "receivedAt",s.request_hash AS "requestHash",s.fact_hash AS "factHash",s.payload,
  a.status,a.failure_code AS "failureCode",f.id AS "assetId",f.hash,f.profile,f.width,f.height,f.byte_size AS "byteSize",f.storage_key AS "storageKey"`;
export const snapshotJoins = `FROM course_snapshots s JOIN thumbnail_attempts a ON a.snapshot_id=s.id LEFT JOIN thumbnail_assets f ON a.asset_id=f.id`;
export interface SnapshotRow extends Omit<CourseSnapshot, "thumbnail" | "presentationReady"> {
  status: CourseSnapshot["thumbnail"]["status"]; failureCode: string | null; assetId: string | null; hash: string; profile: string; width: number; height: number; byteSize: number;
}
export function snapshotRow(row: SnapshotRow): CourseSnapshot {
  const asset: ThumbnailAsset | null = row.assetId ? { id: row.assetId, hash: row.hash, profile: row.profile, width: row.width, height: row.height, byteSize: row.byteSize, format: "webp", url: `/assets/thumbnails/${row.assetId}` } : null;
  return { id: row.id, courseId: row.courseId, acceptanceOrder: row.acceptanceOrder, receivedAt: new Date(row.receivedAt).toISOString(), requestHash: row.requestHash, factHash: row.factHash, payload: row.payload,
    thumbnail: { status: row.status, failureCode: row.failureCode, asset }, presentationReady: row.status === "ready" && asset !== null };
}
async function readSnapshot(tx: ReservedSQL, courseId: string, id: string) {
  const rows: SnapshotRow[] = await tx.unsafe(`SELECT ${snapshotProjection} ${snapshotJoins} WHERE s.course_id=$1 AND s.id=$2::uuid`, [courseId, id]);
  if (!rows.length) throw new CatalogError(404); return snapshotRow(rows[0]);
}
const uploadFields = `id,staging_key AS "stagingKey",hash,profile,width,height,byte_size AS "byteSize",expires_at::text AS "expiresAt",consumed_snapshot_id AS "consumedSnapshotId"`;
export function createIngestionRepository(sql: SQL): IngestionRepository {
  return {
    ingest(input) {
      const value = validateIngestion(input); const id = `${value.providerId}:${value.providerCourseId}`;
      const request = requestHash(value), facts = factHash(value);
      return transaction(sql, false, async tx => {
        await tx`SELECT pg_advisory_xact_lock_shared(${COURSE_QUERY_LOCK})`;
        await tx`INSERT INTO courses(id,provider_id,provider_course_id,title,source_url) VALUES (${id},${value.providerId},${value.providerCourseId},${value.title},${value.sourceUrl}) ON CONFLICT (provider_id,provider_course_id) DO NOTHING`;
        await tx`SELECT id FROM courses WHERE id=${id} FOR UPDATE`;
        const previous = await tx`SELECT id,request_hash FROM course_snapshots WHERE course_id=${id} AND submission_id=${value.submissionId}`;
        if (previous.length) {
          if (previous[0].request_hash !== request) throw new CatalogError(409);
          return { snapshot: await readSnapshot(tx, id, previous[0].id), created: false };
        }
        const thumbnail = value.thumbnail.data;
        if (thumbnail?.kind === "upload") {
          const uploads = await tx`SELECT id,consumed_snapshot_id,expires_at > now() AS active FROM thumbnail_uploads WHERE id=${thumbnail.uploadId} FOR UPDATE`;
          if (!uploads.length || !uploads[0].active) throw new CatalogError(404);
          if (uploads[0].consumed_snapshot_id) throw new CatalogError(409);
        }
        const [row] = await tx`INSERT INTO course_snapshots(course_id,submission_id,acceptance_order,schema_version,checked_at,request_hash,fact_hash,payload)
          VALUES (${id},${value.submissionId},(SELECT COALESCE(MAX(acceptance_order),0)+1 FROM course_snapshots WHERE course_id=${id}),3,${value.source.checkedAt},${request},${facts},${value}::jsonb) RETURNING id`;
        await tx`INSERT INTO thumbnail_attempts(snapshot_id,status) VALUES (${row.id},${thumbnail ? "pending" : "missing"})`;
        if (thumbnail?.kind === "upload") await tx`UPDATE thumbnail_uploads SET consumed_snapshot_id=${row.id} WHERE id=${thumbnail.uploadId}`;
        await tx`UPDATE courses SET current_snapshot_id=${row.id},title=${value.title},source_url=${value.sourceUrl},updated_at=now() WHERE id=${id}`;
        await writeCourseQueryEntry(tx,id,row.id,value);
        return { snapshot: await readSnapshot(tx, id, row.id), created: true };
      });
    },
    current(courseId) {
      return transaction(sql, true, async tx => {
        const rows: (CourseReference & { current: string | null })[] = await tx.unsafe(`SELECT ${referenceFields},current_snapshot_id AS current FROM courses WHERE id=$1`, [courseId]);
        if (!rows.length) throw new CatalogError(404);
        const { current, ...reference } = rows[0]; const snapshot = current ? await readSnapshot(tx, courseId, current) : null;
        return { reference, snapshot, presentationReady: snapshot?.presentationReady ?? false };
      });
    },
    history(courseId, page) {
      return transaction(sql, true, async tx => {
        if (!(await tx`SELECT id FROM courses WHERE id=${courseId}`).length) throw new CatalogError(404);
        const rows: SnapshotRow[] = await tx.unsafe(`SELECT ${snapshotProjection} ${snapshotJoins} WHERE s.course_id=$1 ORDER BY s.acceptance_order DESC LIMIT $2 OFFSET $3`, [courseId, page.limit, page.offset]);
        const [{ total }] = await tx`SELECT count(*)::int AS total FROM course_snapshots WHERE course_id=${courseId}`;
        return { items: rows.map(snapshotRow), total, ...page };
      });
    },
    snapshot: (courseId, id) => transaction(sql, true, tx => readSnapshot(tx, courseId, id)),
    asset(id) {
      return transaction(sql, true, async tx => {
        const rows = await tx`SELECT id,hash,profile,width,height,byte_size AS "byteSize",storage_key AS "storageKey",format FROM thumbnail_assets WHERE id=${id}::uuid`;
        if (!rows.length) throw new CatalogError(404); return { ...rows[0], url: `/assets/thumbnails/${id}` } as StoredAsset;
      });
    },
    saveUpload(upload) {
      return transaction(sql, false, async tx => {
        await tx`INSERT INTO thumbnail_uploads(id,staging_key,hash,profile,width,height,byte_size,expires_at) VALUES (${upload.id},${upload.stagingKey},${upload.hash},${upload.profile},${upload.width},${upload.height},${upload.byteSize},${upload.expiresAt})`;
      });
    },
    upload(id) {
      return transaction(sql, true, async tx => {
        const rows: UploadRecord[] = await tx.unsafe(`SELECT ${uploadFields} FROM thumbnail_uploads WHERE id=$1`, [id]);
        if (!rows.length) throw new CatalogError(404); return rows[0];
      });
    },
    cleanupUploads() {
      return transaction(sql, false, async tx => {
        // Retain consumed pending/failed staging for explicit retry, even after expiry.
        const rows = await tx`DELETE FROM thumbnail_uploads WHERE id IN (SELECT u.id FROM thumbnail_uploads u LEFT JOIN thumbnail_attempts a ON a.snapshot_id=u.consumed_snapshot_id
          WHERE (u.consumed_snapshot_id IS NULL AND u.expires_at < now()) OR a.status='ready' LIMIT 100) RETURNING staging_key`;
        return rows.map((row: { staging_key: string }) => row.staging_key);
      });
    },
    stageReferenced(key) {
      return transaction(sql, true, async tx => (await tx`SELECT id FROM thumbnail_uploads WHERE staging_key=${key}`).length > 0);
    },
    invalidate(id, assetId) {
      return transaction(sql, false, async tx => {
        await tx`UPDATE thumbnail_attempts SET status='failed',failure_code='asset_unavailable',asset_id=NULL,updated_at=now() WHERE snapshot_id=${id}::uuid AND status='ready' AND asset_id=${assetId}::uuid`;
      });
    },
    claim(courseId, id) {
      return transaction(sql, false, async tx => {
        await readSnapshot(tx, courseId, id);
        const [attempt] = await tx`SELECT status,lease_until > now() AS active FROM thumbnail_attempts WHERE snapshot_id=${id}::uuid FOR UPDATE`;
        if (attempt.active) throw new CatalogError(409);
        if (["ready", "missing"].includes(attempt.status)) return { snapshot: await readSnapshot(tx, courseId, id), leaseId: null };
        const leaseId = crypto.randomUUID();
        await tx`UPDATE thumbnail_attempts SET status='pending',failure_code=NULL,lease_id=${leaseId},lease_until=now()+interval '60 seconds',attempt_count=attempt_count+1,updated_at=now() WHERE snapshot_id=${id}::uuid`;
        return { snapshot: await readSnapshot(tx, courseId, id), leaseId };
      });
    },
    finish(id, lease, asset) {
      return transaction(sql, false, async tx => {
        const rows = await tx`SELECT snapshot_id FROM thumbnail_attempts WHERE snapshot_id=${id}::uuid AND lease_id=${lease}::uuid AND lease_until > now() FOR UPDATE`;
        if (!rows.length) throw new CatalogError(409);
        const [stored] = await tx`INSERT INTO thumbnail_assets(hash,profile,storage_key,format,width,height,byte_size) VALUES (${asset.hash},${asset.profile},${asset.storageKey},'webp',${asset.width},${asset.height},${asset.byteSize})
          ON CONFLICT (hash) DO UPDATE SET hash=EXCLUDED.hash RETURNING id`;
        await tx`UPDATE thumbnail_attempts SET status='ready',failure_code=NULL,asset_id=${stored.id},profile=${asset.profile},lease_id=NULL,lease_until=NULL,updated_at=now() WHERE snapshot_id=${id}::uuid`;
      });
    },
    fail(id, lease, code) {
      return transaction(sql, false, async tx => {
        await tx`UPDATE thumbnail_attempts SET status='failed',failure_code=${code},asset_id=NULL,lease_id=NULL,lease_until=NULL,updated_at=now() WHERE snapshot_id=${id}::uuid AND lease_id=${lease}::uuid`;
      });
    },
  };
}
