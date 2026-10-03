import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../scrape-roocket.ts";
import { AccessDeniedError, canonicalCourseUrl, decodeCourseData, parseCoursePage, RoocketScraper } from "../scrapers/roocket.ts";
const python = "https://roocket.ir/series/learn-python/", laravel = "https://roocket.ir/series/learn-laravel-with-projects/";
const fixture = (name: string) => readFileSync(new URL(`./fixtures/roocket-${name}`, import.meta.url), "utf8");
const free = fixture("python.html"), paid = fixture("laravel.html");
const timestamp = "2026-10-02T12:00:00Z";
const transport = (handler: (url: string) => Response) => (async input => handler(String(input))) as typeof fetch;
/** Explicitly synthetic variations of retained live facts. */
function page(changes: Record<string, unknown>, base = paid) {
  const data = decodeCourseData(base); Object.assign(data.course as object, changes);
  return `<script>self.__next_f.push(${JSON.stringify([1, `aa:${JSON.stringify(["$", "$L40", null, { data }])}\n`])})</script>`;
}
describe("Roocket source parsing", () => {
  test("extracts real free-course facts and preserves complete golden shape", () => {
    const course = parseCoursePage(free, python, timestamp);
    assert.equal(course.id, "roocket:70"); assert.equal(course.providerCourseId, "70");
    assert.equal(course.title, "آموزش رایگان برنامه نویسی پایتون");
    assert.equal(course.offers![0].amount, 0); assert.equal(course.offers![0].status, "free");
    assert.equal(course.duration.contentMinutes, 406 + 11 / 60);
    assert.equal(course.duration.effortHours, null); assert.equal(course.learningOutcomes, null);
    assert.equal(course.instructors![0].name, "حسام موسوی");
    assert.equal(course.studentCount, 10475); assert.equal(course.lessonCount, 26);
    assert.equal(course.rating!.count, 175); assert.equal(course.syllabus![0].lessons!.length, 26);
    assert.equal(course.syllabus![0].lessons![0].title, "چرا پایتون");
    assert.equal(course.source.method, "public-html-and-embedded-data"); assert.equal(course.derived, null);
    assert.equal(course.source.contentHash, parseCoursePage(free, python).source.contentHash);
    assert.equal(course.offers![0].certificateIncluded, null);
    assert.equal(course.providerCategories, null); assert.equal(course.providerLevel, null);
    assert.ok(!JSON.stringify(course).includes("user_has_rated"));
  });
  test("real discounted source price is retained without inventing a unit", () => {
    const course = parseCoursePage(paid, laravel, timestamp), offer = course.offers![0];
    assert.equal(offer.sourcePrice.amount, 2450000); assert.equal(offer.sourcePrice.originalAmount, 4900000);
    assert.equal(offer.sourcePrice.unit, "unknown"); assert.equal(offer.amount, null); assert.equal(offer.status, "unknown");
    assert.equal(course.duration.contentMinutes, 1200.5); assert.equal(course.ongoing, true);
    assert.equal(course.syllabus!.length, 4); assert.equal(course.syllabus![0].title, "معرفی و مقدمه");
    assert.match(course.source.warnings.join(" "), /currency/);
  });
  test("missing prices/syllabus remain unknown; disabled zero and login state do not imply free", () => {
    const unknown = parseCoursePage(page({ price: null, final_price: null, is_free: false }), laravel);
    assert.equal(unknown.offers![0].sourcePrice.amount, null); assert.equal(unknown.offers![0].amount, null);
    const zero = parseCoursePage(page({ price: 0, final_price: 0, is_free: false, can_add_to_cart: false, certificate: { has_certification: false } }), laravel);
    assert.equal(zero.offers![0].status, "unknown"); assert.equal(zero.offers![0].certificateIncluded, null);
    const data = decodeCourseData(free); delete data.sections; delete data.episodes;
    const noSyllabus = `<script>self.__next_f.push(${JSON.stringify([1, `aa:${JSON.stringify({ data })}`])})</script>`;
    assert.equal(parseCoursePage(noSyllabus, python).syllabus, null);
  });
  test("excludes confirmed inactive offers and leaves coming-soon purchase eligibility unknown", () => {
    const inactive = parseCoursePage(page({ is_inactive: true }), laravel);
    assert.deepEqual(inactive.offers, []); assert.equal(inactive.availability, "unavailable");
    assert.equal(inactive.raw.final_price, 2450000);
    const soon = parseCoursePage(page({ is_coming_soon: true }), laravel);
    assert.equal(soon.offers, null); assert.equal(soon.availability, "unavailable");
  });
  test("rejects source drift, mismatched identity, invalid duration/prices/counts", () => {
    assert.throws(() => parseCoursePage("<h1>Login</h1>", python), /layout drift/);
    assert.throws(() => parseCoursePage(free, laravel), /identity/);
    assert.throws(() => parseCoursePage(page({ final_price: -1 }), laravel), /price/);
    assert.throws(() => parseCoursePage(page({ final_price: 9999999 }), laravel), /discount/);
    assert.throws(() => parseCoursePage(page({ time: "10:99:00" }), laravel), /time/);
    assert.throws(() => parseCoursePage(page({ learning_count: -5 }), laravel), /count/);
    assert.throws(() => parseCoursePage(page({ price: 20, final_price: 20 }, free), python), /free price/);
  });
  test("canonical URLs enforce host, credentials and course-only paths", () => {
    assert.equal(canonicalCourseUrl(python + "?utm_source=x#test"), python);
    assert.equal(canonicalCourseUrl("/series/learn-python"), python);
    for (const invalid of ["http://roocket.ir/series/learn-python/", "https://evil.test/series/learn-python/", "https://user@roocket.ir/series/learn-python/", python + "episode/1/", "https://roocket.ir/cart/"]) assert.throws(() => canonicalCourseUrl(invalid));
  });
});
describe("Roocket collection", () => {
  test("discovers real public catalog and skips episode/editorial sitemaps", async () => {
    const requests: string[] = [];
    const scraper = new RoocketScraper({ delayMs: 0, fetch: transport(input => {
      requests.push(input);
      if (input.endsWith("robots.txt")) return new Response(fixture("robots.txt"));
      if (/\/sitemap\/?$/.test(input)) return new Response('<sitemapindex><sitemap><loc>https://roocket.ir/sitemap-courses/</loc></sitemap><sitemap><loc>https://roocket.ir/sitemap-article/</loc></sitemap></sitemapindex>');
      return new Response(fixture("sitemap.xml"));
    }) });
    const urls = await scraper.discoverCourses(); assert.equal(urls.length, 106); assert.ok(urls.includes(python));
    assert.equal(scraper.discoveryIsComplete, true);
    assert.ok(!requests.some(url => /sitemap-article|sitemap-video/.test(url)));
  });
  test("streams ordinary failures, deduplicates and stops on denial/robots", async () => {
    const scraper = new RoocketScraper({ delayMs: 0, fetch: transport(input => input.endsWith("robots.txt") ? new Response("User-agent: *") : input === python ? new Response(free) : new Response("missing", { status: 404 })) });
    const results = []; for await (const result of scraper.scrapeCourses([python, python, laravel])) results.push(result);
    assert.equal(results.length, 2); assert.equal(results[0].course!.id, "roocket:70"); assert.equal(results[1].error, "HTTP 404");
    const denied = new RoocketScraper({ delayMs: 0, fetch: transport(input => input.endsWith("robots.txt") ? new Response("User-agent: *") : new Response("denied", { status: 403 })) });
    await assert.rejects(denied.scrapeCourse(python), AccessDeniedError); await assert.rejects(denied.scrapeCourse(python), /paused/);
    const blocked = new RoocketScraper({ delayMs: 0, fetch: transport(() => new Response("User-agent: *\nDisallow: /series/")) });
    await assert.rejects(blocked.scrapeCourse(python), AccessDeniedError);
  });
});
test("Roocket CLI checkpoints partial results and resumes only failures", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dorob-roocket-test-")), output = join(directory, "courses.json");
  let firstRequests = 0, fail = true;
  const options = { delayMs: 0, fetch: transport(input => {
    if (input.endsWith("robots.txt")) return new Response("User-agent: *");
    if (input === python) { firstRequests++; return new Response(free); }
    return fail ? new Response("missing", { status: 404 }) : new Response(paid);
  }) };
  try {
    const args = ["--url", python, "--url", laravel, "--output", output];
    assert.equal(await main(args, options), 1); const partial = JSON.parse(await readFile(output, "utf8"));
    assert.equal(partial.status, "partial"); assert.equal(partial.courses.length, 1);
    fail = false; assert.equal(await main([...args, "--resume"], options), 0);
    const complete = JSON.parse(await readFile(output, "utf8")); assert.equal(complete.courses.length, 2); assert.equal(complete.errors.length, 0); assert.equal(firstRequests, 1); assert.equal(complete.fullCatalog, false);
    await assert.rejects(main(["--limit", "0"], options), /positive/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
