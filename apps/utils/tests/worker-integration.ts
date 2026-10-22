/** Explicit isolated real-API acceptance; not part of default offline tests. */
import { SQL } from "bun";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { createApp } from "../../api/src/app";
import { migrate, readMigrations } from "../../api/src/migrations";
import { createIngestionRepository } from "../../api/src/ingestion";
import { createThumbnailService } from "../../api/src/thumbnails";
import { createAssetStore } from "../../api/src/asset-store";
import { createRasterProcessor, ImageError } from "../../api/src/raster";
import { MaktabkhoonehScraper } from "../scrapers/maktabkhooneh";
import { HttpBackendClient } from "../worker/backend-client";
import { ScraperWorker } from "../worker/worker";
import { outputRoot } from "../worker/journal";

const adminUrl = process.env.DATABASE_URL ?? "postgres://dorob:dorob_dev@127.0.0.1:5432/dorob";
const admin = new SQL(adminUrl), name = `dorob_worker_${crypto.randomUUID().replaceAll("-", "")}`;
const assets = await mkdtemp(join(tmpdir(), "dorob-worker-assets-"));
await mkdir(outputRoot, { recursive: true }); const journals = await mkdtemp(join(outputRoot, "integration-"));
let sql: SQL | undefined, app: ReturnType<typeof createApp> | undefined, created = false;
let imageFailed = true;
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=", "base64");
const source = await readFile(new URL("fixtures/maktabkhooneh-course.html", import.meta.url), "utf8");
let origin = "", collections = 0;
function scraper() {
  return new MaktabkhoonehScraper({ delayMs: 0, fetch: (async input => { collections++; return new Response(String(input).endsWith("robots.txt") ? "" : source); }) as typeof fetch });
}
async function start() {
  const repository = createIngestionRepository(sql!);
  const thumbnails = createThumbnailService(repository, createAssetStore({ assetDirectory: join(assets, "permanent"), stagingDirectory: join(assets, "staging") }), createRasterProcessor(), async () => {
    if (imageFailed) throw new ImageError("download_failed"); return image;
  });
  app = createApp({ sql: sql!, ready: async () => true, close: async () => {} }, undefined, { ingestion: repository, thumbnails });
  app.listen({ hostname: "127.0.0.1", port: 0 });
  origin = `http://127.0.0.1:${app.server!.port}`;
}
async function history() { return (await fetch(origin + "/api/v1/manage/courses/maktabkhooneh%3A10465/snapshots")).json(); }
const selection = { mode: "urls" as const, urls: ["https://maktabkhooneh.org/course/python-mk346/"], limit: null };
try {
  await admin.unsafe(`CREATE DATABASE ${name}`); created = true;
  const url = new URL(adminUrl); url.pathname = "/" + name; sql = new SQL(url.href);
  await migrate(sql, await readMigrations()); await start();
  let lost = false;
  const client = new HttpBackendClient(origin, { sleep: async () => {}, fetch: (async (input, init) => {
    const response = await fetch(input, init);
    if (!lost && String(input).endsWith("course-ingestions")) { lost = true; await response.arrayBuffer(); throw new TypeError("lost receipt"); }
    return response;
  }) as typeof fetch });
  const checkpoint = join(journals, "first.json");
  const first = await new ScraperWorker(scraper(), client).run({ checkpoint, selection });
  assert.equal(first.replayed, 1); assert.equal(first.images.failed, 1); assert.equal((await history()).total, 1);
  const sourceCalls = collections; imageFailed = false;
  const resumed = await new ScraperWorker(scraper(), new HttpBackendClient(origin)).run({ checkpoint, resume: true });
  assert.equal(resumed.exitCode, 0); assert.equal(collections, sourceCalls); assert.equal((await history()).total, 1);
  const firstSnapshot = (await history()).items[0];
  const fresh = scraper(), collect = fresh.scrapeCourse.bind(fresh);
  fresh.scrapeCourse = async url => { const value = await collect(url); value.pricing.data![0].amount! += 1; return value; };
  await new ScraperWorker(fresh, new HttpBackendClient(origin)).run({ checkpoint: join(journals, "fresh.json"), selection });
  const before = await history(); assert.equal(before.total, 2);
  assert.notEqual(before.items[0].payload.submissionId, before.items[1].payload.submissionId);
  assert.equal(before.items[0].thumbnail.asset.id, firstSnapshot.thumbnail.asset.id);
  const port = app!.server!.port; await app!.stop(); app = undefined;
  await migrate(sql, await readMigrations());
  // Restart the same service/storage at the same destination so resume config matches.
  const repository = createIngestionRepository(sql);
  const thumbnails = createThumbnailService(repository, createAssetStore({ assetDirectory: join(assets, "permanent"), stagingDirectory: join(assets, "staging") }), createRasterProcessor(), async () => image);
  app = createApp({ sql, ready: async () => true, close: async () => {} }, undefined, { ingestion: repository, thumbnails });
  app.listen({ hostname: "127.0.0.1", port });
  assert.equal((await history()).total, 2);
  const historical = await fetch(origin + `/api/v1/manage/courses/maktabkhooneh%3A10465/snapshots/${firstSnapshot.id}`);
  assert.equal((await historical.json()).payload.pricing.data[0].amount, firstSnapshot.payload.pricing.data[0].amount);
  const hosted = await fetch(origin + firstSnapshot.thumbnail.asset.url);
  assert.equal(hosted.headers.get("content-type"), "image/webp"); assert.equal((await hosted.arrayBuffer()).byteLength, firstSnapshot.thumbnail.asset.byteSize);
  const repeated = await new ScraperWorker(scraper(), new HttpBackendClient(origin)).run({ checkpoint, resume: true });
  assert.equal(repeated.exitCode, 0); assert.equal((await history()).total, 2);
  console.log("Worker real-API acceptance passed: isolated DB, lost-receipt replay, retained/changed history, image failure/retry/reuse, hosted assets and normal service restart.");
} finally {
  await app?.stop(); await sql?.close({ timeout: 0 });
  if (created) await admin.unsafe(`DROP DATABASE ${name}`);
  await admin.close({ timeout: 0 }); await rm(assets, { recursive: true, force: true }); await rm(journals, { recursive: true, force: true });
}
