import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { main } from "../ingest-roocket";
import { AccessDeniedError, canonicalCourseUrl, decodeCourseData, parseCoursePage, parsePublicComments, RoocketScraper } from "../scrapers/roocket";
const python = "https://roocket.ir/series/learn-python/", laravel = "https://roocket.ir/series/learn-laravel-with-projects/";
const fixture = (name: string) => readFileSync(new URL(`./fixtures/roocket-${name}`, import.meta.url), "utf8");
const free = fixture("python.html"), paid = fixture("laravel.html"), proof = fixture("price-evidence.html");
const encode = (data: unknown) => `<script>self.__next_f.push(${JSON.stringify([1, JSON.stringify({ data })])})</script>`;
function page(changes: Record<string, unknown>, base = paid) { const data = decodeCourseData(base); Object.assign(data.course as object, changes); return encode(data); }
const transport = (handler: (url: string) => Response) => (async input => handler(String(input))) as typeof fetch;
const api = (comments: unknown[], current_page = 1, last_page = 1) => JSON.stringify({ data: { comments, meta: { current_page, last_page } } });
const comment = { parent_id: 0, body_html: "تمرین‌ها مفید بودند", created_at: "دیروز" };
describe("Roocket native parsing", () => {
  test("retains free identity, rich metadata, ordered lessons and distinct rating votes", () => {
    const c = parseCoursePage(free, python); assert.equal(c.schemaVersion, 3); assert.equal(c.providerCourseId, "70"); assert.equal(c.pricing.data![0].status, "free"); assert.equal(c.pricing.data![0].amount, 0);
    assert.equal(c.education!.data!.duration.contentMinutes, 406 + 11 / 60); assert.equal(c.instructors!.data![0].name, "حسام موسوی"); assert.equal(c.feedback!.data!.rating!.count, 175); assert.equal(c.feedback!.data!.studentCount, 10475); assert.equal(c.curriculum!.data!.syllabus![0].lessons!.length, 26); assert.equal(c.curriculum!.data!.syllabusCoverage.status, "unknown"); assert.ok(!JSON.stringify(c).includes("user_has_rated"));
  });
  test("course-scoped IRR proof normalizes toman without borrowing unrelated offer evidence", () => {
    assert.equal(parseCoursePage(paid, laravel).pricing.data![0].amount, null);
    const c = parseCoursePage(paid + proof, laravel); assert.equal(c.pricing.data![0].amount, 2450000); assert.equal(c.pricing.data![0].originalAmount, 4900000); assert.equal(c.providerData!.data!["roocket.course"].structuredOriginalAmount, 49000000);
    for (const wrong of [proof.replace("49000000", "49000001"), proof.replace("IRR", "USD"), proof.replace("learn-laravel-with-projects", "learn-python")]) assert.equal(parseCoursePage(paid + wrong, laravel).pricing.data![0].amount, null);
  });
  test("zero/disabled/coming-soon never imply free and contradictory core prices fail", () => {
    assert.equal(parseCoursePage(page({ price: 0, final_price: 0, is_free: false }), laravel).pricing.data![0].status, "unknown"); assert.deepEqual(parseCoursePage(page({ is_inactive: true }), laravel).pricing.data, []); assert.equal(parseCoursePage(page({ is_coming_soon: true }), laravel).pricing.data, null);
    assert.throws(() => parseCoursePage(page({ final_price: -1 }), laravel), /price/); assert.throws(() => parseCoursePage(page({ final_price: 9999999 }), laravel), /discount/); assert.throws(() => parseCoursePage(page({ price: 20 }, free), python), /free price/);
  });
  test("retains all explicit instructors and source educational headings", () => {
    const c = parseCoursePage(page({ instructors: [{ name: "مدرس اول" }, { name: "مدرس دوم" }] }, free), python); assert.equal(c.instructors!.data!.length, 2);
    const rich = parseCoursePage(fixture("python-v2.html"), python); assert.match(rich.education!.data!.prerequisites!, /پیش‌نیاز/); assert.equal(rich.education!.data!.learningOutcomes!.length, 8);
  });
  test("malformed optional curriculum preserves independent facts", () => { const data = decodeCourseData(free); data.episodes = [{ id: 1 }]; const c = parseCoursePage(encode(data), python); assert.equal(c.curriculum!.coverage.status, "failed"); assert.ok(c.feedback!.data!.rating); assert.ok(c.instructors!.data); });
  test("fresh IDs, strict canonical identity and RSC drift checks", () => { assert.notEqual(parseCoursePage(free, python).submissionId, parseCoursePage(free, python).submissionId); assert.throws(() => parseCoursePage(free, laravel), /identity/); assert.throws(() => parseCoursePage("login", python), /layout drift/); for (const bad of ["http://roocket.ir/series/x/", "https://evil.test/series/x/", "https://user@roocket.ir/series/x/"]) assert.throws(() => canonicalCourseUrl(bad)); });
  test("course-scoped structured reviews preserve individual ratings and redact identity", () => {
    const ld = `<script type="application/ld+json">${JSON.stringify({ "@type": "Course", url: python, review: [{ "@type": "Review", reviewBody: "نام ساختگی تمرین خوب synthetic@example.invalid", author: { name: "نام ساختگی" }, reviewRating: { ratingValue: 4, bestRating: 5 } }] })}</script>`;
    const c = parseCoursePage(free + ld, python); assert.equal(c.feedback!.data!.reviews.items![0].rating!.value, 4); assert.ok(!JSON.stringify(c).includes("نام ساختگی")); assert.ok(!JSON.stringify(c).includes("synthetic@example"));
  });
});
describe("Roocket bounded public feedback", () => {
  function scraper(handler: (url: string) => Response, options = {}) { return new RoocketScraper({ delayMs: 0, retries: 0, fetch: transport(url => url.endsWith("robots.txt") ? new Response("User-agent: *") : url === python ? new Response(free) : handler(url)), ...options }); }
  test("multiple pages deduplicate with preserved source order and explicit exhaustion", async () => { const c = await scraper(url => new Response(url.endsWith("page=1") ? api([comment], 1, 2) : api([comment, { ...comment, body_html: "درس‌ها عالی بودند" }], 2, 2))).scrapeCourse(python); const r = c.feedback!.data!.reviews; assert.equal(r.items!.length, 2); assert.equal(r.collection.pagesRead, 2); assert.equal(r.collection.status, "complete"); assert.match(r.items![1].sourceUrl, /page=2/); assert.equal(c.feedback!.data!.rating!.count, 175); });
  test("page and item bounds remain partial", async () => { for (const options of [{ feedbackPages: 1 }, { feedbackItems: 1 }]) { const c = await scraper(() => new Response(api([comment, { ...comment, body_html: "متن دیگر" }], 1, 2)), options).scrapeCourse(python); assert.equal(c.feedback!.data!.reviews.collection.status, "partial"); assert.match(c.feedback!.data!.reviews.collection.stopReason!, /limit/); } });
  test("failure on later page preserves earlier comments and independent facts", async () => { const c = await scraper(url => url.endsWith("page=1") ? new Response(api([comment], 1, 2)) : new Response("missing", { status: 404 })).scrapeCourse(python); assert.equal(c.feedback!.data!.reviews.items!.length, 1); assert.equal(c.feedback!.coverage.status, "partial"); assert.equal(c.feedback!.data!.rating!.count, 175); assert.ok(c.instructors!.data); assert.ok(c.curriculum!.data!.syllabus); });
  test("confirmed empty is distinct from unavailable", async () => { const empty = await scraper(() => new Response(api([]))).scrapeCourse(python), failed = await scraper(() => new Response("missing", { status: 404 })).scrapeCourse(python); assert.deepEqual(empty.feedback!.data!.reviews.items, []); assert.equal(empty.feedback!.data!.reviews.collection.status, "complete"); assert.equal(failed.feedback!.data!.reviews.items, null); });
  test("denial on additional origin and cancellation propagate", async () => { await assert.rejects(scraper(() => new Response("denied", { status: 403 })).scrapeCourse(python), AccessDeniedError); const signal = AbortSignal.abort(); await assert.rejects(scraper(() => new Response(api([])), { signal }).scrapeCourse(python)); });
  test("questions/replies/staff excluded; contacts and names redacted; mixed total stays unknown", () => { const parsed = parsePublicComments(JSON.parse(api([{ ...comment, author: { name: "نام ساختگی" }, body_html: "نام ساختگی synthetic@example.invalid خوب بود" }, { ...comment, parent_id: 1 }, { ...comment, is_admin: true }, { ...comment, body_html: "چرا؟" }])), "https://api.roocket.ir/api/v1/series/learn-python/comments/?page=1", python); assert.equal(parsed.excluded, 3); assert.equal(parsed.items.length, 1); assert.equal(parsed.items[0].redacted, true); assert.ok(!JSON.stringify(parsed).includes("نام ساختگی")); });
  test("shared CLI help identifies new command; no checkpoint fails", async () => { const logs: string[] = []; assert.equal(await main(["--help"], { log: text => logs.push(text) }), 0); assert.match(logs[0], /ingest:roocket/); await assert.rejects(main([]), /checkpoint/i); });
});

