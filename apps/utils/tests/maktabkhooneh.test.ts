import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../scrape-maktabkhooneh.ts";
import { AccessDeniedError, canonicalCourseUrl, decodeNuxtPayload, MaktabkhoonehScraper, parseCoursePage, parseRobots, parseSitemap } from "../scrapers/maktabkhooneh.ts";
import { createCourse } from "../scrapers/course.ts";

const fixture = readFileSync(new URL("./fixtures/maktabkhooneh-course.html", import.meta.url), "utf8");
const url = "https://maktabkhooneh.org/course/python-mk346/";
const timestamp = "2026-10-01T08:40:07Z";
function page(overrides: Record<string, unknown>) {
  const payload = decodeNuxtPayload(fixture);
  const data = payload.data as Record<string, Record<string, unknown>>;
  Object.assign(data[Object.keys(data)[0]].courseDetails as object, overrides);
  const values: unknown[] = [];
  function encode(value: unknown): number {
    const id = values.length; values.push(null);
    values[id] = Array.isArray(value) ? value.map(encode) : value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) : value;
    return id;
  }
  encode(payload);
  return `<script id="__NUXT_DATA__">${JSON.stringify(values)}</script>`;
}
function transport(handler: (url: string) => Response): typeof fetch {
  return (async input => handler(String(input))) as typeof fetch;
}

describe("Maktabkhooneh parsing", () => {
  test("extracts retained public facts, separate offers and ordered syllabus", () => {
    const course = parseCoursePage(fixture, url, timestamp);
    assert.equal(course.title, "آموزش برنامه نویسی جامع پایتون");
    assert.equal(course.id, "maktabkhooneh:10465");
    assert.deepEqual(Object.keys(course).sort(), Object.keys(createCourse("sample", "1", "title", "https://example.org/course")).sort());
    assert.equal(course.schemaVersion, 1);
    assert.equal(course.derived, null);
    assert.equal(course.source.parser, "maktabkhooneh");
    assert.equal(course.source.parserVersion, "2.0.0");
    assert.equal(course.source.method, "public-html-and-embedded-data");
    assert.equal(course.providerLevel, "مقدماتی تا پیشرفته");
    assert.equal(course.providerStatus, "NORMAL_PUBLISH");
    assert.equal(course.image!.alt, course.title);
    assert.equal(course.raw.slugId, 346);
    assert.equal(course.learningOutcomes, null);
    assert.equal(course.availability, "unknown");
    assert.deepEqual(course.offers!.map(o => [o.type, o.amount]), [["full", 1299500], ["content", 799500]]);
    assert.equal(course.duration.contentMinutes, 1020);
    assert.equal(course.duration.effortHours, 74);
    assert.equal(course.syllabus![0].title, "مقدمه");
    assert.equal(course.syllabus![0].lessons![0].title, "مروری بر محتوای دوره");
    assert.equal(course.syllabus![0].id, "23760");
    assert.equal(course.syllabus![0].lessons![0].id, "132518");
    assert.equal(course.syllabus![0].lessons![0].providerType, "lecture");
    assert.equal(course.syllabus![0].lessons![0].contentMinutes, null);
    assert.equal(course.syllabus![0].lessons![0].type, "unknown");
    assert.deepEqual(course.offers![0].sourcePrice, { amount: 1299500, originalAmount: 2599000, unit: "toman", label: null });
    assert.equal(course.rating!.count, 21861);
    assert.match(course.description!, /برنامه‌نویسی/);
    assert.equal(course.source.checkedAt, timestamp);
    assert.equal(course.source.contentHash, parseCoursePage(fixture, url).source.contentHash);
    assert.ok(!JSON.stringify(course).includes("review_description"));
  });
  test("disabled zeros do not create a free offer; missing prices remain unknown", () => {
    const course = parseCoursePage(page({ full_course_sale: false, price: { FULL: 0, CONTENT: 149000 }, discounted_price: { FULL: 0, CONTENT: 134100 } }), url);
    assert.deepEqual(course.offers!.map(o => [o.type, o.amount, o.status]), [["content", 134100, "paid"]]);
    assert.equal(parseCoursePage(page({ price: {}, discounted_price: {} }), url).offers![0].status, "unknown");
    assert.equal(parseCoursePage(page({ type: "FREE", full_course_sale: false, course_content_sale: false }), url).offers![0].status, "free");
  });
  test("unknown lists, ambiguous zeros and signed-cover refreshes obey the golden contract", () => {
    const missing = parseCoursePage(page({ teachers: null, rating_count: null }), url);
    assert.equal(missing.instructors, null);
    assert.equal(missing.rating!.count, null);
    const zero = parseCoursePage(page({ price: { FULL: 0 }, discounted_price: { FULL: 0 }, course_content_sale: false }), url);
    assert.equal(zero.offers![0].amount, null);
    assert.equal(zero.offers![0].status, "unknown");
    assert.equal(zero.offers![0].sourcePrice.amount, 0);
    const first = parseCoursePage(fixture, url);
    const refreshed = parseCoursePage(page({ image_thumbnail_url: first.image!.url.replace("expire=4893471932", "expire=5000000000").replace("md5=lPt94AmoXGuKJ-a84UJi6Q==", "md5=updated") }), url);
    assert.equal(first.source.contentHash, refreshed.source.contentHash);
    assert.throws(() => parseCoursePage(page({ type: "FREE" }), url), /Conflicting/);
  });
  test("invalid prices, identity mismatch and layout drift fail loudly", () => {
    assert.throws(() => parseCoursePage(page({ discounted_price: { FULL: -10 } }), url), /Invalid.*price/);
    assert.throws(() => parseCoursePage(page({ discounted_price: { FULL: 9999999 } }), url), /discount/);
    assert.throws(() => parseCoursePage(fixture, url.replace("346", "347")), /matching/);
    assert.throws(() => parseCoursePage("<html></html>", url), /Missing/);
  });
  test("decodes reactive wrappers, negative sentinel and rejects unknown wrappers", () => {
    assert.deepEqual(Object.keys(decodeNuxtPayload('<script id="__NUXT_DATA__">[["ShallowReactive",1],{"x":-1}]</script>')), ["x"]);
    assert.throws(() => decodeNuxtPayload('<script id="__NUXT_DATA__">[["SomethingNew",1],1]</script>'), /Unsupported/);
  });
  test("restricts course URLs and handles XML entities", () => {
    assert.equal(canonicalCourseUrl(url + "?utm_source=x#test"), url);
    assert.throws(() => canonicalCourseUrl("https://localhost/course/python-mk346/"));
    assert.throws(() => canonicalCourseUrl("https://maktabkhooneh.org/search/"));
    assert.deepEqual(parseSitemap(`<urlset><url><loc>${url}?a=1&amp;b=2</loc></url></urlset>`).urls, [url + "?a=1&b=2"]);
  });
});

