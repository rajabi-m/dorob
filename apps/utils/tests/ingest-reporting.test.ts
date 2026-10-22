import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { main, execute, type IngestDependencies } from "../ingest-maktabkhooneh";
import { outputRoot } from "../worker/journal";
import { BackendError, type BackendClient } from "../worker/backend-client";
import type { Collector } from "../worker/worker";
import { minimal } from "../../api/src/ingestion-examples";
import { factHash, requestHash } from "../../api/src/ingestion-validation";
import type { CourseIngestion, CourseSnapshot } from "../../../packages/core/src/ingestion";
import { AccessDeniedError, ProviderRequestError } from "../scrapers/public-provider";

function snapshot(payload: CourseIngestion): CourseSnapshot {
  return { id: "00000000-0000-4000-8000-000000000001", courseId: `${payload.providerId}:${payload.providerCourseId}`, acceptanceOrder: 1, receivedAt: "2026-10-10T00:00:00Z", requestHash: requestHash(payload), factHash: factHash(payload), payload,
    thumbnail: { status: payload.thumbnail.data ? "pending" : "missing", failureCode: null, asset: null }, presentationReady: false };
}
function fixture() {
  let calls = 0, discoveries = 0;
  const delivered: CourseIngestion[] = [], out: string[] = [], err: string[] = [];
  const scraper: Collector = { providerId: "example", extractorVersion: "1", discoveryIsComplete: true, discoveryWarnings: [],
    canonicalCourseUrl: url => new URL(url).href, courseKey: url => new URL(url).pathname,
    async discoverCourses() { discoveries++; return ["https://example.org/101"]; },
    async scrapeCourse(url) { calls++; const value = minimal(); value.submissionId = `id-${calls}`; value.sourceUrl = url; value.providerCourseId = new URL(url).pathname.slice(1); return value; } };
  const backend: BackendClient = { origin: "http://localhost:3013", async ingest(payload) { delivered.push(payload); return { created: true, snapshot: snapshot(payload) }; }, async processThumbnail() { throw new Error("unexpected image request"); } };
  const dependencies: IngestDependencies = { scraper: () => scraper, backend: origin => ({ ...backend, origin }), log: s => out.push(s), diagnostic: s => err.push(s), isTTY: false };
  return { scraper, backend, delivered, out, err, dependencies, calls: () => calls, discoveries: () => discoveries };
}
async function workspace(run: (path: string) => Promise<void>) {
  await mkdir(outputRoot, { recursive: true }); const directory = await mkdtemp(join(outputRoot, "report-test-"));
  try { await run(join(directory, "operator's run", "run.json")); } finally { await rm(directory, { recursive: true, force: true }); }
}
const argsFor = (path: string) => ["--checkpoint", path, "--backend-url", "http://localhost:3013"];

test("CLI thousand-selection failure is bounded, truthful and resumes immutable observations", async () => workspace(async path => {
  const f = fixture(); const failed = f.backend.ingest.bind(f.backend);
  f.backend.ingest = async () => { throw new BackendError("transport", true); };
  const urls = Array.from({ length: 1000 }, (_, i) => `https://example.org/${i + 101}`);
  assert.equal(await main([...argsFor(path), ...urls.flatMap(url => ["--url", url])], f.dependencies), 1);
  const text = f.out.join("\n"), diagnostics = f.err.join("");
  assert.equal(f.calls(), 1); assert.equal(f.out.length, 1);
  assert.match(text, /delivery pending 1/); assert.match(text, /Unattempted selections: 999/);
  assert.match(text, /Stop reason \(transport\)/); assert.match(text, /Saved checkpoint/);
  assert.ok(text.length < 2500); assert.ok(diagnostics.length < 2500);
  assert.match(diagnostics, /delivery failed.*Stopping new work/);
  assert.match(diagnostics, /Saved delivery remains pending; check backend http:\/\/localhost:3013/);
  assert.match(diagnostics, /exact connection cause is not known/);
  assert.doesNotMatch(text + diagnostics, /https:\/\/example.org\/(102|1100)/);
  const command = text.split("\n").find(line => line.startsWith("Resume: "))!.slice(8);
  const parsed = spawnSync("bash", ["-c", `set -- ${command}; printf '%s\\n' "$@"`], { encoding: "utf8" });
  assert.equal(parsed.status, 0);
  assert.deepEqual(parsed.stdout.trim().split("\n"), ["bun", "run", "ingest:maktabkhooneh", "--checkpoint", path, "--backend-url", "http://localhost:3013", "--resume"]);
  const saved = JSON.parse(await readFile(path, "utf8"));
  // Resume the original 1,000-selection journal; stop at the next delivery failure.
  f.backend.ingest = async p => { if (f.delivered.length) throw new BackendError("transport", true); return failed(p); };
  f.out.length = 0; f.err.length = 0;
  assert.equal(await main([...argsFor(path), "--resume", "--json"], f.dependencies), 1);
  const result = JSON.parse(f.out[0]); assert.equal(result.selected, 1000); assert.equal(result.acceptedNew, 1);
  assert.equal(result.deliveryPending, 1); assert.equal(result.collected, 2);
  assert.equal(result.presentationReady, false); assert.equal(f.calls(), 2); assert.equal(f.discoveries(), 0);
  assert.deepEqual(f.delivered[0], saved.entries[0].observation);
  assert.equal(result.observations[0].snapshotId, snapshot(f.delivered[0]).id);
}));

