import { test } from "node:test";
import assert from "node:assert/strict";
import { BaseScraper } from "../scrapers/base";
import { minimal } from "../../api/src/ingestion-examples";
import { AccessDeniedError } from "../scrapers/public-provider";
import type { CourseIngestion } from "../../../packages/core/src/ingestion";

class FixtureScraper extends BaseScraper {
  readonly providerId = "example";
  readonly extractorVersion = "fixture-1";
  canonicalCourseUrl(input: string) {
    const url = new URL(input, this.origin);
    if (url.origin !== this.origin || !/^\/course\/\d+$/.test(url.pathname) || url.username || url.password) throw new Error("Invalid course");
    return this.origin + url.pathname;
  }
  courseKey(url: string) { return new URL(url).pathname; }
  protected relevantSitemap(url: string) { return /sitemap|courses\.xml/.test(new URL(url).pathname); }
  protected extract(body: string, sourceUrl: string, checkedAt: string, submissionId: string): CourseIngestion | Promise<CourseIngestion> {
    if (body === "bad") throw new Error("Invalid fixture");
    const value = minimal();
    return { ...value, sourceUrl, submissionId, source: { ...value.source, checkedAt, extractorVersion: this.extractorVersion } };
  }
}
const origin = "https://example.org";
const transport = (handler: (url: string) => Response) => (async (input: string | URL | Request) => handler(String(input))) as typeof fetch;
test("base validates source-only collection, fresh identity and sequential deduplication", async () => {
  let id = 0;
  const scraper = new FixtureScraper(origin, { delayMs: 0, id: () => `fresh-${++id}`, fetch: transport(() => new Response("ok")) });
  const results = [];
  for await (const result of scraper.scrapeCourses(["/course/1", "/course/1?q=a", "/course/2"])) results.push(result);
  assert.equal(results.length, 2);
  assert.equal(results[0].observation?.schemaVersion, 3);
  assert.notEqual(results[0].observation?.submissionId, results[1].observation?.submissionId);
});

class EnrichedScraper extends FixtureScraper {
  protected async extract(body: string, url: string, at: string, id: string) {
    const value = await super.extract(body, url, at, id);
    try {
      const page = await this.originClient("https://feedback.example.org").request("https://feedback.example.org/comments");
      value.description = { coverage: { status: "partial", reason: "Supplementary text only" }, data: page.body };
      value.source.fieldSources["description.data"] = "public comments response";
    } catch (error) {
      if (error instanceof AccessDeniedError || this.signal?.aborted) throw error;
      value.description = { coverage: { status: "failed", reason: "Supplementary request failed" }, data: null };
    }
    return value;
  }
}
test("base awaits controlled async enrichment and isolates ordinary optional failure", async () => {
  const fetch = transport(url => new Response(url.endsWith("robots.txt") ? "" : url.includes("feedback.") ? "published" : "ok"));
  const value = await new EnrichedScraper(origin, { delayMs: 0, fetch }).scrapeCourse("/course/1");
  assert.equal(value.description?.data, "published");
  const failing = transport(url => new Response(url.endsWith("robots.txt") ? "" : "ok", { status: url.endsWith("comments") ? 404 : 200 }));
  const partial = await new EnrichedScraper(origin, { delayMs: 0, retries: 0, fetch: failing }).scrapeCourse("/course/1");
  assert.equal(partial.description?.coverage.status, "failed");
  assert.equal(partial.title, value.title);
});
test("supplementary denial and cancellation stop async collection", async () => {
  const denied = transport(url => new Response(url.endsWith("robots.txt") ? "" : "ok", { status: url.endsWith("comments") ? 403 : 200 }));
  await assert.rejects(new EnrichedScraper(origin, { delayMs: 0, fetch: denied }).scrapeCourse("/course/1"), AccessDeniedError);
  const controller = new AbortController();
  const fetch = transport(url => { if (url.endsWith("comments")) controller.abort(); return new Response(url.endsWith("robots.txt") ? "" : "ok"); });
  await assert.rejects(new EnrichedScraper(origin, { delayMs: 0, fetch, signal: controller.signal }).scrapeCourse("/course/1"));
});
test("base bounded discovery retains successful selections after partial sitemap failure", async () => {
  const fetch = transport(url => new Response(url.endsWith("robots.txt") ? "Sitemap: https://example.org/sitemap.xml" : url.endsWith("sitemap.xml")
    ? '<sitemapindex><loc>https://example.org/courses.xml</loc><loc>https://example.org/sitemap-bad.xml</loc></sitemapindex>'
    : url.endsWith("courses.xml") ? '<urlset><loc>https://example.org/course/1</loc><loc>https://example.org/course/1?q=a</loc></urlset>' : "bad"));
  const partial = new FixtureScraper(origin, { delayMs: 0, fetch });
  assert.deepEqual(await partial.discoverCourses(Infinity), [origin + "/course/1"]);
  assert.equal(partial.discoveryIsComplete, false);
  const bounded = new FixtureScraper(origin, { delayMs: 0, fetch, maxSitemaps: 1 });
  await assert.rejects(bounded.discoverCourses(Infinity), /incomplete/);
  assert.match(bounded.discoveryWarnings[0], /bound/);
});
test("base cancellation stops collection before requests and invalid facts yield safe failure", async () => {
  const canceled = new FixtureScraper(origin, { signal: AbortSignal.abort(), fetch: transport(() => { throw new Error("must not request"); }) });
  await assert.rejects(canceled.scrapeCourse("/course/1"));
  const bad = new FixtureScraper(origin, { delayMs: 0, fetch: transport(url => new Response(url.endsWith("robots.txt") ? "" : "bad")) });
  const results = [];
  for await (const result of bad.scrapeCourses(["/course/1"])) results.push(result);
  assert.equal(results[0].observation, null);
  assert.equal(results[0].error, "Course extraction or request failed");
});
