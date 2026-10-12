import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execute, main, type ProviderId, type IngestDependencies } from "../ingest-provider";
import { outputRoot } from "../worker/journal";
import { BackendError } from "../worker/backend-client";
import { minimal } from "../../api/src/ingestion-examples";
import { factHash, requestHash } from "../../api/src/ingestion-validation";
import type { CourseIngestion, CourseSnapshot } from "../../../packages/core/src/ingestion";
import type { FeedbackSettings } from "../scrapers/native-v3";
import { ScraperWorker } from "../worker/worker";
import { JournalStore, type Journal } from "../worker/journal";

function fixture(providerId: ProviderId) {
  let collections = 0, discoveries = 0, fail = false;
  const out: string[] = [], err: string[] = [], settings: FeedbackSettings[] = [], delivered: CourseIngestion[] = [];
  const snapshot = (payload: CourseIngestion): CourseSnapshot => ({ id: "00000000-0000-4000-8000-000000000001", courseId: `${providerId}:101`, acceptanceOrder: 1, receivedAt: "2026-10-10T00:00:00Z", requestHash: requestHash(payload), factHash: factHash(payload), payload, thumbnail: { status: "missing", failureCode: null, asset: null }, presentationReady: false });
  const provider = { providerId, create(options: FeedbackSettings) {
    settings.push(options);
    return { providerId, extractorVersion: "1", discoveryIsComplete: true, discoveryWarnings: [], canonicalCourseUrl: (url: string) => new URL(url).href, courseKey: (url: string) => url,
      async discoverCourses(limit: number) { discoveries++; assert.ok(limit === 10 || limit === 2 || limit === Infinity); return ["https://example.org/101"]; },
      async scrapeCourse(url: string) { collections++; const value = minimal(); value.providerId = providerId; value.sourceUrl = url; return value; } };
  } };
  const dependencies: IngestDependencies = { log: s => out.push(s), diagnostic: s => err.push(s), backend: origin => ({ origin,
    async ingest(payload) { delivered.push(payload); if (fail) throw new BackendError("transport", true); return { snapshot: snapshot(payload), created: delivered.length === 1 }; },
    async processThumbnail(): Promise<never> { throw new Error("unexpected image request"); } }) };
  return { provider, dependencies, out, err, settings, delivered, fail: () => { fail = true; }, recover: () => { fail = false; }, collections: () => collections, discoveries: () => discoveries };
}
async function workspace(run: (path: string) => Promise<void>) {
  await mkdir(outputRoot, { recursive: true }); const directory = await mkdtemp(join(outputRoot, "provider-cli-"));
  try { await run(join(directory, "run.json")); } finally { await rm(directory, { recursive: true, force: true }); }
}
for (const id of ["toplearn", "sabzlearn", "roocket"] as const) {
  test(`${id} shared CLI identity/help/defaults/selections and provider recovery`, () => workspace(async path => {
    const f = fixture(id);
    assert.equal(await main(f.provider, ["--help"], f.dependencies), 0);
    assert.match(f.out.pop()!, new RegExp(`ingest:${id}`)); assert.equal(f.settings.length, 0);
    for (const [suffix, flags] of [["default", []], ["bounded", ["--limit", "2"]], ["all", ["--all"]]] as const) {
      assert.equal(await main(f.provider, ["--checkpoint", path.replace("run.json", `${suffix}.json`), ...flags, "--json"], f.dependencies), 0);
      assert.equal(JSON.parse(f.out.pop()!).selected, 1);
    }
    f.fail();
    assert.equal(await main(f.provider, ["--checkpoint", path, "--url", "https://example.org/101", "--feedback-pages", "3", "--feedback-items", "12"], f.dependencies), 1);
    assert.match(f.out.pop()!, new RegExp(`Resume: bun run ingest:${id}`)); assert.match(f.err.join(""), new RegExp(`Starting ${id}`));
    const before = JSON.parse(await readFile(path, "utf8")); f.recover();
    assert.equal(await main(f.provider, ["--checkpoint", path, "--resume", "--json"], f.dependencies), 0);
    assert.equal(f.collections(), 4); assert.equal(f.discoveries(), 3);
    assert.deepEqual(f.delivered.at(-1), before.entries[0].observation);
    assert.equal(f.settings.at(-1)!.feedbackPages, 3); assert.equal(f.settings.at(-1)!.feedbackItems, 12);
  }));
}
test("conflicting settings, provider/destination and v2 reject before factories or mutation", () => workspace(async path => {
  const f = fixture("roocket");
  await main(f.provider, ["--checkpoint", path, "--json"], f.dependencies);
  const before = await readFile(path, "utf8"), factories = f.settings.length;
  for (const flags of [["--feedback-pages", "2"], ["--feedback-items", "3"], ["--backend-url", "http://localhost:4444"]]) {
    await assert.rejects(main(f.provider, ["--checkpoint", path, "--resume", ...flags], f.dependencies), /mismatch/);
    assert.equal(f.settings.length, factories); assert.equal(await readFile(path, "utf8"), before);
  }
  await assert.rejects(main(fixture("toplearn").provider, ["--checkpoint", path, "--resume"], f.dependencies), /mismatch/);
  await writeFile(path, JSON.stringify({ schemaVersion: 2, courses: [] }), { mode: 0o600 });
  const legacy = await readFile(path, "utf8");
  await assert.rejects(main(f.provider, ["--checkpoint", path, "--resume"], f.dependencies));
  assert.equal(await readFile(path, "utf8"), legacy); assert.equal(f.settings.length, factories);
}));
test("provider fatal JSON is one safe document and invalid limits never collect", () => workspace(async path => {
  const f = fixture("sabzlearn");
  for (const flags of [[], ["--checkpoint", path, "--feedback-items", "2001"], ["--checkpoint", path, "--feedback-pages", "0"], ["--help"]]) {
    f.out.length = 0;
    assert.equal(await execute(f.provider, [...flags, "--json"], f.dependencies), 1);
    assert.equal(f.out.length, 1); assert.match(JSON.parse(f.out[0]).error.message, /sabzlearn/);
    assert.equal(f.settings.length, 0);
  }
}));

