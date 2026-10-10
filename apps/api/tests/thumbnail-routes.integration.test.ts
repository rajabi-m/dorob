import { describe, test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { isolatedDatabase } from "./helpers";
import { migrate, readMigrations } from "../src/migrations";
import { createIngestionRepository } from "../src/ingestion";
import { createAssetStore } from "../src/asset-store";
import { createRasterProcessor, INPUT_LIMIT } from "../src/raster";
import { createThumbnailService } from "../src/thumbnails";
import { createApp } from "../src/app";
import { minimal } from "./ingestion-validation.test";

describe.skipIf(process.env.API_INTEGRATION !== "1")("thumbnail HTTP", () => {
  test("multipart, process, lease errors, readiness, immutable bytes and safe namespaces", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dorob-http-assets-")); const raster = createRasterProcessor();
    try {
      await isolatedDatabase(async sql => {
        await migrate(sql, await readMigrations()); const repo = createIngestionRepository(sql);
        const store = createAssetStore({ assetDirectory: join(directory, "assets"), stagingDirectory: join(directory, "stage") });
        const bytes = await sharp({ create: { width: 120, height: 60, channels: 3, background: "red" } }).png().toBuffer();
        const service = createThumbnailService(repo, store, raster, async () => bytes);
        const app = createApp({ ready: async () => true, close: async () => {}, sql }, undefined, { ingestion: repo, thumbnails: service });
        async function call(method: string, path: string, body?: unknown) {
          return app.handle(new Request(`http://localhost${path}`, { method, ...(body instanceof FormData ? { body } : body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) }));
        }
        async function upload(bytes: Uint8Array) { const form = new FormData(); form.set("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "../../cover.png"); return call("POST", "/api/v1/manage/thumbnail-uploads", form); }
        expect((await upload(new Uint8Array(INPUT_LIMIT + 1))).status).toBe(413); expect((await upload(Buffer.from("not an image"))).status).toBe(422);
        const uploaded = await upload(bytes); expect(uploaded.status).toBe(201); const token = await uploaded.json();
        const input = minimal(); input.thumbnail.data = { kind: "upload", uploadId: token.uploadId, alt: "نمونه" };
        const accepted = await call("POST", "/api/v1/manage/course-ingestions", input); expect(accepted.status).toBe(201); const snapshot = await accepted.json();
        const base = `/api/v1/manage/courses/${encodeURIComponent(snapshot.courseId)}`;
        const processPath = `${base}/snapshots/${snapshot.id}/thumbnail/process`;
        await repo.claim(snapshot.courseId, snapshot.id); expect((await call("POST", processPath)).status).toBe(409);
        await sql`UPDATE thumbnail_attempts SET lease_until=now()-interval '1 second' WHERE snapshot_id=${snapshot.id}`;
        const processed = await call("POST", processPath); expect(processed.status).toBe(200); const result = await processed.json(); expect(result.presentationReady).toBe(true);
        const current = await (await call("GET", base)).json(); expect(current.presentationReady).toBe(true); expect(current.snapshot.payload.pricing.data).toBeNull();
        const image = await call("GET", result.thumbnail.asset.url); expect(image.status).toBe(200); expect(image.headers.get("content-type")).toBe("image/webp"); expect(image.headers.get("cache-control")).toContain("immutable");
        expect((await image.arrayBuffer()).byteLength).toBe(result.thumbnail.asset.byteSize);
        const cached = await app.handle(new Request(`http://localhost${result.thumbnail.asset.url}`, { headers: { "if-none-match": image.headers.get("etag")! } })); expect(cached.status).toBe(304); expect(await cached.text()).toBe("");
        expect((await call("GET", `/assets/thumbnails/${crypto.randomUUID()}`)).status).toBe(404);
        expect((await call("GET", `/assets/thumbnails/${"a".repeat(64)}.webp`)).status).toBe(422);
        expect((await call("GET", "/assets/thumbnails/%2e%2e%2fsecret")).status).toBe(422);
        expect((await call("GET", `/assets/thumbnails/${token.uploadId}`)).status).toBe(422);
        const next = minimal(); next.submissionId = "missing"; await call("POST", "/api/v1/manage/course-ingestions", next);
        expect((await (await call("GET", base)).json()).presentationReady).toBe(false);
        expect((await (await call("GET", `${base}/snapshots/${snapshot.id}`)).json()).presentationReady).toBe(true);
      });
    } finally { await raster.close(); await rm(directory, { recursive: true, force: true }); }
  });
});
