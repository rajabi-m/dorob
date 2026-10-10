/** Explicit paid-course acceptance. LPIC-1 is deferred by owner; see Plan.md TODO. */
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
import { createRasterProcessor } from "../../api/src/raster";
import { createImageDownloader } from "../../api/src/image-download";
import { MaktabkhoonehScraper } from "../scrapers/maktabkhooneh";
import { HttpBackendClient } from "../worker/backend-client";
import { ScraperWorker } from "../worker/worker";
import { outputRoot, type Journal } from "../worker/journal";
import type { CourseSnapshot } from "../../../packages/core/src/ingestion";

const adminUrl = process.env.DATABASE_URL ?? "postgres://dorob:dorob_dev@127.0.0.1:5432/dorob";
const admin = new SQL(adminUrl), name = `dorob_worker_live_${crypto.randomUUID().replaceAll("-", "")}`;
const assets = await mkdtemp(join(tmpdir(), "dorob-worker-live-assets-"));
await mkdir(outputRoot, { recursive: true }); const journals = await mkdtemp(join(outputRoot, "live-"));
let sql: SQL | undefined, app: ReturnType<typeof createApp> | undefined, created = false;
try {
  await admin.unsafe(`CREATE DATABASE ${name}`); created = true;
  const url = new URL(adminUrl); url.pathname = "/" + name; sql = new SQL(url.href);
  await migrate(sql, await readMigrations());
  const repository = createIngestionRepository(sql);
  const thumbnails = createThumbnailService(repository, createAssetStore({ assetDirectory: join(assets, "permanent"), stagingDirectory: join(assets, "staging") }), createRasterProcessor(), createImageDownloader());
  app = createApp({ sql, ready: async () => true, close: async () => {} }, undefined, { ingestion: repository, thumbnails });
  app.listen({ hostname: "127.0.0.1", port: 0 });
  const origin = `http://127.0.0.1:${app.server!.port}`;
  const saved = JSON.parse(await readFile(new URL("../../web/src/data/provider-courses.json", import.meta.url), "utf8"));
  const paid = saved.courses.find((c: { id: string }) => c.id === "maktabkhooneh-mk346").sourceUrl;
  const checkpoint = join(journals, "paid.json"), backend = new HttpBackendClient(origin);
  const first = await new ScraperWorker(new MaktabkhoonehScraper(), backend).run({ checkpoint, selection: { mode: "urls", urls: [paid], limit: null } });
  console.log(JSON.stringify(first));
  const journal: Journal = JSON.parse(await readFile(checkpoint, "utf8"));
  const counts: number[] = [];
  for (const entry of journal.entries) {
    if (!entry.receipt) continue;
    const base = `${origin}/api/v1/manage/courses/${encodeURIComponent(entry.receipt.courseId)}`;
    const detail = await (await fetch(base)).json();
    const history = await (await fetch(base + "/snapshots")).json(); counts.push(history.total);
    const snapshot: CourseSnapshot = detail.snapshot;
    console.log(JSON.stringify({ courseId: snapshot.courseId, snapshotId: snapshot.id, offers: snapshot.payload.pricing.data, pricingCoverage: snapshot.payload.pricing.coverage,
      coverage: Object.fromEntries(Object.entries(snapshot.payload).filter(([, v]) => v && typeof v === "object" && "coverage" in v).map(([k, v]) => [k, (v as { coverage: unknown }).coverage])), image: snapshot.thumbnail.status, failureCode: snapshot.thumbnail.failureCode, historyCount: history.total }));
    if (snapshot.thumbnail.asset) { const response = await fetch(origin + snapshot.thumbnail.asset.url); assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/webp"); assert.equal((await response.arrayBuffer()).byteLength, snapshot.thumbnail.asset.byteSize); }
  }
  // Do not recollect failed source pages automatically during this bounded check.
  if (first.collectionFailed || first.deliveryPending || first.deliveryFailed || first.status === "interrupted") {
    console.log("Live collection/delivery acceptance blocked; checkpoint retained at " + checkpoint); process.exitCode = 1;
  } else {
    const resumed = await new ScraperWorker(new MaktabkhoonehScraper(), backend).run({ checkpoint, resume: true });
    for (const [i, entry] of journal.entries.entries()) {
      const history = await (await fetch(`${origin}/api/v1/manage/courses/${encodeURIComponent(entry.receipt!.courseId)}/snapshots`)).json(); assert.equal(history.total, counts[i]);
    }
    console.log("Resume creates no duplicate history: " + JSON.stringify(resumed));
    assert.equal(journal.entries[0].observation?.pricing.data?.some(o => o.status === "paid"), true);
    if (resumed.exitCode) { console.log("Live image acceptance incomplete; retained journal " + checkpoint); process.exitCode = 1; }
    else console.log("Live paid-course acceptance passed (free-course live check deferred by owner); retained journal " + checkpoint);
  }
} finally {
  await app?.stop(); await sql?.close({ timeout: 0 });
  if (created) await admin.unsafe(`DROP DATABASE ${name}`);
  await admin.close({ timeout: 0 }); await rm(assets, { recursive: true, force: true });
  // Private journal retained for operator inspection; isolated DB/assets were temporary.
}