test("CLI stage diagnostics cover collection, image and terminal rejection safely", async () => workspace(async path => {
  for (const phase of ["collection", "image", "delivery"] as const) {
    const f = fixture(), collect = f.scraper.scrapeCourse.bind(f.scraper);
    if (phase === "collection") f.scraper.scrapeCourse = async () => { throw new Error("user:password <html> token=SECRET\x1b[2J"); };
    if (phase === "image") {
      f.scraper.scrapeCourse = async url => { const p = await collect(url); p.thumbnail = { coverage: { status: "complete", reason: null }, data: { kind: "url", url: "https://example.org/cover", alt: "نمونه" } }; p.source.fieldSources["thumbnail.data"] = "cover"; return p; };
      f.backend.processThumbnail = async () => { const s = snapshot(f.delivered[0]); s.thumbnail.status = "failed"; s.thumbnail.failureCode = "password=SECRET"; return s; };
    }
    if (phase === "delivery") f.backend.ingest = async () => { throw new BackendError("http_422"); };
    const runPath = path.replace("run.json", `${phase}.json`);
    assert.equal(await main([...argsFor(runPath), "--url", "https://example.org/101?token=SECRET"], f.dependencies), 1);
    const combined = f.out.join("") + f.err.join("");
    assert.match(combined, new RegExp(`${phase} failed`));
    assert.match(combined, /Continuing with other selections/);
    assert.doesNotMatch(combined, /SECRET|password|html|\x1b|\r/);
    if (phase === "collection") { assert.match(combined, /Unattempted selections: 0/); assert.equal(f.delivered.length, 0); }
    if (phase === "image") { assert.match(combined, /Accepted facts are retained/); assert.match(combined, /accepted new 1/); }
    if (phase === "delivery") { assert.match(combined, /Terminal delivery rejection needs operator review/); assert.doesNotMatch(combined, /Resume:/); }
  }
}));

test("CLI cancellation clears ticker and signals, retains receipt and resumes only image work", async () => workspace(async path => {
  const f = fixture(), collect = f.scraper.scrapeCourse.bind(f.scraper), before = process.listenerCount("SIGINT");
  let canceled = false, tick: (() => void) | undefined, now = 0;
  f.dependencies.now = () => now;
  f.dependencies.every = callback => { tick = callback; return () => { canceled = true; tick = undefined; }; };
  f.scraper.scrapeCourse = async url => { now = 10000; tick?.(); const p = await collect(url); p.thumbnail = { coverage: { status: "complete", reason: null }, data: { kind: "url", url: "https://example.org/cover", alt: "نمونه" } }; p.source.fieldSources["thumbnail.data"] = "cover"; return p; };
  const ingest = f.backend.ingest.bind(f.backend);
  f.backend.ingest = async p => { const result = await ingest(p); process.emit("SIGINT"); return result; };
  assert.equal(await main([...argsFor(path), "--url", "https://example.org/101", "--json"], f.dependencies), 1);
  assert.equal(JSON.parse(f.out[0]).status, "interrupted"); assert.match(f.err.join(""), /10s elapsed/);
  assert.equal(canceled, true); assert.equal(tick, undefined); assert.equal(process.listenerCount("SIGINT"), before);
  const saved = JSON.parse(await readFile(path, "utf8")); assert.ok(saved.entries[0].receipt);
  f.backend.processThumbnail = async () => { const s = snapshot(f.delivered[0]); s.thumbnail = { status: "ready", failureCode: null, asset: { id: s.id, hash: "a".repeat(64), profile: "fixture", width: 10, height: 10, byteSize: 100, format: "webp", url: `/assets/thumbnails/${s.id}` } }; s.presentationReady = true; return s; };
  f.out.length = 0;
  assert.equal(await main([...argsFor(path), "--resume", "--json"], f.dependencies), 0);
  assert.equal(f.calls(), 1); assert.equal(f.delivered.length, 1);
  assert.equal(JSON.parse(f.out[0]).observations[0].snapshotId, saved.entries[0].receipt.id);
}));

