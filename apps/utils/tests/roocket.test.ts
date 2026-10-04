import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../scrape-roocket.ts";
import { AccessDeniedError, applyPublicComments, canonicalCourseUrl, decodeCourseData, parseCoursePage, RoocketScraper } from "../scrapers/roocket.ts";
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
  test("live course-scoped JSON-LD anchors the displayed toman price and rejects unrelated/mismatched evidence", () => {
    const proof = fixture("price-evidence.html"), course = parseCoursePage(paid + proof, laravel);
    assert.equal(course.offers![0].amount, 2450000); assert.equal(course.offers![0].originalAmount, 4900000);
    assert.equal(course.offers![0].status, "paid"); assert.equal(course.offers![0].sourcePrice.unit, "toman");
    assert.match(course.source.fieldSources["offers.course.currency"], /JSON-LD/);
    assert.equal(parseCoursePage(paid + proof.replace("49000000", "49000001"), laravel).offers![0].amount, null);
    assert.equal(parseCoursePage(paid + proof.replace("learn-laravel-with-projects", "learn-python"), laravel).offers![0].amount, null);
    assert.equal(parseCoursePage(paid + proof.replace("IRR", "USD"), laravel).offers![0].amount, null);
  });
  test("reduced live anonymous API feedback retains comments and first-page coverage without mixed totals", () => {
    const url = "https://api.roocket.ir/api/v1/series/learn-laravel-with-projects/comments/?page=1";
    const course = applyPublicComments(parseCoursePage(paid, laravel), JSON.parse(fixture("comments.json")), url);
    assert.equal(course.reviews.items!.length, 2); assert.equal(course.reviews.items![0].sourceType, "comment");
    assert.equal(course.reviews.items![0].rating, null); assert.equal(course.reviews.items![0].verifiedEnrollment, null);
    assert.equal(course.reviews.collection.status, "partial"); assert.equal(course.reviews.collection.publishedCount, null);
    assert.equal(course.reviews.collection.pagesRead, 1); assert.equal(course.reviews.collection.hasMore, true);
    assert.equal(course.reviews.items![0].publishedAt, null); assert.ok(course.reviews.items![0].publishedDateText);
  });
  test("synthetic public comment cases redact identities and exclude replies, questions, duplicates and known instructor", () => {
    const body = { parent_id: 0, body_html: "تمرین‌ها خوب بودند", created_at: "دیروز" };
    const comments = [{ ...body, name: "هویت ساختگی", author: { name: "هویت ساختگی" }, body_html: "هویت ساختگی: تمرین‌ها خوب بودند synthetic@example.invalid" }, body, body,
      { ...body, parent_id: 1 }, { ...body, body_html: "پیش نیاز چیست؟" }, { ...body, author: { name: "حسام موسوی" } }];
    const course = applyPublicComments(parseCoursePage(free, python), { data: { comments, meta: { current_page: 1, last_page: 1, has_more: false, total: 6 } } }, "https://api.roocket.ir/api/v1/series/learn-python/comments/?page=1");
    assert.equal(course.reviews.items!.length, 2); assert.equal(course.reviews.collection.omittedCount, 4);
    assert.equal(course.reviews.collection.status, "partial"); assert.ok(!JSON.stringify(course).includes("هویت ساختگی"));
    assert.ok(!JSON.stringify(course).includes("synthetic@example.invalid")); assert.equal(course.reviews.items![0].redacted, true);
    assert.throws(() => applyPublicComments(course, { data: {} }, "https://api.roocket.ir/api/v1/series/learn-python/comments/?page=1"), /payload/);
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
  test("reduced live v2 evidence resolves UTF-8 RSC text and explicit educational headings", () => {
    const course = parseCoursePage(fixture("python-v2.html"), python, timestamp);
    assert.equal(course.schemaVersion, 2); assert.equal(course.source.parserVersion, "2.1.0");
    assert.match(course.prerequisites!, /پیش‌نیاز خاصی ندارید/);
    assert.match(course.intendedAudience!, /ویژه افرادیست/); assert.equal(course.learningOutcomes!.length, 8);
    assert.equal(course.syllabusCoverage.extractedLessonCount, 26); assert.equal(course.syllabusCoverage.publishedLessonCount, 26);
    assert.equal(course.syllabusCoverage.status, "unknown"); // Counts alone do not establish traversal completeness.
    assert.equal(course.reviews.items, null); assert.equal(course.reviews.collection.publishedCount, null);
    assert.ok(!JSON.stringify(course.raw).includes("comment_count"));
    assert.equal(course.offers![0].accessDescription, null); assert.equal(course.learningSupport.practiceDescription, null);
    assert.notEqual(course.source.contentHash, parseCoursePage(free, python).source.contentHash);
  });
  test("syllabus coverage records partial and unknown separately", () => {
    const partial = parseCoursePage(page({ episodes_count: 100 }), laravel);
    assert.equal(partial.syllabusCoverage.status, "partial"); assert.equal(partial.syllabusCoverage.extractedLessonCount, 73);
    const data = decodeCourseData(free); delete data.sections; delete data.episodes;
    const missing = parseCoursePage(`<script>self.__next_f.push(${JSON.stringify([1, JSON.stringify({ data })])})</script>`, python);
    assert.equal(missing.syllabusCoverage.extractedLessonCount, null); assert.equal(missing.syllabusCoverage.status, "unknown");
  });
  test("synthetic course-scoped JSON-LD reviews redact, deduplicate, preserve individual evidence and exclude questions", () => {
    const review = { "@type": "Review", reviewBody: "تمرین‌ها مفید بودند. @synthetic_handle synthetic@example.invalid", reviewRating: { ratingValue: 4, bestRating: 5 }, datePublished: "2026-10-03T12:00:00Z" };
    const ld = (reviews: unknown[]) => `<script type="application/ld+json">${JSON.stringify({ "@type": "Course", url: python, review: reviews })}</script>`;
    const course = parseCoursePage(free + ld([review, review, { "@type": "Question", reviewBody: "پیش‌نیاز چیست؟" }, { "@type": "Comment", text: "پاسخ مدرس" }]), python);
    assert.equal(course.reviews.items!.length, 1); const item = course.reviews.items![0];
    assert.equal(item.sourceType, "review"); assert.equal(item.redacted, true); assert.equal(item.verifiedEnrollment, null);
    assert.equal(item.rating!.value, 4); assert.equal(course.rating!.value, 4.49);
    assert.equal(item.publishedAt, "2026-10-03T12:00:00.000Z"); assert.match(item.sourceLocator, /review\[0\]/);
    assert.ok(!JSON.stringify(course).includes("synthetic_handle")); assert.ok(!JSON.stringify(course).includes("synthetic@example"));
    assert.equal(course.reviews.collection.omittedCount, 3); assert.equal(course.reviews.collection.status, "unknown");
    assert.equal(course.reviews.collection.publishedCount, null); assert.equal(course.reviews.collection.pagesRead, 1);
    assert.equal(course.source.contentHash, parseCoursePage(free + ld([review, review, { "@type": "Question", reviewBody: "پیش‌نیاز چیست؟" }, { "@type": "Comment", text: "پاسخ مدرس" }]), python, timestamp).source.contentHash);
    assert.notEqual(course.source.contentHash, parseCoursePage(free + ld([{ ...review, reviewBody: "تمرین‌ها کم بودند" }]), python).source.contentHash);
    const unrelated = free + `<script type="application/ld+json">${JSON.stringify({ "@type": "Course", url: laravel, review: [review] })}</script>`;
    assert.equal(parseCoursePage(unrelated, python).reviews.items, null);
    const empty = parseCoursePage(free + ld([]), python); assert.deepEqual(empty.reviews.items, []); assert.equal(empty.reviews.collection.status, "unknown");
  });
  test("synthetic review safety rejects replies and mismatched subjects while preserving rhetorical feedback", () => {
    const encode = (node: unknown) => `<script type="application/ld+json">${JSON.stringify(node)}</script>`;
    const review = { "@type": "Review", reviewBody: "چرا این‌قدر تمرین‌ها مفید بودند؟" };
    const unsafe = [{ ...review, parentItem: "reply" }, { ...review, inReplyTo: "reply" }, { ...review, itemReviewed: { url: laravel } }];
    const rejected = parseCoursePage(free + encode({ "@type": "Course", url: python, review: unsafe }), python);
    assert.equal(rejected.reviews.items, null); assert.equal(rejected.reviews.collection.collectedCount, null);
    assert.equal(rejected.reviews.collection.omittedCount, 3);
    const accepted = parseCoursePage(free + encode({ "@graph": [{ "@type": "Course", url: python, review: [review] }] }), python);
    assert.equal(accepted.reviews.items!.length, 1); assert.equal(accepted.reviews.items![0].sourceLocator, "JSON-LD script[0] $.@graph[0].review[0]");
    const array = parseCoursePage(free + encode([{ "@type": "Course", url: python, review }]), python);
    assert.equal(array.reviews.items![0].sourceLocator, "JSON-LD script[0] $[0].review");
    // Entirely synthetic author labels; never retained in outputs or public fixtures.
    const anonymous = parseCoursePage(free + encode({ "@type": "Course", url: python, review: [{ ...review,
      author: [{ name: "نام ساختگی آزمایش", alternateName: "syntheticAlias" }], reviewBody: "نام ساختگی آزمایش گفت syntheticAlias تمرین‌ها خوب بود" }] }), python);
    assert.ok(!JSON.stringify(anonymous).includes("نام ساختگی آزمایش")); assert.ok(!JSON.stringify(anonymous).includes("syntheticAlias"));
    assert.equal(anonymous.reviews.items![0].redacted, true);
  });
  test("synthetic RSC references reject truncated and invalid UTF-8 bodies, unresolved references keep description", () => {
    const data = decodeCourseData(free); (data.course as Record<string, unknown>).body_html = "$ff";
    const prefix = `${JSON.stringify({ data })}\n`;
    const encode = (stream: string) => `<script>self.__next_f.push(${JSON.stringify([1, stream])})</script>`;
    assert.equal(parseCoursePage(encode(prefix), python).description, parseCoursePage(free, python).description);
    assert.throws(() => parseCoursePage(encode(prefix + "ff:Tff,short"), python), /Truncated/);
    assert.throws(() => parseCoursePage(encode(prefix + "ff:T1,پ"), python), /UTF-8/);
    const sectionData = decodeCourseData(paid);
    for (const value of sectionData.sections as Record<string, unknown>[]) delete value.episodes;
    const unavailable = parseCoursePage(encode(JSON.stringify({ data: sectionData })), laravel);
    assert.equal(unavailable.syllabusCoverage.extractedLessonCount, null); assert.equal(unavailable.syllabusCoverage.status, "partial");
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
  test("scrapeCourse fetches bounded same-origin public API sample after unavailable robots, with no credentials", async () => {
    const requests: string[] = [];
    const scraper = new RoocketScraper({ delayMs: 0, fetch: (async (input, init) => {
      const url = String(input); requests.push(url); assert.equal(init?.credentials, undefined);
      if (url === "https://api.roocket.ir/robots.txt") return new Response("not found", { status: 404 });
      if (url.endsWith("robots.txt")) return new Response(fixture("robots.txt"));
      if (url === laravel) return new Response(paid + fixture("price-evidence.html"));
      if (url === "https://api.roocket.ir/api/v1/series/learn-laravel-with-projects/comments/?page=1") return new Response(fixture("comments.json"));
      throw new Error("Unexpected public request");
    }) as typeof fetch });
    const course = await scraper.scrapeCourse(laravel);
    assert.equal(course.offers![0].amount, 2450000); assert.equal(course.reviews.items!.length, 2);
    assert.equal(course.source.method, "public-html-and-public-api");
    assert.equal(requests.filter(url => url.includes("comments/")).length, 1);
    const blocked = new RoocketScraper({ delayMs: 0, fetch: transport(url => url === "https://api.roocket.ir/robots.txt" ? new Response("User-agent: *\nDisallow: /api/") : url.endsWith("robots.txt") ? new Response("User-agent: *") : new Response(paid)) });
    await assert.rejects(blocked.scrapeCourse(laravel), AccessDeniedError);
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
