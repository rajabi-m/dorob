import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { canonicalCourseUrl, parseCoursePage, SabzlearnScraper } from "../scrapers/sabzlearn.ts";
import { AccessDeniedError } from "../scrapers/public-provider.ts";
import { decodeNuxtPayload } from "../scrapers/maktabkhooneh.ts";
import { main } from "../scrape-sabzlearn.ts";

function assertSubset(actual: unknown, expected: Record<string, unknown>) {
  assert.ok(actual !== null && typeof actual === "object");
  for (const [key, value] of Object.entries(expected)) {
    const observed: unknown = (actual as Record<string, unknown>)[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) assertSubset(observed, value as Record<string, unknown>);
    else assert.deepEqual(observed, value);
  }
}
const courseUrl = "https://sabzlearn.ir/course/csharp/";
const fixture = await readFile(new URL("./fixtures/sabzlearn-csharp.html", import.meta.url), "utf8");
const htmlFixture = await readFile(new URL("./fixtures/sabzlearn-html.html", import.meta.url), "utf8");
const pythonFixture = await readFile(new URL("./fixtures/sabzlearn-python.html", import.meta.url), "utf8");
// Synthetic modifications of the reduced public fixture; never presented as provider observations.
function changed(patch: Record<string, unknown>, visible = "2,000,000 تومان 12 ساعت مدت زمان دوره توضیحات") {
  const details = (decodeNuxtPayload(fixture).data as Record<string, unknown>)["course-csharp"];
  const values: unknown[] = [];
  function encode(value: unknown): number { const index = values.length; values.push(null); values[index] = Array.isArray(value) ? value.map(encode) : value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, value]) => [key, encode(value)])) : value; return index; }
  encode({ data: { "course-csharp": { ...(details as Record<string, unknown>), ...patch } } });
  return `<main><h1>دوره</h1><div class="flex items-end justify-between"><button>افزودن به سبد خرید</button>${visible}</div></main><script id="__NUXT_DATA__">${JSON.stringify(values)}</script>`;
}
function mockFetch(failure = false, calls: string[] = []) {
  return (async (input: string | URL | Request) => {
    const url = String(input); calls.push(url);
    if (url.endsWith("robots.txt")) return new Response("User-agent: *\nDisallow: /lesson/\nSitemap: https://sabzlearn.ir/sitemap.xml");
    if (url.endsWith("/sitemap.xml")) return new Response('<sitemapindex><sitemap><loc>https://sabzlearn.ir/sitemap-courses.xml</loc></sitemap><sitemap><loc>https://sabzlearn.ir/sitemap-blog.xml</loc></sitemap></sitemapindex>');
    if (url.endsWith("sitemap-courses.xml")) return new Response(`<urlset><url><loc>${courseUrl}</loc></url><url><loc>${courseUrl}?ref=a</loc></url></urlset>`);
    if (url === courseUrl) return new Response(failure ? "layout changed" : fixture);
    return new Response("missing", { status: 404 });
  }) as typeof fetch;
}

