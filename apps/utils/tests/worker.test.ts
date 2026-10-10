import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ScraperWorker, type Collector } from "../worker/worker";
import { BackendError, type BackendClient } from "../worker/backend-client";
import { JournalStore, outputRoot, type Journal } from "../worker/journal";
import { minimal } from "../../api/src/ingestion-examples";
import { factHash, requestHash } from "../../api/src/ingestion-validation";
import type { CourseIngestion, CourseSnapshot } from "../../../packages/core/src/ingestion";
import { AccessDeniedError } from "../scrapers/public-provider";
function collector(): Collector & { calls: number; discoveries: number } {
  return { providerId: "example", extractorVersion: "1", calls: 0, discoveries: 0, discoveryIsComplete: true, discoveryWarnings: [],
    canonicalCourseUrl: url => new URL(url, "https://example.org").href, courseKey: url => url,
    async discoverCourses() { this.discoveries++; return ["https://example.org/101"]; },
    async scrapeCourse(url) { const value = minimal(); value.submissionId = `fresh-${++this.calls}`; value.sourceUrl = url; value.providerCourseId = new URL(url).pathname.slice(1); return value; } };
}
function snapshot(payload: CourseIngestion): CourseSnapshot {
  return { id: "00000000-0000-4000-8000-000000000001", courseId: `${payload.providerId}:${payload.providerCourseId}`, acceptanceOrder: 1, receivedAt: "2026-10-10T00:00:00Z", requestHash: requestHash(payload), factHash: factHash(payload), payload,
    thumbnail: { status: payload.thumbnail.data ? "pending" : "missing", failureCode: null, asset: null }, presentationReady: false };
}
function backend(): BackendClient & { deliveries: CourseIngestion[]; images: number } {
  return { origin: "http://localhost:3001", deliveries: [], images: 0,
    async ingest(payload) { this.deliveries.push(payload); return { snapshot: snapshot(payload), created: true }; },
    async processThumbnail() { this.images++; const s = snapshot(this.deliveries.at(-1)!); s.thumbnail = { status: "ready", failureCode: null, asset: { id: s.id, hash: "a".repeat(64), profile: "fixture", width: 100, height: 100, byteSize: 1000, format: "webp", url: `/assets/thumbnails/${s.id}` } }; s.presentationReady = true; return s; } };
}
async function workspace(run: (path: string) => Promise<void>) {
  await mkdir(outputRoot, { recursive: true }); const directory = await mkdtemp(join(outputRoot, "worker-test-"));
  try { await run(join(directory, "run.json")); } finally { await rm(directory, { recursive: true, force: true }); }
}
test("worker crash before submission resumes the immutable saved observation", async () => workspace(async path => {
  const scraper = collector(), client = backend();
  class Crash extends JournalStore { override async save(j: Journal) { await super.save(j); throw new Error("simulated crash"); } }
  await assert.rejects(new ScraperWorker(scraper, client, p => new Crash(p)).run({ checkpoint: path }), /crash/);
  assert.equal(client.deliveries.length, 0);
  const saved = JSON.parse(await readFile(path, "utf8"));
  const result = await new ScraperWorker(scraper, client).run({ checkpoint: path, resume: true });
  assert.deepEqual(client.deliveries[0], saved.entries[0].observation);
  assert.equal(scraper.calls, 1); assert.equal(scraper.discoveries, 1); assert.equal(result.exitCode, 0);
}));
test("worker crash after acceptance replays saved payload and fresh runs use fresh IDs", async () => workspace(async path => {
  const scraper = collector(), client = backend(); const accepted = new Map<string, CourseSnapshot>();
  client.ingest = async payload => { client.deliveries.push(payload); const previous = accepted.get(payload.submissionId); const s = previous ?? snapshot(payload); accepted.set(payload.submissionId, s); return { snapshot: s, created: !previous }; };
  class Crash extends JournalStore { override async save(j: Journal) { if (j.entries[0].receipt) throw new Error("crash after acceptance"); await super.save(j); } }
  await assert.rejects(new ScraperWorker(scraper, client, p => new Crash(p)).run({ checkpoint: path }));
  const result = await new ScraperWorker(scraper, client).run({ checkpoint: path, resume: true });
  assert.equal(accepted.size, 1); assert.equal(result.replayed, 1);
  assert.deepEqual(client.deliveries[0], client.deliveries[1]);
  await new ScraperWorker(scraper, client).run({ checkpoint: path.replace("run.json", "fresh.json") });
  assert.equal(accepted.size, 2); assert.notEqual(client.deliveries[0].submissionId, client.deliveries[2].submissionId);
}));
test("worker backend exhaustion stops collection, preserves pending work and validates resume before requests", async () => workspace(async path => {
  const scraper = collector(), client = backend(); client.ingest = async () => { throw new BackendError("http_503", true); };
  const selections = { mode: "urls" as const, urls: ["https://example.org/101", "https://example.org/102"], limit: null };
  const worker = new ScraperWorker(scraper, client);
  const result = await worker.run({ checkpoint: path, selection: selections });
  assert.equal(scraper.calls, 1); assert.equal(result.deliveryPending, 1); assert.equal(result.status, "interrupted");
  const before = await readFile(path, "utf8");
  await assert.rejects(worker.run({ checkpoint: path, resume: true, selection: { ...selections, urls: [selections.urls[0]] } }), /mismatch/);
  assert.equal(await readFile(path, "utf8"), before); assert.equal(scraper.calls, 1);
}));
test("worker failed HTTP-200 image state resumes exact snapshot only and unavailable input succeeds", async () => workspace(async path => {
  const scraper = collector(), client = backend(); const collect = scraper.scrapeCourse.bind(scraper);
  scraper.scrapeCourse = async url => { const v = await collect(url); v.thumbnail = { coverage: { status: "complete", reason: null }, data: { kind: "url", url: "https://example.org/image.png", alt: "نمونه" } }; v.source.fieldSources["thumbnail.data"] = "cover"; return v; };
  const ready = client.processThumbnail.bind(client);
  client.processThumbnail = async () => { const s = snapshot(client.deliveries[0]); s.thumbnail.status = "failed"; s.thumbnail.failureCode = "download_failed"; return s; };
  const worker = new ScraperWorker(scraper, client); const failed = await worker.run({ checkpoint: path });
  assert.equal(failed.acceptedNew, 1); assert.equal(failed.images.failed, 1); assert.equal(failed.exitCode, 1);
  client.processThumbnail = async (courseId, snapshotId) => { assert.equal(courseId, "example:101"); assert.equal(snapshotId, snapshot(client.deliveries[0]).id); return ready(courseId, snapshotId); };
  const resumed = await worker.run({ checkpoint: path, resume: true });
  assert.equal(resumed.exitCode, 0); assert.equal(resumed.presentationReady, true); assert.equal(scraper.calls, 1); assert.equal(client.deliveries.length, 1);
  await worker.run({ checkpoint: path, resume: true }); assert.equal(client.images, 1);
  const saved = JSON.parse(await readFile(path, "utf8")); assert.equal(saved.entries[0].error, null); assert.equal(saved.entries[0].attempts.filter((a: {outcome: string}) => a.outcome === "failed").length, 1);
}));
test("worker partial extraction recovers, access denial stops, and cancellation after acceptance preserves receipt", async () => workspace(async path => {
  const scraper = collector(), client = backend(), collect = scraper.scrapeCourse.bind(scraper); let failed = true;
  scraper.scrapeCourse = async url => { if (url.endsWith("101") && failed) throw new Error("raw sensitive source"); return collect(url); };
  const selection = { mode: "urls" as const, urls: ["https://example.org/101", "https://example.org/102"], limit: null };
  const worker = new ScraperWorker(scraper, client);
  const partial = await worker.run({ checkpoint: path, selection }); assert.equal(partial.collectionFailed, 1); assert.equal(partial.acceptedNew, 1);
  failed = false; assert.equal((await worker.run({ checkpoint: path, resume: true })).exitCode, 0);
  assert.doesNotMatch(await readFile(path, "utf8"), /raw sensitive/);
  scraper.scrapeCourse = async () => { throw new AccessDeniedError("denied"); };
  const denied = await worker.run({ checkpoint: path.replace("run.json", "denied.json"), selection }); assert.equal(denied.status, "interrupted"); assert.equal(denied.collectionFailed, 1);
  scraper.scrapeCourse = collect;
  const controller = new AbortController(), ingest = client.ingest.bind(client);
  client.ingest = async payload => { const r = await ingest(payload); controller.abort(); return r; };
  const canceledPath = path.replace("run.json", "canceled.json");
  const canceled = await worker.run({ checkpoint: canceledPath, signal: controller.signal }); assert.equal(canceled.status, "interrupted");
  assert.ok(JSON.parse(await readFile(canceledPath, "utf8")).entries[0].receipt);
  client.ingest = ingest; assert.equal((await worker.run({ checkpoint: canceledPath, resume: true })).exitCode, 0);
}));
test("worker terminal rejection retains identity and incompatible legacy never mutates or requests", async () => workspace(async path => {
  const scraper = collector(), client = backend(); let calls = 0;
  client.ingest = async () => { calls++; throw new BackendError("http_422", false, 422); };
  const worker = new ScraperWorker(scraper, client);
  assert.equal((await worker.run({ checkpoint: path })).deliveryFailed, 1);
  assert.equal((await worker.run({ checkpoint: path, resume: true })).deliveryFailed, 1); assert.equal(calls, 1);
  const before = JSON.stringify({ schemaVersion: 2, courses: [] }); await writeFile(path, before);
  await assert.rejects(worker.run({ checkpoint: path, resume: true }));
  assert.equal(await readFile(path, "utf8"), before); assert.equal(scraper.calls, 1);
}));
