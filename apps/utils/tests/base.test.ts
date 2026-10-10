import { test } from "node:test";
import assert from "node:assert/strict";
import { BaseScraper } from "../scrapers/base";
import { minimal } from "../../api/src/ingestion-examples";

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
  protected extract(body: string, sourceUrl: string, checkedAt: string, submissionId: string) {
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