describe("collection behavior", () => {
  test("robots longest match, agent groups and crawl delay", () => {
    const robots = parseRobots("User-agent: *\nDisallow: /search*\nDisallow: */forum/\nAllow: /course/ok-mk1/\nUser-agent: DorobBot\nDisallow: /course/\nAllow: /course/ok-mk1/\nCrawl-delay: 2");
    assert.equal(robots.allows(url), false);
    assert.equal(robots.allows("/course/ok-mk1/"), true);
    assert.equal(robots.delayMs, 2000);
    assert.equal(parseRobots("User-agent: *\nDisallow: /search*").allows("/search/?q=x"), false);
  });
  test("discovers course-only maps, deduplicates and streams partial failures", async () => {
    const requests: string[] = [];
    const scraper = new MaktabkhoonehScraper({ delayMs: 0, fetch: transport(input => {
      requests.push(input);
      if (input.endsWith("robots.txt")) return new Response("User-agent: *\nSitemap: https://maktabkhooneh.org/sitemap.xml");
      if (input.endsWith("sitemap.xml")) return new Response('<sitemapindex><sitemap><loc>https://maktabkhooneh.org/sitemap/course.xml</loc></sitemap><sitemap><loc>https://maktabkhooneh.org/sitemap/teacher.xml</loc></sitemap></sitemapindex>');
      if (input.endsWith("course.xml")) return new Response(`<urlset><url><loc>${url}</loc></url><url><loc>${url}?x=1</loc></url></urlset>`);
      return input === url ? new Response(fixture) : new Response("not found", { status: 404 });
    }) });
    assert.deepEqual(await scraper.discoverCourses(), [url]);
    const results = [];
    for await (const result of scraper.scrapeCourses([url, url, url.replace("346", "347")])) results.push(result);
    assert.equal(results.length, 2);
    assert.equal(results[0].course!.id, "maktabkhooneh:10465");
    assert.equal(results[1].error, "HTTP 404");
    assert.ok(!requests.some(input => input.endsWith("teacher.xml")));
    assert.equal(requests.filter(input => input.endsWith("robots.txt")).length, 1);
  });
  test("temporary failures retry, robots denial and access denial stop", async () => {
    let attempts = 0;
    const waits: number[] = [];
    const scraper = new MaktabkhoonehScraper({ delayMs: 0, sleep: async ms => { waits.push(ms); }, fetch: transport(input => {
      if (input.endsWith("robots.txt")) return new Response("User-agent: *\nDisallow: /course/blocked-mk1/");
      attempts++;
      return attempts === 1 ? new Response("wait", { status: 429, headers: { "Retry-After": "2" } }) : new Response(fixture);
    }) });
    assert.equal((await scraper.scrapeCourse(url)).providerCourseId, "10465");
    assert.equal(attempts, 2); assert.ok(waits[0] >= 1900);
    await assert.rejects(scraper.scrapeCourse("https://maktabkhooneh.org/course/blocked-mk1/"), AccessDeniedError);
    const denied = new MaktabkhoonehScraper({ delayMs: 0, fetch: transport(input => input.endsWith("robots.txt") ? new Response("User-agent: *") : new Response("denied", { status: 403 })) });
    await assert.rejects(denied.scrapeCourse(url), AccessDeniedError);
    await assert.rejects(denied.scrapeCourse(url), /paused/);
  });
  test("blocks cross-host redirects, excessive response bodies and cancellation", async () => {
    const redirect = new MaktabkhoonehScraper({ delayMs: 0, fetch: transport(() => new Response(null, { status: 302, headers: { Location: "https://127.0.0.1/" } })) });
    await assert.rejects(redirect.initialize(), /Only HTTPS/);
    const oversized = new MaktabkhoonehScraper({ delayMs: 0, maxResponseBytes: 5, fetch: transport(() => new Response("0123456789")) });
    await assert.rejects(oversized.initialize(), /size limit/);
    const signal = AbortSignal.abort();
    const canceled = new MaktabkhoonehScraper({ signal, fetch: transport(() => { throw new Error("must not fetch"); }) });
    await assert.rejects(canceled.initialize(), /abort/i);
  });
});

