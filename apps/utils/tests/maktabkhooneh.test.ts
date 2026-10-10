import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../scrape-maktabkhooneh.ts";
import { AccessDeniedError, canonicalCourseUrl, decodeNuxtPayload, LegacyMaktabkhoonehScraper, parseCoursePage, parseRobots, parseSitemap } from "../scrapers/maktabkhooneh.ts";
import { createCourse } from "../scrapers/course.ts";
import { aggregateCourses } from "../aggregate-courses";

const fixture = readFileSync(new URL("./fixtures/maktabkhooneh-course.html", import.meta.url), "utf8");
const url = "https://maktabkhooneh.org/course/python-mk346/";
const timestamp = "2026-10-01T08:40:07Z";
function page(overrides: Record<string, unknown>, pageOverrides: Record<string, unknown> = {}) {
  const payload = decodeNuxtPayload(fixture);
  const data = payload.data as Record<string, Record<string, unknown>>;
  Object.assign(data[Object.keys(data)[0]].courseDetails as object, overrides);
  Object.assign(data[Object.keys(data)[0]], pageOverrides);
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
    assert.equal(course.schemaVersion, 2);
    assert.equal(course.derived, null);
    assert.equal(course.source.parser, "maktabkhooneh");
    assert.equal(course.source.parserVersion, "3.1.1");
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
  test("numeric and published H:MM durations remain distinct from lesson effort", () => {
    const course = parseCoursePage(page({ content_hours: "1:35", required_hours: "۲:۳۰", video_hours: 2 }), url);
    assert.equal(course.duration.contentMinutes, 95);
    assert.equal(course.duration.effortHours, 2.5);
    assert.equal(course.syllabus![0].lessons![0].contentMinutes, null);
    assert.match(course.source.fieldSources["duration.contentMinutes"], /H:MM/);
    for (const value of ["1:65", "95 دقیقه", "2", -1, null]) {
      assert.equal(parseCoursePage(page({ content_hours: value, required_hours: value }), url).duration.contentMinutes, null);
      assert.equal(parseCoursePage(page({ content_hours: value, required_hours: value }), url).duration.effortHours, null);
    }
    assert.equal(parseCoursePage(page({ content_hours: 1.5 }), url).duration.contentMinutes, 90);
    assert.notEqual(course.source.contentHash, parseCoursePage(page({ content_hours: "1:36", required_hours: "۲:۳۰" }), url).source.contentHash);
  });
  test("explicit category hierarchy and Persian dubbing are retained without language guessing", () => {
    const course = parseCoursePage(page({ categories: { title: "انیمیشن", parent: { title: "هنر", parent: null } },
      course_features: [{ title: "دوبله فارسی", description: "دارای دوبله اختصاصی" }] }), url);
    assert.deepEqual(course.providerCategories, ["هنر", "انیمیشن"]);
    assert.equal(course.language, "fa");
    assert.match(course.source.fieldSources.providerCategories, /parent chain/);
    assert.equal(parseCoursePage(page({ categories: null, course_features: [{ title: "دوبله اختصاصی", description: "آموزش" }] }), url).language, null);
    assert.equal(parseCoursePage(page({ categories: null }), url).providerCategories, null);
  });
  test("v2 coverage distinguishes unavailable reviews from an explicit empty list", () => {
    const course = parseCoursePage(fixture, url);
    assert.equal(course.reviews.items, null);
    assert.equal(course.reviews.collection.collectedCount, null);
    assert.equal(course.reviews.collection.publishedCount, null);
    assert.equal(course.reviews.collection.status, "unknown");
    assert.equal(course.reviews.collection.hasMore, null);
    assert.equal(course.syllabusCoverage.status, "partial");
    assert.equal(course.syllabusCoverage.extractedLessonCount, 4);
    assert.equal(course.intendedAudience, null);
    assert.equal(course.technologies, null);
    assert.deepEqual(course.learningSupport, { practiceDescription: null, assessmentDescription: null, supportDescription: null });
    const empty = parseCoursePage(page({}, { courseReviewsCount: { confirmed_review_count: 0 } }), url);
    assert.deepEqual(empty.reviews.items, []);
    assert.equal(empty.reviews.collection.status, "complete");
    const absent = parseCoursePage(page({}, { courseReviewsCount: null, chapterData: null }), url);
    assert.equal(absent.reviews.items, null);
    assert.equal(absent.reviews.collection.status, "unknown");
    assert.equal(absent.syllabusCoverage.extractedLessonCount, null);
  });
  test("course-associated JSON-LD reviews are anonymous, deduplicated and distinct from replies", () => {
    // Explicitly synthetic examples, with fictitious identity/contact markers only.
    const review = { "@type": "Review", author: { name: "نویسنده ساختگی", alternateName: "fixture_handle" },
      reviewBody: "نویسنده ساختگی هستم؛ تمرین‌ها مفید بود. fixture@example.test @fixture_handle 09120000000",
      datePublished: "۱۴۰۵/۰۷/۰۱", reviewRating: { ratingValue: "4", bestRating: "5" } };
    const jsonld = (body: string) => `<script type="application/ld+json">${JSON.stringify({ "@type": "Course", name: "آموزش برنامه نویسی جامع پایتون", review: [review, review,
      { ...review, "@type": "Question", reviewBody: "پرسش ساختگی" }, { ...review, parentItem: "reply", reviewBody: "پاسخ ساختگی" },
      { ...review, reviewBody: body, author: null, reviewRating: { ratingValue: "4" } }] })}</script>`;
    const course = parseCoursePage(fixture + jsonld("توضیح‌ها روشن بود"), url);
    assert.equal(course.reviews.items!.length, 2);
    const first = course.reviews.items![0];
    assert.equal(first.redacted, true);
    assert.deepEqual(first.rating, { value: 4, scale: 5 });
    assert.equal(first.publishedAt, null);
    assert.equal(first.publishedDateText, "۱۴۰۵/۰۷/۰۱");
    assert.equal(first.verifiedEnrollment, null);
    assert.equal(course.reviews.items![1].rating, null);
    assert.match(first.sourceLocator, /jsonld.review\[0\]/);
    assert.equal(course.source.fieldSources["reviews.items.0"], first.sourceLocator);
    assert.doesNotMatch(JSON.stringify(course), /نویسنده ساختگی|fixture@example|fixture_handle|09120000000|پرسش ساختگی|پاسخ ساختگی/);
    assert.notEqual(course.source.contentHash, parseCoursePage(fixture + jsonld("توضیح‌ها مبهم بود"), url).source.contentHash);
    const unrelated = `<script type="application/ld+json">${JSON.stringify({ ...review, itemReviewed: { "@type": "Organization", name: "provider" } })}</script>`;
    assert.equal(parseCoursePage(fixture + unrelated, url).reviews.items, null);
  });
  test("chapter and lesson descriptions preserve educational evidence without asserting completeness", () => {
    const chapterData = { chapters: [{ id: 1, title: "فصل", description: "<p>تمرین‌های فصل</p>", units: [{ id: 2, title: "تمرین", type: "exercise", description: "<p>ساخت برنامه</p>" }] }] };
    const course = parseCoursePage(page({ unit_count: 1 }, { chapterData }), url);
    assert.equal(course.syllabus![0].description, "تمرین‌های فصل");
    assert.equal(course.syllabus![0].lessons![0].description, "ساخت برنامه");
    assert.equal(course.syllabusCoverage.status, "unknown");
    assert.equal(course.syllabusCoverage.extractedLessonCount, 1);
    assert.notEqual(course.source.contentHash, parseCoursePage(page({ unit_count: 1 }, { chapterData: { chapters: [{ ...chapterData.chapters[0], description: "فصل جدید" }] } }), url).source.contentHash);
  });
  test("retained anonymous live Nuxt reviews and learning evidence map to v2", () => {
    const liveFixture = readFileSync(new URL("./fixtures/maktabkhooneh-reviews.html", import.meta.url), "utf8");
    const course = parseCoursePage(liveFixture, url);
    assert.equal(course.reviews.items!.length, 6);
    assert.equal(course.reviews.collection.publishedCount, 6175);
    assert.equal(course.reviews.collection.hasMore, true);
    assert.equal(course.reviews.collection.status, "partial");
    assert.equal(course.reviews.items![0].sourceType, "review");
    assert.equal(course.reviews.items![0].verifiedEnrollment, null);
    assert.equal(course.reviews.items![0].sourceLocator, "courseReviews[0].review_description / rate / created_date");
    assert.equal(course.learningOutcomes!.length, 4);
    assert.ok(course.learningSupport.practiceDescription);
    assert.ok(course.learningSupport.assessmentDescription);
    assert.ok(course.learningSupport.supportDescription);
    assert.equal(course.offers![0].supportDescription, null);
    assert.doesNotMatch(liveFixture, /"user"|"review_reply"|"avatar"|"username"/);
    const conflicted = parseCoursePage(page({}, { courseReviews: [{ review_description: "تمرین مفید", rate: 4 }], courseReviewsCount: { confirmed_review_count: 0 } }), url);
    assert.equal(conflicted.reviews.collection.publishedCount, null);
    assert.equal(conflicted.raw.reviewCountConflict, 0);
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
    assert.equal(canonicalCourseUrl(url.slice(0, -1)), url);
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
    const scraper = new LegacyMaktabkhoonehScraper({ delayMs: 0, fetch: transport(input => {
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
    const scraper = new LegacyMaktabkhoonehScraper({ delayMs: 0, sleep: async ms => { waits.push(ms); }, fetch: transport(input => {
      if (input.endsWith("robots.txt")) return new Response("User-agent: *\nDisallow: /course/blocked-mk1/");
      attempts++;
      return attempts === 1 ? new Response("wait", { status: 429, headers: { "Retry-After": "2" } }) : new Response(fixture);
    }) });
    assert.equal((await scraper.scrapeCourse(url)).providerCourseId, "10465");
    assert.equal(attempts, 2); assert.ok(waits[0] >= 1900);
    await assert.rejects(scraper.scrapeCourse("https://maktabkhooneh.org/course/blocked-mk1/"), AccessDeniedError);
    const denied = new LegacyMaktabkhoonehScraper({ delayMs: 0, fetch: transport(input => input.endsWith("robots.txt") ? new Response("User-agent: *") : new Response("denied", { status: 403 })) });
    await assert.rejects(denied.scrapeCourse(url), AccessDeniedError);
    await assert.rejects(denied.scrapeCourse(url), /paused/);
  });
  test("blocks cross-host redirects, excessive response bodies and cancellation", async () => {
    const redirect = new LegacyMaktabkhoonehScraper({ delayMs: 0, fetch: transport(() => new Response(null, { status: 302, headers: { Location: "https://127.0.0.1/" } })) });
    await assert.rejects(redirect.initialize(), /Only HTTPS/);
    const oversized = new LegacyMaktabkhoonehScraper({ delayMs: 0, maxResponseBytes: 5, fetch: transport(() => new Response("0123456789")) });
    await assert.rejects(oversized.initialize(), /size limit/);
    const signal = AbortSignal.abort();
    const canceled = new LegacyMaktabkhoonehScraper({ signal, fetch: transport(() => { throw new Error("must not fetch"); }) });
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
    assert.equal((await aggregateCourses([output])).courses.length, 2);
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
