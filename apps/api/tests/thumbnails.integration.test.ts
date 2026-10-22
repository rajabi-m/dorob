import { describe, test, expect } from "bun:test";
import { mkdtemp, rm, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { isolatedDatabase } from "./helpers";
import { migrate, readMigrations } from "../src/migrations";
import { createIngestionRepository } from "../src/ingestion";
import { createAssetStore, loadStorageConfig } from "../src/asset-store";
import { createRasterProcessor, ImageError } from "../src/raster";
import { createThumbnailService } from "../src/thumbnails";
import { minimal } from "./ingestion-validation.test";

async function fixture(color = "red") { return sharp({ create: { width: 128, height: 64, channels: 3, background: color } }).png().toBuffer(); }
describe.skipIf(process.env.API_INTEGRATION !== "1")("thumbnail durability", () => {
  test("upload expiry, consumption, replay, content reuse and restart recovery", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dorob-assets-")); const raster = createRasterProcessor();
    try {
      await isolatedDatabase(async sql => {
        await migrate(sql, await readMigrations()); const repo = createIngestionRepository(sql);
        const store = createAssetStore({ assetDirectory: join(directory, "assets"), stagingDirectory: join(directory, "stage") });
        const service = createThumbnailService(repo, store, raster, async () => fixture()); await service.initialize();
        const token = await service.upload(new Blob([new Uint8Array(await fixture())]));
        const input = minimal(); input.thumbnail.data = { kind: "upload", uploadId: token.uploadId, alt: "نمونه" };
        const first = (await repo.ingest(input)).snapshot;
        expect((await repo.ingest(input)).snapshot.id).toBe(first.id);
        const second = minimal(); second.submissionId = "second"; second.thumbnail.data = input.thumbnail.data;
        await expect(repo.ingest(second)).rejects.toMatchObject({ status: 409 });
        await sql`UPDATE thumbnail_uploads SET expires_at=now()-interval '2 hours' WHERE id=${token.uploadId}`;
        const restart = createThumbnailService(createIngestionRepository(sql), store, raster, async () => fixture()); await restart.initialize();
        expect((await readdir(store.config.stagingDirectory)).length).toBe(1);
        const ready = await restart.process(first.courseId, first.id); expect(ready.presentationReady).toBe(true);
        expect(ready.thumbnail.asset!.width).toBe(128); expect((await restart.asset(ready.thumbnail.asset!.id)).bytes.length).toBe(ready.thumbnail.asset!.byteSize);
        expect(await readdir(store.config.stagingDirectory)).toEqual([]);
        expect((await repo.ingest(input)).snapshot.id).toBe(first.id); // Replay after consumed staging cleanup.
        const expired = await service.upload(new Blob([new Uint8Array(await fixture())]));
        await sql`UPDATE thumbnail_uploads SET expires_at=now()-interval '1 second' WHERE id=${expired.uploadId}`;
        second.thumbnail.data = { kind: "upload", uploadId: expired.uploadId, alt: "test" };
        await expect(repo.ingest(second)).rejects.toMatchObject({ status: 404 });
        await restart.initialize(); expect(await readdir(store.config.stagingDirectory)).toEqual([]);
        // Same processed URL bytes get a separate snapshot association and one permanent asset.
        second.thumbnail.data = { kind: "url", url: "https://example.org/image.png", alt: "test" };
        const next = (await repo.ingest(second)).snapshot; const other = await restart.process(next.courseId, next.id);
        expect(other.thumbnail.asset!.id).toBe(ready.thumbnail.asset!.id); expect((await readdir(store.config.assetDirectory)).length).toBe(1);
        expect((await sql`SELECT count(*)::int AS n FROM thumbnail_assets`)[0].n).toBe(1);
        expect((await restart.inspect(await repo.snapshot(first.courseId, first.id))).thumbnail.asset!.id).toBe(ready.thumbnail.asset!.id);
        // Concurrent identical atomic filesystem writes do not duplicate permanent files.
        const image = await raster.process(await fixture("blue")); const written = await Promise.all([store.persist(image), store.persist(image)]);
        expect(written[0]).toEqual(written[1]); expect((await readdir(store.config.assetDirectory)).length).toBe(2);
        await expect(store.read("../outside.webp", "hash")).rejects.toMatchObject({ code: "asset_unavailable" });
      });
    } finally { await raster.close(); await rm(directory, { recursive: true, force: true }); }
  });
  test("leases, late older processing, safe failures, missing/corrupt files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dorob-assets-")); const raster = createRasterProcessor();
    try {
      await isolatedDatabase(async sql => {
        await migrate(sql, await readMigrations()); const repo = createIngestionRepository(sql);
        const store = createAssetStore({ assetDirectory: join(directory, "assets"), stagingDirectory: join(directory, "stage") });
        let fail = false, color = "red";
        const service = createThumbnailService(repo, store, raster, async () => { if (fail) throw new ImageError("download_failed"); return fixture(color); }); await service.initialize();
        const input = minimal(); input.thumbnail.data = { kind: "url", url: "https://example.org/cover", alt: "test" };
        const first = (await repo.ingest(input)).snapshot;
        const claim = await repo.claim(first.courseId, first.id); expect(claim.leaseId).not.toBeNull();
        await expect(service.process(first.courseId, first.id)).rejects.toMatchObject({ status: 409 });
        await sql`UPDATE thumbnail_attempts SET lease_until=now()-interval '1 second' WHERE snapshot_id=${first.id}`;
        const secondInput = { ...input, submissionId: "second" }; const second = (await repo.ingest(secondInput)).snapshot;
        const older = await service.process(first.courseId, first.id); expect(older.presentationReady).toBe(true);
        expect((await repo.current(first.courseId)).snapshot!.id).toBe(second.id); expect((await repo.current(first.courseId)).presentationReady).toBe(false);
        fail = true; const failed = await service.process(second.courseId, second.id); expect(failed.thumbnail.failureCode).toBe("download_failed"); expect(failed.presentationReady).toBe(false);
        expect((await repo.snapshot(first.courseId, first.id)).thumbnail.asset).not.toBeNull();
        fail = false; color = "blue"; const newer = await service.process(second.courseId, second.id); expect(newer.thumbnail.asset!.id).not.toBe(older.thumbnail.asset!.id);
        const asset = await repo.asset(newer.thumbnail.asset!.id); await writeFile(join(store.config.assetDirectory, asset.storageKey), "corrupt");
        const current = await service.inspect((await repo.current(second.courseId)).snapshot!); expect(current.presentationReady).toBe(false); expect(current.thumbnail.failureCode).toBe("asset_unavailable");
        expect((await service.inspect(await repo.snapshot(first.courseId, first.id))).presentationReady).toBe(true);
        const restored = await service.process(second.courseId, second.id); // Corrupt content keys cannot falsely become ready.
        expect(restored.thumbnail.status).toBe("failed");
        await rm(join(store.config.assetDirectory, asset.storageKey));
        const recovered = await service.process(second.courseId, second.id); expect(recovered.presentationReady).toBe(true);
        await migrate(sql, await readMigrations()); await service.initialize(); expect((await service.asset(older.thumbnail.asset!.id)).bytes.length).toBeGreaterThan(0);
      });
    } finally { await raster.close(); await rm(directory, { recursive: true, force: true }); }
  });
});
test("storage configuration separates assets from staging", () => {
  expect(loadStorageConfig({ THUMBNAIL_ASSET_DIR: "/tmp/assets", THUMBNAIL_STAGING_DIR: "/tmp/stage" }).assetDirectory).toBe("/tmp/assets");
  expect(() => loadStorageConfig({ THUMBNAIL_ASSET_DIR: "/tmp/assets", THUMBNAIL_STAGING_DIR: "/tmp/assets/stage" })).toThrow();
});