test("CLI checkpoints partial exports, resumes only failed courses, and validates arguments", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dorob-scraper-test-"));
  const output = join(directory, "courses.json");
  const second = url.replace("346", "347");
  let firstRequests = 0, failSecond = true;
  const options = { delayMs: 0, fetch: transport(input => {
    if (input.endsWith("robots.txt")) return new Response("User-agent: *");
    if (input === url) { firstRequests++; return new Response(fixture); }
    return failSecond ? new Response("missing", { status: 404 }) : new Response(page({ slug_id: 347, id: 10466 }));
  }) };
  try {
    const args = ["--url", url, "--url", second, "--output", output];
    assert.equal(await main(args, options), 1);
    const partial = JSON.parse(await readFile(output, "utf8"));
    assert.equal(partial.status, "partial"); assert.equal(partial.courses.length, 1); assert.equal(partial.errors.length, 1);
    failSecond = false;
    assert.equal(await main([...args, "--resume"], options), 0);
    const completed = JSON.parse(await readFile(output, "utf8"));
    assert.equal(completed.status, "complete"); assert.equal(completed.courses.length, 2); assert.equal(completed.errors.length, 0);
    assert.equal(completed.fullCatalog, false); assert.equal(firstRequests, 1);
    await assert.rejects(main(["--limit", "0"], options), /positive/);
    await assert.rejects(main(["--all", "--limit", "2"], options), /Choose/);
    await assert.rejects(main(["--url", url, "--output", output, "--resume"], options), /same provider/);
    const legacy = JSON.parse(await readFile(output, "utf8"));
    legacy.courses[0].id = "maktabkhooneh-mk346";
    delete legacy.courses[0].schemaVersion;
    await writeFile(output, JSON.stringify(legacy));
    const oldCheckpoint = await readFile(output, "utf8");
    await assert.rejects(main([...args, "--resume"], options), /Incomplete golden/);
    assert.equal(await readFile(output, "utf8"), oldCheckpoint);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