test("Roocket supplementary origin robots and redirect protections", async () => {
  for (const variant of ["robots", "cross-origin", "blocked-redirect"]) {
    const scraper = new RoocketScraper({ delayMs: 0, retries: 0, fetch: transport(url => {
      if (url === "https://api.roocket.ir/robots.txt") return new Response(variant === "robots" ? "User-agent: *\nDisallow: /api/" : "User-agent: *\nDisallow: /private/");
      if (url.endsWith("robots.txt")) return new Response("User-agent: *");
      if (url === python) return new Response(free);
      return new Response(null, { status: 302, headers: { location: variant === "cross-origin" ? "https://evil.test/comments" : "https://api.roocket.ir/private/comments" } });
    }) });
    if (variant === "cross-origin") { const c = await scraper.scrapeCourse(python); assert.equal(c.feedback!.data!.reviews.collection.status, "unknown"); assert.ok(c.feedback!.data!.rating); }
    else await assert.rejects(scraper.scrapeCourse(python), AccessDeniedError);
  }
});

test("Roocket structured review limits use explicit settings rather than hidden defaults", () => {
 const review = { "@type": "Review", reviewBody: "درس خوبی بود" };
 const reviews = Array.from({ length: 510 }, (_, i) => ({ ...review, reviewBody: `${review.reviewBody} ${i}` }));
 const html = free + `<script type="application/ld+json">${JSON.stringify({ "@type": "Course", url: python, review: reviews })}</script>`;
 const large = parseCoursePage(html, python, undefined, undefined, { feedbackPages: 10, feedbackItems: 600 });
 assert.equal(large.feedback!.data!.reviews.items!.length, 510);
 const small = parseCoursePage(html, python, undefined, undefined, { feedbackPages: 10, feedbackItems: 2 });
 assert.equal(small.feedback!.data!.reviews.items!.length, 2); assert.equal(small.feedback!.data!.reviews.collection.stopReason, "item-limit");
});
test("Roocket executable emits one safe fatal JSON document with exit1 and help exits0", () => {
 const fatal = Bun.spawnSync(["bun", "apps/utils/ingest-roocket.ts", "--json"]); assert.equal(fatal.exitCode, 1); assert.equal(JSON.parse(fatal.stdout.toString()).error.code, "missing_checkpoint");
 const help = Bun.spawnSync(["bun", "apps/utils/ingest-roocket.ts", "--help"]); assert.equal(help.exitCode, 0); assert.match(help.stdout.toString(), /ingest:roocket/);
});
test("Roocket discovery is bounded and excludes editorial maps", async () => {
 const requests: string[] = []; const scraper = new RoocketScraper({ delayMs: 0, fetch: transport(url => { requests.push(url); if (url.endsWith("robots.txt")) return new Response(fixture("robots.txt")); if (/\/sitemap\/?$/.test(url)) return new Response('<sitemapindex><sitemap><loc>https://roocket.ir/sitemap-courses/</loc></sitemap><sitemap><loc>https://roocket.ir/sitemap-article/</loc></sitemap></sitemapindex>'); return new Response(fixture("sitemap.xml")); }) });
 assert.equal((await scraper.discoverCourses(2)).length, 2); assert.equal(scraper.discoveryIsComplete, false); assert.ok(!requests.some(url => url.includes("sitemap-article")));
});

