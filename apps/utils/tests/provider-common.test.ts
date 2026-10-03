import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCourse, finalizeCourse } from "../scrapers/course.ts";
import { AccessDeniedError, PublicProviderClient, parseRobots } from "../scrapers/public-provider.ts";
import { runExportCli, type ExportScraper } from "../export-cli.ts";

const origin = "https://example.org";
const url = `${origin}/courses/101`;
const timestamp = "2026-10-02T08:00:00Z";
const canonical = (input: string) => new URL(input, origin).href;
function course(id = "101") { return finalizeCourse(createCourse("example", id, "دورهٔ نمونه", `${origin}/courses/${id}`, timestamp)); }
function transport(handler: (url: string) => Response): typeof fetch {
  return (async input => handler(String(input))) as typeof fetch;
}

test("golden records keep unknown fields, reject invalid prices/counts and produce deterministic fact hashes", () => {
  const first = course();
  assert.equal(first.id, "example:101");
  assert.equal(first.offers, null);
  assert.equal(first.syllabus, null);
  assert.equal(first.derived, null);
  const second = course();
  second.source.checkedAt = "2026-10-03T08:00:00Z";
  second.source.warnings = ["A later observation"];
  second.raw = { unrelated: true };
  assert.equal(finalizeCourse(second).source.contentHash, first.source.contentHash);
  second.description = "محتوای جدید";
  assert.notEqual(finalizeCourse(second).source.contentHash, first.source.contentHash);
  assert.throws(() => finalizeCourse({ ...first, studentCount: 1.5 }), /count/);
  assert.throws(() => finalizeCourse({ ...first, sourceUrl: "http://example.org/course" }), /HTTPS/);
  const incomplete = { ...first } as Partial<typeof first>;
  delete incomplete.prerequisites;
  assert.throws(() => finalizeCourse(incomplete as typeof first), /Incomplete golden/);
  const offer = {
    id: "full", type: "full" as const, label: null, amount: 10, originalAmount: 5, unit: "toman" as const,
    status: "paid" as const, billingPeriod: null, certificateIncluded: null,
    sourcePrice: { amount: 10, originalAmount: 5, unit: "toman" as const, label: null },
  };
  assert.throws(() => finalizeCourse({ ...first, offers: [offer] }), /discount/);
  assert.throws(() => finalizeCourse({ ...first, offers: [{ ...offer, amount: 0, originalAmount: null }] }), /Zero price/);
});

test("fact hashes ignore signed cover expiry but retain meaningful cover parameters", () => {
  const first = course();
  first.image = { url: "https://example.org/image?w=200&Expires=100&Signature=a", alt: first.title };
  const initial = finalizeCourse(first).source.contentHash;
  first.image.url = "https://example.org/image?Signature=b&Expires=200&w=200";
  assert.equal(finalizeCourse(first).source.contentHash, initial);
  first.image.url = "https://example.org/image?w=400";
  assert.notEqual(finalizeCourse(first).source.contentHash, initial);
});

test("shared robots handling works across hosts and uses longest applicable rules", async () => {
  const requests: string[] = [];
  const client = new PublicProviderClient(origin, { delayMs: 0, fetch: transport(input => {
    requests.push(input);
    return new Response(input.endsWith("robots.txt") ? "User-agent: *\nDisallow: /courses/\nAllow: /courses/101\nSitemap: https://example.org/sitemap.xml" : "allowed");
  }) });
  assert.equal((await client.request(url)).body, "allowed");
  assert.deepEqual(client.sitemapUrls, [`${origin}/sitemap.xml`]);
  await assert.rejects(client.request(`${origin}/courses/102`), AccessDeniedError);
  assert.equal(requests.length, 2);
  const robots = parseRobots("User-agent: *\nDisallow: /\nUser-agent: DorobBot\nAllow: /courses/\nCrawl-delay: 2");
  assert.equal(robots.allows(url), true);
  assert.equal(robots.delayMs, 2000);
});

test("shared transport rejects redirects outside host or into robots-denied paths", async () => {
  const client = new PublicProviderClient(origin, { delayMs: 0, fetch: transport(input => input.endsWith("robots.txt")
    ? new Response("User-agent: *\nDisallow: /private/")
    : new Response(null, { status: 302, headers: { Location: "/private/course" } })) });
  await assert.rejects(client.request(url), AccessDeniedError);
  const offHost = new PublicProviderClient(origin, { delayMs: 0, fetch: transport(input => input.endsWith("robots.txt")
    ? new Response("User-agent: *")
    : new Response(null, { status: 302, headers: { Location: "https://127.0.0.1/" } })) });
  await assert.rejects(offHost.request(url), /Only HTTPS/);
  assert.throws(() => offHost.canonicalUrl("https://user:pass@example.org/"), /Only HTTPS/);
});