describe("Sabzlearn adapter", () => {
  test("reduced public paid/free/Python observations return the complete contract", () => {
    const c = parseCoursePage(fixture, courseUrl, "2026-10-02T00:00:00Z");
    assert.deepEqual(c.id, "sabzlearn:100"); assert.deepEqual(c.schemaVersion, 2); assert.equal(c.derived, null);
    assertSubset(c.offers?.[0], { amount: 2000000, originalAmount: 4000000, sourcePrice: { unit: "toman" } });
    assert.deepEqual(c.duration, { contentMinutes: 720, effortHours: null, completionWindowDays: null });
    assertSubset(c.syllabus?.[0].lessons?.[0], { id: "8295", order: 1, type: "video", contentMinutes: 12 + 10 / 60 });
    assert.equal(c.learningOutcomes, null); assert.equal(c.providerLevel, null); assert.equal(c.rating, null); assert.equal(c.providerUpdatedAt, null);
    assert.equal(c.source.parserVersion, "2.1.0"); assert.equal(c.reviews.items, null);
    assert.equal(c.reviews.collection.collectedCount, null); assert.equal(c.reviews.collection.publishedCount, null);
    assert.equal(c.syllabusCoverage.status, "unknown"); assert.equal(c.syllabusCoverage.publishedLessonCount, 4);
    assert.equal(c.syllabusCoverage.extractedLessonCount, 4); assert.equal(c.syllabus?.[0].description, null);
    assert.equal(c.syllabus?.[0].lessons?.[0].description, null); assert.equal(c.technologies, null);
    assert.equal(c.offers?.[0].accessDescription, "فقط آنلاین"); assert.equal(c.offers?.[0].supportDescription, null);
    assert.match(c.source.contentHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(parseCoursePage(fixture, courseUrl, "2026-10-03T00:00:00Z").source.contentHash, c.source.contentHash);
    const free = parseCoursePage(htmlFixture, "https://sabzlearn.ir/course/html-tutorial/");
    assertSubset(free.offers?.[0], { status: "free", amount: 0, originalAmount: null });
    const python = parseCoursePage(pythonFixture, "https://sabzlearn.ir/course/python/");
    assert.deepEqual(python.id, "sabzlearn:25"); assert.deepEqual(python.offers?.[0].amount, 3500000);
  });
  test("explicit educational headings and support FAQs provide source claims, not inferred facts", () => {
    const page = changed({ full_content: '<h2>چه چیزی یاد می‌گیرید؟</h2><ul><li>ساخت برنامهٔ ساده</li><li>نوشتن آزمون</li></ul><h2>به چه کسانی پیشنهاد می‌شود؟</h2><p>افراد آشنا با رایانه</p><h2>چه پروژه هایی انجام می‌شود؟</h2><p>ساخت یک برنامهٔ فروشگاهی</p><h2>تبلیغات</h2><p>بهترین دوره</p>',
      faq: [{ question: "آیا دوره پشتیبانی دارد؟", answer: "<p>پاسخ به پرسش‌ها در انجمن دوره</p>" }],
      chapters: [{ id: 1, title: "شروع", description: "شرح فصل", episodes_count: 1, episodes: [{ id: 10, title: "آغاز", description: "شرح جلسه", has_video: true, duration: "10:00" }] }] });
    const c = parseCoursePage(page, courseUrl);
    assert.deepEqual(c.learningOutcomes, ["ساخت برنامهٔ ساده", "نوشتن آزمون"]);
    assert.equal(c.intendedAudience, "افراد آشنا با رایانه");
    assert.equal(c.learningSupport.practiceDescription, "ساخت یک برنامهٔ فروشگاهی");
    assert.equal(c.learningSupport.supportDescription, "پاسخ به پرسش‌ها در انجمن دوره");
    assert.equal(c.learningSupport.assessmentDescription, null); assert.equal(c.technologies, null);
    assert.equal(c.syllabus?.[0].description, "شرح فصل"); assert.equal(c.syllabus?.[0].lessons?.[0].description, "شرح جلسه");
    assert.equal(c.syllabusCoverage.status, "unknown"); // Matching counts alone do not establish complete traversal.
    assert.match(c.source.fieldSources["learningSupport.supportDescription"], /course\.faq\[0\]\.answer/);
    assert.equal(c.source.fieldSources["syllabus.0.lessons.0.description"], "course.chapters[0].episodes[0].description");
    assert.notEqual(c.source.contentHash, parseCoursePage(changed({}), courseUrl).source.contentHash);
  });
  test("explicit outcome and access FAQs retain prose and establish recorded delivery only when stated", () => {
    const course = parseCoursePage(changed({ faq: [
      { question: "بعد از پایان دوره اموزش PHP چه چیزهایی یاد می‌گیرم؟", answer: "ساخت پروژه و اتصال به پایگاه داده" },
      { question: "آیا دسترسی به ویدیوهای دوره PHP دائمی است؟", answer: "پس از خرید می‌توانید آموزش‌ها را در زمان دلخواه مرور کنید." },
    ] }), courseUrl);
    assert.deepEqual(course.learningOutcomes, ["ساخت پروژه و اتصال به پایگاه داده"]);
    assert.equal(course.format, "recorded-video");
    assert.match(course.offers![0].accessDescription!, /فقط آنلاین\nآیا دسترسی/);
    assert.match(course.source.fieldSources["offers.full.accessDescription"], /course.faq\[1\]/);
    const unknown = parseCoursePage(changed({ faq: [{ question: "آیا دوره آنلاین است؟", answer: "بله" }] }), courseUrl);
    assert.equal(unknown.format, null);
    assert.equal(unknown.learningOutcomes, null);
    const headingFirst = parseCoursePage(changed({ full_content: "<h2>چه خواهید آموخت</h2><ul><li>هدف صریح</li></ul>", faq: [{ question: "بعد از دوره چه چیزهایی یاد می‌گیرم؟", answer: "هدف دوم" }] }), courseUrl);
    assert.deepEqual(headingFirst.learningOutcomes, ["هدف صریح"]);
  });
  test("explicit course JSON-LD reviews are anonymous, deduplicated, and coverage remains unknown", () => {
    // Entirely synthetic reviews and identities; none are sourced from provider feedback.
    const review = { "@type": "Review", author: { name: "نویسندهٔ ساختگی" }, reviewBody: "من نویسندهٔ ساختگی هستم؛ تمرین‌ها مفید بود. fake@example.test @fakeuser 09123456789",
      datePublished: "2026-10-03T12:00:00Z", reviewRating: { ratingValue: 4, bestRating: 5 } };
    const jsonld = (reviews: unknown[], url = courseUrl) => `<script type="application/ld+json">${JSON.stringify({ "@type": "Course", url, review: reviews })}</script>`;
    const page = changed({}) + jsonld([review, review, { "@type": "Comment", text: "سؤال" }]);
    const c = parseCoursePage(page, courseUrl);
    assert.equal(c.reviews.items?.length, 1); assert.equal(c.reviews.collection.omittedCount, 2);
    assert.equal(c.reviews.collection.status, "unknown"); assert.equal(c.reviews.collection.publishedCount, null);
    assert.equal(c.reviews.collection.hasMore, null); assert.equal(c.reviews.collection.pagesRead, 1);
    const item = c.reviews.items![0];
    assert.equal(item.redacted, true); assert.deepEqual(item.rating, { value: 4, scale: 5 });
    assert.equal(item.publishedAt, "2026-10-03T12:00:00.000Z"); assert.equal(item.verifiedEnrollment, null);
    assert.equal(c.source.fieldSources["reviews.items.0"], item.sourceLocator);
    assert.match(item.id, /^[a-f0-9]{64}$/); assert.equal(item.sourceUrl, courseUrl);
    assert.doesNotMatch(JSON.stringify(c), /نویسندهٔ ساختگی|fake@example|fakeuser|09123456789/);
    assert.equal(parseCoursePage(changed({}) + jsonld([review], "https://sabzlearn.ir/course/python/"), courseUrl).reviews.items, null);
    assert.equal(parseCoursePage(changed({}) + jsonld([{ "@type": "Comment", reviewBody: "سؤال" }]), courseUrl).reviews.items, null);
    assert.equal(parseCoursePage(changed({}) + jsonld([{ ...review, inReplyTo: { "@id": "reply-1" } }]), courseUrl).reviews.items, null);
    assert.equal(parseCoursePage(changed({}) + jsonld([{ ...review, itemReviewed: { url: "https://sabzlearn.ir/course/python/" } }]), courseUrl).reviews.items, null);
    assert.equal(item.sourceLocator, "JSON-LD[0].review[0]");
    assert.notEqual(parseCoursePage(changed({}) + jsonld([{ ...review, reviewBody: "سرعت تدریس زیاد بود" }]), courseUrl).source.contentHash, c.source.contentHash);
    const noScale = parseCoursePage(changed({}) + jsonld([{ ...review, datePublished: "1405/07/11", reviewRating: { ratingValue: 4 } }]), courseUrl).reviews.items![0];
    assert.equal(noScale.rating, null); assert.equal(noScale.publishedAt, null); assert.equal(noScale.publishedDateText, "1405/07/11");
  });
  test("mixed public comments and questions do not become reviews or leak identities", () => {
    const values: unknown[] = [];
    function encode(value: unknown): number { const index = values.length; values.push(null); values[index] = Array.isArray(value) ? value.map(encode) : value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) : value; return index; }
    const details = (decodeNuxtPayload(fixture).data as Record<string, unknown>)["course-csharp"];
    encode({ data: { "course-csharp": details, "courses-csharp-comments": { items: [{ id: 1, content: "یک سؤال", user: { name: "شخص ساختگی", avatar: "https://example.test/private.webp" }, replies: [] }], pagination: { total: 100, has_more_pages: true } } } });
    const c = parseCoursePage(`<script id="__NUXT_DATA__">${JSON.stringify(values)}</script>`, courseUrl);
    assert.equal(c.reviews.items, null); assert.equal(c.reviews.collection.publishedCount, null);
    assert.equal(c.reviews.collection.hasMore, true); assert.match(c.reviews.collection.stopReason!, /mixed comment\/reply total/);
    assert.doesNotMatch(JSON.stringify(c), /شخص ساختگی|private.webp|یک سؤال/);
  });
  test("synthetic self-referencing public comments preserve anonymous feedback and exclude questions/replies/staff", () => {
    const values: unknown[] = [];
    function encode(value: unknown): number { const index = values.length; values.push(null); values[index] = Array.isArray(value) ? value.map(encode) : value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) : value; return index; }
    const details = (decodeNuxtPayload(fixture).data as Record<string, unknown>)["course-csharp"];
    const comments = [
      { id: 1, reply_id: 1, content: "نویسندهٔ ساختگی هستم؛ تمرین‌ها مفید بود fake@example.test", created_at: "1405/07/11", user: { name: "نویسندهٔ ساختگی", type: "دانشجو" }, replies: [{ id: 2, reply_id: 1, content: "پاسخ مدرس", user: { name: "پاسخگوی ساختگی", type: "مدرس" } }] },
      { id: 3, reply_id: 3, content: "آیا دوره پروژه دارد؟", user: { name: "پرسشگر ساختگی", type: "کاربر" } },
      { id: 4, reply_id: 1, content: "پاسخ دیگر", user: { type: "کاربر" } },
      { id: 5, reply_id: 5, content: "پشتیبانی آماده است", user: { type: "پشتیبان" } },
    ];
    encode({ data: { "course-csharp": details, "courses-csharp-comments": { items: comments, pagination: { total: 100, has_more_pages: true } } } });
    const c = parseCoursePage(`<script id="__NUXT_DATA__">${JSON.stringify(values)}</script>`, courseUrl);
    assert.equal(c.reviews.items?.length, 1); assert.equal(c.reviews.items![0].id, "1");
    assert.equal(c.reviews.items![0].sourceType, "comment"); assert.equal(c.reviews.items![0].verifiedEnrollment, null);
    assert.equal(c.reviews.items![0].publishedAt, null); assert.equal(c.reviews.items![0].publishedDateText, "1405/07/11");
    assert.equal(c.reviews.items![0].rating, null); assert.equal(c.reviews.items![0].redacted, true);
    assert.equal(c.reviews.collection.status, "partial"); assert.equal(c.reviews.collection.publishedCount, null);
    assert.equal(c.reviews.collection.omittedCount, 3); assert.equal(c.reviews.collection.hasMore, true);
    assert.equal(c.source.fieldSources["reviews.items.0"], "__NUXT_DATA__.data.courses-csharp-comments.items[0]");
    assert.doesNotMatch(JSON.stringify(c), /نویسندهٔ ساختگی|پرسشگر ساختگی|پاسخگوی ساختگی|fake@example|پاسخ مدرس|پشتیبانی آماده/);
    const partial = parseCoursePage(changed({ chapters: [{ title: "شروع", episodes_count: 3, episodes: [{ title: "جلسه", has_video: true }] }] }), courseUrl);
    assert.equal(partial.syllabusCoverage.status, "partial"); assert.equal(partial.syllabusCoverage.publishedLessonCount, 3); assert.equal(partial.syllabusCoverage.extractedLessonCount, 1);
  });
  test("synthetic unknown units/prices, rial normalization and disabled offers", () => {
    assertSubset(parseCoursePage(changed({}, "2,000,000 توضیحات تومان"), courseUrl).offers?.[0], { amount: null, originalAmount: null, status: "unknown", sourcePrice: { unit: "unknown" } });
    assertSubset(parseCoursePage(changed({}, "2,000,000 ریال توضیحات"), courseUrl).offers?.[0], { amount: 200000, originalAmount: 400000, sourcePrice: { unit: "rial" } });
    assert.equal(parseCoursePage(changed({}, "2,000,000 ریال 2,000,000 تومان توضیحات"), courseUrl).offers?.[0].amount, null);
    const noPurchasePrice = changed({}, "قیمت نامشخص").replace("<main>", "<main><nav>2,000,000 تومان</nav>");
    assert.equal(parseCoursePage(noPurchasePrice, courseUrl).offers?.[0].amount, null);
    assert.equal(parseCoursePage(changed({ original_price: null, discounted_price: null }), courseUrl).offers, null);
    assert.deepEqual(parseCoursePage(changed({ is_sale_stopped: true }), courseUrl).offers, []);
    assert.equal(parseCoursePage(changed({ original_price: 0, discounted_price: 0 }, "0 تومان توضیحات"), courseUrl).offers?.[0].amount, null);
    assert.equal(parseCoursePage(changed({ chapters: undefined }), courseUrl).syllabus, null);
  });
  test("rejects layout, identity and conflicting price drift", () => {
    assert.throws(() => parseCoursePage("<h1>course</h1>", courseUrl));
    assert.throws(() => parseCoursePage(changed({ slug: "other" }), courseUrl));
    assert.throws(() => parseCoursePage(changed({ id: null }), courseUrl));
    assert.throws(() => parseCoursePage(changed({ is_free: true }), courseUrl));
    assert.throws(() => parseCoursePage(changed({ discounted_price: 5000000 }), courseUrl));
    for (const value of [-1, "2000000", false]) assert.throws(() => parseCoursePage(changed({ discounted_price: value }), courseUrl));
    assert.throws(() => parseCoursePage(fixture, courseUrl, "bad date"));
  });
  test("strict URLs and sitemap course-only discovery", async () => {
    assert.deepEqual(canonicalCourseUrl("/course/csharp?ref=1#x"), courseUrl);
    for (const url of ["http://sabzlearn.ir/course/csharp/", "https://evil.test/course/csharp/", "https://x@sabzlearn.ir/course/csharp/", "/lesson/1/", "/course/csharp/lesson/"]) assert.throws(() => canonicalCourseUrl(url));
    const calls: string[] = [], scraper = new SabzlearnScraper({ fetch: mockFetch(false, calls), delayMs: 0 });
    assert.deepEqual(await scraper.discoverCourses(), [courseUrl]);
    assert.deepEqual(calls.some(url => url.includes("blog")), false);
    const results = []; for await (const result of scraper.scrapeCourses([courseUrl, courseUrl])) results.push(result);
    assert.equal((results).length, 1); assert.deepEqual(results[0].course?.id, "sabzlearn:100");
  });
  test("access denied pauses collection and parsing failures become errors", async () => {
    const scraper = new SabzlearnScraper({ delayMs: 0, fetch: (async (input: string | URL | Request) => String(input).endsWith("robots.txt") ? new Response("User-agent: *") : new Response("Denied", { status: 403 })) as typeof fetch });
    await assert.rejects(scraper.scrapeCourse(courseUrl), AccessDeniedError);
    await assert.rejects(scraper.scrapeCourse(courseUrl), AccessDeniedError);
    const broken = new SabzlearnScraper({ fetch: mockFetch(true), delayMs: 0 });
    for await (const result of broken.scrapeCourses([courseUrl])) { assert.equal(result.course, null); assert.ok((result.error)?.includes("NUXT")); }
  });
  test("CLI partial checkpoint, repair and resume", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sabzlearn-test-")), output = join(dir, "courses.json");
    try {
      const args = ["--url", courseUrl, "--output", output, "--delay-ms", "0"];
      assert.deepEqual(await main(args, { fetch: mockFetch(true) }), 1);
      assert.deepEqual(JSON.parse(await readFile(output, "utf8")).status, "partial");
      assert.deepEqual(await main([...args, "--resume"], { fetch: mockFetch() }), 0);
      const exported = JSON.parse(await readFile(output, "utf8"));
      assert.deepEqual(exported.status, "complete"); assert.deepEqual(exported.courses[0].schemaVersion, 2); assert.equal((exported.courses).length, 1);
      const calls: string[] = []; assert.deepEqual(await main([...args, "--resume"], { fetch: mockFetch(false, calls) }), 0); assert.equal((calls).length, 0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
