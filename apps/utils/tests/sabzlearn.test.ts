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
    assert.deepEqual(c.id, "sabzlearn:100"); assert.deepEqual(c.schemaVersion, 1); assert.equal(c.derived, null);
    assertSubset(c.offers?.[0], { amount: 2000000, originalAmount: 4000000, sourcePrice: { unit: "toman" } });
    assert.deepEqual(c.duration, { contentMinutes: 720, effortHours: null, completionWindowDays: null });
    assertSubset(c.syllabus?.[0].lessons?.[0], { id: "8295", order: 1, type: "video", contentMinutes: 12 + 10 / 60 });
    assert.equal(c.learningOutcomes, null); assert.equal(c.providerLevel, null); assert.equal(c.rating, null); assert.equal(c.providerUpdatedAt, null);
    assert.match(c.source.contentHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(parseCoursePage(fixture, courseUrl, "2026-10-03T00:00:00Z").source.contentHash, c.source.contentHash);
    const free = parseCoursePage(htmlFixture, "https://sabzlearn.ir/course/html-tutorial/");
    assertSubset(free.offers?.[0], { status: "free", amount: 0, originalAmount: null });
    const python = parseCoursePage(pythonFixture, "https://sabzlearn.ir/course/python/");
    assert.deepEqual(python.id, "sabzlearn:25"); assert.deepEqual(python.offers?.[0].amount, 3500000);
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
      assert.deepEqual(exported.status, "complete"); assert.deepEqual(exported.courses[0].schemaVersion, 1); assert.equal((exported.courses).length, 1);
      const calls: string[] = []; assert.deepEqual(await main([...args, "--resume"], { fetch: mockFetch(false, calls) }), 0); assert.equal((calls).length, 0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
