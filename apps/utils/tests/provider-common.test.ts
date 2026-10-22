import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { anonymizeReviewText, createCourse, finalizeCourse, reviewContentId } from "../scrapers/course.ts";
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
    status: "paid" as const, billingPeriod: null, certificateIncluded: null, accessDescription: null, supportDescription: null,
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

test("v2 review evidence is anonymous, validated and invalidates source hashes", () => {
  const cleaned = anonymizeReviewText("نام نمونه: تمرین خوب بود user@example.org @sample ۰۹۱۲۳۴۵۶۷۸۹ https://example.org/profile", ["نام نمونه"]);
  assert.equal(cleaned.redacted, true);
  assert.doesNotMatch(cleaned.text, /نام نمونه|example.org|@sample|۰۹۱۲/);
  const first = course();
  const review = {
    id: reviewContentId(cleaned.text, null, { value: 4, scale: 5 }), sourceType: "review" as const, text: cleaned.text,
    rating: { value: 4, scale: 5 }, publishedAt: null, publishedDateText: null, verifiedEnrollment: null,
    sourceUrl: url, sourceLocator: "course.reviews[0]", redacted: true,
  };
  first.reviews = { items: [review], collection: { status: "partial", publishedCount: 10, collectedCount: 1,
    selection: "newest", pagesRead: 1, hasMore: true, omittedCount: 0, stopReason: "page-only sample" } };
  const initial = finalizeCourse(first).source.contentHash;
  first.reviews.collection.pagesRead = 2;
  first.reviews.collection.stopReason = "request bound";
  assert.equal(finalizeCourse(first).source.contentHash, initial);
  first.reviews.collection.selection = "highest-rated";
  assert.notEqual(finalizeCourse(first).source.contentHash, initial);
  first.reviews.collection.selection = "newest";
  first.reviews.items![0].text = "تمرین کافی نبود";
  assert.notEqual(finalizeCourse(first).source.contentHash, initial);
  first.reviews.items![0].text = "user@example.org";
  assert.throws(() => finalizeCourse(first), /redacted/);
  first.reviews.items![0].text = cleaned.text;
  first.reviews.collection.status = "complete";
  assert.throws(() => finalizeCourse(first), /Complete reviews/);
  first.reviews.collection.status = "partial";
  first.reviews.collection.collectedCount = 2;
  assert.throws(() => finalizeCourse(first), /count mismatch/);
  first.reviews.collection.collectedCount = 1;
  Object.assign(first.reviews.items![0], { author: "forbidden" });
  assert.throws(() => finalizeCourse(first), /identities/);
});

test("v2 syllabus coverage distinguishes unknown from empty and rejects false completeness", () => {
  const first = course();
  first.syllabus = [{ id: null, order: 1, title: "شروع", description: null, lessons: [
    { id: null, order: 1, title: "نصب", description: "آماده‌سازی", type: "video", providerType: null, contentMinutes: 5 },
  ] }];
  first.syllabusCoverage = { status: "partial", publishedLessonCount: 2, extractedLessonCount: 1, reasons: ["truncated list"] };
  const hash = finalizeCourse(first).source.contentHash;
  first.syllabus![0].lessons![0].description = "شرح جدید";
  assert.notEqual(finalizeCourse(first).source.contentHash, hash);
  first.syllabusCoverage.status = "complete";
  assert.throws(() => finalizeCourse(first), /Complete syllabus/);
  first.syllabusCoverage.status = "partial";
  first.syllabusCoverage.extractedLessonCount = 0;
  assert.throws(() => finalizeCourse(first), /count mismatch/);
  const empty = course();
  empty.reviews.items = [];
  empty.reviews.collection = { status: "complete", publishedCount: 0, collectedCount: 0, selection: "explicit zero",
    pagesRead: 1, hasMore: false, omittedCount: 0, stopReason: null };
  assert.equal(finalizeCourse(empty).reviews.items?.length, 0);
  assert.equal(course().reviews.items, null);
  empty.syllabus = [];
  empty.syllabusCoverage = { status: "complete", publishedLessonCount: 0, extractedLessonCount: 0, reasons: ["explicit empty list"] };
  assert.equal(finalizeCourse(empty).syllabusCoverage.extractedLessonCount, 0);
  empty.syllabus = [{ id: null, order: 1, title: "شروع", description: null, lessons: null }];
  empty.syllabusCoverage = { status: "unknown", publishedLessonCount: null, extractedLessonCount: null, reasons: ["lesson lists missing"] };
  assert.equal(finalizeCourse(empty).syllabusCoverage.extractedLessonCount, null);
});