test("Roocket malformed optional count values preserve valid core and independent sections", () => {
 const c = parseCoursePage(page({ learning_count: -1, episodes_count: -1, rates: { avg: 4, max: 5, count: -1 } }, free), python);
 assert.equal(c.pricing.data![0].status, "free"); assert.ok(c.instructors!.data); assert.ok(c.curriculum!.data!.syllabus); assert.equal(c.curriculum!.data!.lessonCount, null); assert.equal(c.feedback!.data!.rating!.count, null); assert.equal(c.feedback!.data!.studentCount, null); assert.equal(c.feedback!.coverage.status, "partial"); assert.match(c.source.warnings.join(" "), /Malformed optional count/);
});

test("Roocket large curriculum and maximum feedback setting preserve core facts within evidence bounds", async () => {
 const data = decodeCourseData(free), course = data.course as Record<string, unknown>;
 course.episodes_count = 1200;
 data.episodes = Array.from({ length: 1200 }, (_, i) => ({ id: i + 1, episode_number: i + 1, title: `درس ${i + 1}`, time: "01:00", is_published: true, has_attachments: false }));
 const source = encode(data);
 const pure = parseCoursePage(source, python, undefined, undefined, { feedbackPages: 10, feedbackItems: 2000 });
 assert.equal(pure.curriculum!.data!.syllabus![0].lessons!.length, 1200); assert.equal(pure.pricing.data![0].status, "free"); assert.equal(pure.providerData!.data!["roocket.course"].episodeMetadataOmittedCount, 700); assert.ok(Object.keys(pure.source.fieldSources).length < 4000);
 const scraper = new RoocketScraper({ delayMs: 0, feedbackItems: 2000, fetch: transport(url => url.endsWith("robots.txt") ? new Response("User-agent: *") : url === python ? new Response(source) : new Response(api(Array.from({ length: 2000 }, (_, i) => ({ ...comment, body_html: `متن آموزشی ${i}` })))) ) });
 const enriched = await scraper.scrapeCourse(python);
 assert.equal(enriched.curriculum!.data!.syllabus![0].lessons!.length, 1200); assert.ok(enriched.feedback!.data!.reviews.items!.length > 0); assert.ok(enriched.feedback!.data!.reviews.items!.length <= 2000); assert.equal(enriched.feedback!.data!.reviews.collection.stopReason, "observation-payload-budget-limit"); assert.ok(enriched.feedback!.data!.reviews.collection.omittedCount > 0); assert.ok(Object.keys(enriched.source.fieldSources).length <= 4000); assert.ok(enriched.instructors!.data); assert.ok(enriched.feedback!.data!.rating);
 assert.match(enriched.source.fieldSources["curriculum.data"], /data.sections.*data.episodes/);
});