test("shared transport stops access-denied providers and respects Retry-After", async () => {
  const waits: number[] = [];
  let attempts = 0;
  const client = new PublicProviderClient(origin, { delayMs: 0, sleep: async ms => { waits.push(ms); }, fetch: transport(input => {
    if (input.endsWith("robots.txt")) return new Response("User-agent: *");
    return ++attempts === 1 ? new Response("wait", { status: 429, headers: { "Retry-After": "2" } }) : new Response("ok");
  }) });
  assert.equal((await client.request(url)).body, "ok");
  assert.equal(attempts, 2);
  assert.ok(waits[0] >= 1900);
  const denied = new PublicProviderClient(origin, { delayMs: 0, fetch: transport(input => input.endsWith("robots.txt") ? new Response("User-agent: *") : new Response("denied", { status: 403 })) });
  await assert.rejects(denied.request(url), AccessDeniedError);
  await assert.rejects(denied.request(url), /paused/);
});

test("shared transport enforces response limits and cancellation", async () => {
  const oversized = new PublicProviderClient(origin, { delayMs: 0, maxResponseBytes: 5, fetch: transport(() => new Response("0123456789")) });
  await assert.rejects(oversized.initialize(), /size limit/);
  const canceled = new PublicProviderClient(origin, { signal: AbortSignal.abort(), fetch: transport(() => { throw new Error("must not fetch"); }) });
  await assert.rejects(canceled.initialize(), /abort/i);
});

test("shared export checkpoints partial runs, retries failed URLs and preserves checkpoint on invalid resume", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dorob-provider-test-"));
  const output = join(directory, "courses.json");
  const second = `${origin}/courses/102`;
  let failSecond = true, firstRequests = 0;
  const factory = (): ExportScraper => ({
    discoveryIsComplete: true,
    discoverCourses: async () => [url, second],
    async *scrapeCourses(urls) {
      for (const sourceUrl of urls) {
        if (sourceUrl === url) firstRequests++;
        yield sourceUrl === second && failSecond ? { sourceUrl, course: null, error: "HTTP 404" }
          : { sourceUrl, course: course(sourceUrl.endsWith("102") ? "102" : "101"), error: null };
      }
    },
  });
  try {
    const args = ["--all", "--output", output];
    assert.equal(await runExportCli("example", factory, canonical, args), 1);
    assert.equal(JSON.parse(await readFile(output, "utf8")).status, "partial");
    failSecond = false;
    assert.equal(await runExportCli("example", factory, canonical, [...args, "--resume"]), 0);
    const saved = await readFile(output, "utf8");
    const data = JSON.parse(saved);
    assert.equal(data.courses.length, 2);
    assert.equal(data.fullCatalog, true);
    assert.equal(data.status, "complete");
    assert.equal(firstRequests, 1);
    await assert.rejects(runExportCli("example", factory, canonical, ["--url", url, "--output", output, "--resume"]), /same provider/);
    assert.equal(await readFile(output, "utf8"), saved);
    await assert.rejects(runExportCli("example", factory, canonical, ["--limit", "0"]), /positive/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("shared export resumes aliases by requested URL and rejects a silently incomplete stream", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dorob-alias-test-"));
  const output = join(directory, "courses.json");
  const alias = `${origin}/courses/old-slug`;
  let requests = 0;
  const factory = (): ExportScraper => ({
    discoverCourses: async () => [alias],
    async *scrapeCourses(urls) { for (const sourceUrl of urls) { requests++; yield { sourceUrl, course: course(), error: null }; } },
  });
  try {
    const args = ["--url", alias, "--output", output];
    assert.equal(await runExportCli("example", factory, canonical, args), 0);
    assert.equal(await runExportCli("example", factory, canonical, [...args, "--resume"]), 0);
    assert.equal(requests, 1);
    const missing = (): ExportScraper => ({ discoverCourses: async () => [url], async *scrapeCourses() {} });
    assert.equal(await runExportCli("example", missing, canonical, ["--output", output]), 1);
    assert.equal(JSON.parse(await readFile(output, "utf8")).errors[0].message, "No result returned for selected course");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
