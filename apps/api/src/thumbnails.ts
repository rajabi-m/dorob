import { randomBytes } from "node:crypto";
import type { CourseSnapshot } from "@dorob/core";
import type { IngestionRepository } from "./ingestion";
import type { AssetStore } from "./asset-store";
import { byteHash } from "./asset-store";
import { ImageError, INPUT_LIMIT, type RasterProcessor } from "./raster";

export function createThumbnailService(repository: IngestionRepository, store: AssetStore, raster: RasterProcessor, download: (url: string) => Promise<Buffer>) {
  let active = 0;
  async function bounded<T>(work: () => Promise<T>) {
    if (active >= 2) throw new ImageError("busy", 503);
    active++; try { return await work(); } finally { active--; }
  }
  async function cleanup() {
    await store.initialize();
    for (const key of await repository.cleanupUploads()) await store.removeStage(key);
    await store.cleanupTemporary(); await store.cleanupOrphanStage(key => repository.stageReferenced(key));
  }
  async function inspect(snapshot: CourseSnapshot): Promise<CourseSnapshot> {
    const asset = snapshot.thumbnail.asset;
    if (snapshot.thumbnail.status === "ready" && asset) {
      try { const stored = await repository.asset(asset.id); await store.read(stored.storageKey, stored.hash); }
      catch (error) {
        if (!(error instanceof ImageError)) throw error;
        await repository.invalidate(snapshot.id, asset.id);
        return { ...snapshot, thumbnail: { status: "failed", failureCode: "asset_unavailable", asset: null }, presentationReady: false };
      }
    }
    return snapshot;
  }
  return {
    store, initialize: cleanup, inspect,
    async upload(file: Blob) {
      if (!file.size || file.size > INPUT_LIMIT) throw new ImageError("input_limit", 413);
      return bounded(async () => {
        const image = await raster.process(new Uint8Array(await file.arrayBuffer()));
        const id = randomBytes(32).toString("hex"), expiresAt = new Date(Date.now() + 3600_000).toISOString();
        const stagingKey = await store.stage(image, id);
        try {
          await repository.saveUpload({ id, stagingKey, hash: byteHash(image.bytes), profile: image.profile, width: image.width, height: image.height, byteSize: image.bytes.length, expiresAt, consumedSnapshotId: null });
        } catch (error) { await store.removeStage(stagingKey); throw error; }
        await cleanup(); return { uploadId: id, expiresAt };
      });
    },
    async process(courseId: string, id: string) {
      await inspect(await repository.snapshot(courseId, id));
      const { snapshot, leaseId } = await repository.claim(courseId, id);
      if (!leaseId) return inspect(snapshot);
      try {
        await bounded(async () => {
          const input = snapshot.payload.thumbnail.data;
          if (!input) throw new ImageError("invalid_image");
          let image;
          if (input.kind === "url") image = await raster.process(await download(input.url));
          else {
            const upload = await repository.upload(input.uploadId);
            if (upload.consumedSnapshotId !== id) throw new ImageError("invalid_image");
            image = { bytes: await store.read(upload.stagingKey, upload.hash, true), width: upload.width, height: upload.height, profile: upload.profile };
          }
          const asset = await store.persist(image);
          await repository.finish(id, leaseId, { ...asset, profile: image.profile, width: image.width, height: image.height, byteSize: image.bytes.length, format: "webp" });
        });
      } catch (error) {
        await repository.fail(id, leaseId, error instanceof ImageError ? error.code : "processing_failed");
      }
      await cleanup(); return inspect(await repository.snapshot(courseId, id));
    },
    async asset(id: string) { const asset = await repository.asset(id); return { asset, bytes: await store.read(asset.storageKey, asset.hash) }; },
    close: () => raster.close(),
  };
}
export type ThumbnailService = ReturnType<typeof createThumbnailService>;