test("new-provider settings survive lost-response replay and image-only resume", () => workspace(async path => {
  const f = fixture("roocket"), settings = { feedbackPages: 4, feedbackItems: 18 };
  const scraper = f.provider.create(settings);
  const original = scraper.scrapeCourse.bind(scraper);
  scraper.scrapeCourse = async url => {
    const p = await original(url);
    p.thumbnail = { data: { kind: "url", url: "https://example.org/image", alt: "نمونه" }, coverage: { status: "complete", reason: null } };
    p.source.fieldSources["thumbnail.data"] = "cover";
    return p;
  };
  let receipts = 0, images = 0;
  const received: CourseIngestion[] = [];
  let accepted: CourseSnapshot | undefined;
  const backend = { origin: "http://localhost:3001", async ingest(payload: CourseIngestion) {
    received.push(payload);
    accepted ??= { id: "00000000-0000-4000-8000-000000000001", courseId: "roocket:101", acceptanceOrder: 1, receivedAt: "2026-10-10T00:00:00Z", requestHash: requestHash(payload), factHash: factHash(payload), payload, thumbnail: { status: "pending", failureCode: null, asset: null }, presentationReady: false };
    if (++receipts === 1) throw new BackendError("transport", true);
    return { snapshot: structuredClone(accepted), created: false };
  }, async processThumbnail() {
    images++; const value = structuredClone(accepted!);
    value.thumbnail = { status: "failed", failureCode: "download_failed", asset: null };
    return value;
  } };
  assert.equal((await new ScraperWorker(scraper, backend).run({ checkpoint: path, collectionSettings: settings })).deliveryPending, 1);
  class Crash extends JournalStore { override async save(j: Journal) { if (j.entries[0].receipt) throw new Error("simulated receipt-save crash"); await super.save(j); } }
  await assert.rejects(new ScraperWorker(scraper, backend, p => new Crash(p)).run({ checkpoint: path, collectionSettings: settings, resume: true }));
  const result = await new ScraperWorker(scraper, backend).run({ checkpoint: path, collectionSettings: settings, resume: true });
  assert.equal(result.replayed, 1); assert.equal(result.imageProcessingFailed, 1);
  assert.deepEqual(received[0], received[1]); assert.deepEqual(received[1], received[2]);
  const before = await readFile(path, "utf8");
  await assert.rejects(new ScraperWorker(scraper, backend).run({ checkpoint: path, resume: true, collectionSettings: { ...settings, feedbackPages: 5 } }), /mismatch/);
  assert.equal(await readFile(path, "utf8"), before);
  await new ScraperWorker(scraper, backend).run({ checkpoint: path, resume: true, collectionSettings: settings });
  assert.equal(received.length, 3); assert.equal(f.collections(), 1); assert.equal(images, 2);
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")).collectionSettings, settings);
}));