test("v1 checkpoints cannot resume or overwrite saved exports", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dorob-schema-test-"));
  const output = join(directory, "courses.json");
  const factory = (): ExportScraper => ({ discoverCourses: async () => [url], async *scrapeCourses() { yield { sourceUrl: url, course: course(), error: null }; } });
  try {
    const args = ["--url", url, "--output", output];
    await runExportCli("example", factory, canonical, args);
    const { writeFile } = await import("node:fs/promises");
    const previous = JSON.parse(await readFile(output, "utf8"));
    previous.schemaVersion = 1;
    previous.courses[0].schemaVersion = 1;
    const old = JSON.stringify(previous);
    await writeFile(output, old);
    await assert.rejects(runExportCli("example", factory, canonical, [...args, "--resume"]), /schema version 2/);
    assert.equal(await readFile(output, "utf8"), old);
    assert.throws(() => finalizeCourse({ ...course(), schemaVersion: 1 } as unknown as ReturnType<typeof course>), /schema/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("documented golden example validates against the implemented v2 contract", async () => {
  const document = await readFile(new URL("../../../docs/course-data-format.md", import.meta.url), "utf8");
  const example = document.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(example);
  const parsed = JSON.parse(example[1]);
  assert.equal(finalizeCourse(parsed).schemaVersion, 2);
  assert.match(parsed.source.contentHash, /^[a-f0-9]{64}$/);
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

test("missing robots permits public requests, but denied/unreachable robots and resource 404s still fail", async () => {
  let requests = 0;
  const missing = new PublicProviderClient(origin, { delayMs: 0, retries: 0, fetch: transport(input => {
    requests++;
    return input.endsWith("robots.txt") ? new Response("missing", { status: 404 }) : new Response("public data");
  }) });
  assert.equal((await missing.request(url)).body, "public data");
  assert.equal(requests, 2);
  assert.deepEqual(missing.sitemapUrls, []);
  for (const status of [401, 403, 500]) {
    const requested: string[] = [];
    const blocked = new PublicProviderClient(origin, { delayMs: 0, retries: 0, fetch: transport(input => {
      requested.push(input); return new Response("unavailable", { status });
    }) });
    await assert.rejects(blocked.request(url));
    assert.deepEqual(requested, [`${origin}/robots.txt`]);
  }
  const absent = new PublicProviderClient(origin, { delayMs: 0, retries: 0, fetch: transport(input => new Response("", { status: input.endsWith("robots.txt") ? 200 : 404 })) });
  await assert.rejects(absent.request(url), /404/);
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

test("shared policy uses agent specificity, equal-length allow, crawl spacing and finite retries", async () => {
  const robots = parseRobots("User-agent: *\nDisallow: /\nUser-agent: Dorob\nDisallow: /course\nUser-agent: DorobBot\nDisallow: /course*\nAllow: /course$\nCrawl-delay: 2");
  assert.equal(robots.allows(origin + "/course"), true);
  assert.equal(robots.allows(origin + "/course/1"), false);
  assert.equal(robots.allows(origin + "/other"), true);
  let clock = 0, calls = 0;
  const times: number[] = [];
  const client = new PublicProviderClient(origin, { delayMs: 1500, clock: () => clock, sleep: async ms => { clock += ms; }, fetch: transport(input => {
    times.push(clock);
    if (input.endsWith("robots.txt")) return new Response("User-agent: *\nCrawl-delay: 2");
    calls++; return new Response("outage", { status: 503, headers: { "Retry-After": "3" } });
  }) });
  await assert.rejects(client.request(url), /503/);
  assert.equal(calls, 4);
  assert.deepEqual(times, [0, 2000, 5000, 8000, 12000]);
});

test("shared transport bounds redirects and stalled response reads", async () => {
  let calls = 0;
  const loop = new PublicProviderClient(origin, { delayMs: 0, fetch: transport(input => {
    if (input.endsWith("robots.txt")) return new Response("");
    calls++; return new Response(null, { status: 302, headers: { location: "/loop" } });
  }) });
  await assert.rejects(loop.request(url), /excessive/);
  assert.equal(calls, 6);
  const stalled = new PublicProviderClient(origin, { delayMs: 0, timeoutMs: 20, retries: 0, fetch: transport(() => new Response(new ReadableStream({ start() {} }))) });
  await assert.rejects(stalled.initialize(), /timeout/i);
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