test("safe fatal boundary distinguishes option errors and preserves one-document stdout", async () => workspace(async path => {
  const cases = [
    { args: [], code: "missing_checkpoint" },
    { args: ["--bad-secret-option"], code: "unknown_option" },
    { args: ["--checkpoint"], code: "invalid_option_value" },
    { args: [...argsFor(path), "--limit", "0"], code: "invalid_limit" },
    { args: [...argsFor(path), "--limit", "2", "--all"], code: "incompatible_options" },
    { args: [...argsFor(path), "--backend-url", "http://user:password@localhost"], code: "invalid_destination" },
    { args: ["--checkpoint", path.replace("run.json", "unsafe\x1b.json")], code: "checkpoint_path" },
    { args: ["--checkpoint", "/tmp/no-worker.json"], code: "checkpoint_path" },
    { args: ["--help"], code: "help_json" },
  ];
  for (const item of cases) {
    const f = fixture();
    assert.equal(await execute(["--json", ...item.args], f.dependencies), 1);
    assert.equal(f.out.length, 1);
    const document = JSON.parse(f.out[0]); assert.equal(document.error.code, item.code); assert.equal(document.exitCode, 1);
    assert.doesNotMatch(f.out.join("") + f.err.join(""), /password|bad-secret-option|\x1b|\r/);
    assert.equal(f.calls(), 0); assert.equal(f.discoveries(), 0);
    assert.doesNotMatch(f.out[0], /Resume:/);
    assert.ok(f.err.join("").length > 0);
  }
  const f = fixture(); assert.equal(await execute(["--help"], f.dependencies), 0);
  assert.match(f.out[0], /--json/); assert.match(f.out[0], /default: 10/);
}));

test("pre-checkpoint discovery, checkpoint locks/mismatch and unknown exceptions do not invent recovery", async () => workspace(async path => {
  for (const mode of ["discovery", "http", "denied", "unknown"] as const) {
    const f = fixture();
    f.scraper.discoverCourses = async () => { if (mode === "http") throw new ProviderRequestError("http_503"); if (mode === "denied") throw new AccessDeniedError("password=SECRET"); throw new Error("password=SECRET <html>"); };
    if (mode === "unknown") f.dependencies.scraper = () => { throw new Error("password=SECRET <html>"); };
    assert.equal(await execute([...argsFor(path), "--json"], f.dependencies), 1);
    const doc = JSON.parse(f.out[0]); assert.equal(doc.error.code, mode === "discovery" ? "discovery_failed" : mode === "http" ? "http_503" : mode === "denied" ? "access_denied" : "unknown_failure");
    if (mode !== "unknown") assert.match(doc.error.message, /during discovery/);
    assert.doesNotMatch(f.out.join("") + f.err.join(""), /SECRET|html|Resume:|Saved checkpoint:/);
    assert.match(doc.error.message, /No saved progress was confirmed/);
  }
  const f = fixture();
  assert.equal(await main([...argsFor(path), "--url", "https://example.org/101"], f.dependencies), 0);
  const before = await readFile(path, "utf8");
  await writeFile(path + ".lock", "{}");
  f.out.length = 0;
  assert.equal(await execute([...argsFor(path), "--resume", "--json"], f.dependencies), 1);
  assert.equal(JSON.parse(f.out[0]).error.code, "checkpoint_locked");
  assert.match(f.out[0], /Do not remove a live lock/); assert.doesNotMatch(f.out[0], /Resume:/);
  await rm(path + ".lock"); f.out.length = 0;
  assert.equal(await execute([...argsFor(path), "--resume", "--backend-url", "http://localhost:4000", "--json"], f.dependencies), 1);
  assert.equal(JSON.parse(f.out[0]).error.code, "checkpoint_mismatch");
  assert.equal(await readFile(path, "utf8"), before);
}));

test("executable --json startup failures and standalone help preserve stdout and exit codes", async () => {
  const entry = resolve(import.meta.dir, "../ingest-maktabkhooneh.ts");
  for (const args of [["--json"], ["--unknown", "--json"]]) {
    const process = spawnSync("bun", ["run", entry, ...args], { encoding: "utf8" });
    assert.equal(process.status, 1); assert.equal(JSON.parse(process.stdout).exitCode, 1); assert.match(process.stderr, /Ingestion stopped/);
  }
  const help = spawnSync("bun", ["run", entry, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0); assert.match(help.stdout, /Usage:/); assert.equal(help.stderr, "");
});
