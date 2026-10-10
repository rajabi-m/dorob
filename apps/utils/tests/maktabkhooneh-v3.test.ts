import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MaktabkhoonehScraper, decodeNuxtPayload, parseObservation } from "../scrapers/maktabkhooneh";
import { validateIngestion } from "../../api/src/ingestion-validation";
const html = readFileSync(new URL("./fixtures/maktabkhooneh-course.html", import.meta.url), "utf8");
const url = "https://maktabkhooneh.org/course/python-mk346/";
const checkedAt = "2026-10-10T00:00:00Z";
function variant(details: Record<string, unknown>, sections: Record<string, unknown> = {}) {
  const payload = decodeNuxtPayload(html);
  const data = payload.data as Record<string, Record<string, unknown>>;
  Object.assign(data[Object.keys(data)[0]].courseDetails as object, details);
  Object.assign(data[Object.keys(data)[0]], sections);
  const values: unknown[] = [];
  function encode(value: unknown): number {
    const id = values.length; values.push(null);
    values[id] = Array.isArray(value) ? value.map(encode) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) : value;
    return id;
  }
  encode(payload); return `<script id="__NUXT_DATA__">${JSON.stringify(values)}</script>`;
}
test("native Nuxt facts validate with section evidence and fresh programmatic IDs", async () => {
  let id = 0;
  const scraper = new MaktabkhoonehScraper({ delayMs: 0, now: () => new Date(checkedAt), id: () => `fresh-${++id}`, fetch: (async input => new Response(String(input).endsWith("robots.txt") ? "" : html)) as typeof fetch });
  const first = await scraper.scrapeCourse(url), second = await scraper.scrapeCourse(url);
  assert.equal(first.schemaVersion, 3);
  assert.equal(first.providerCourseId, "10465");
  assert.notEqual(first.submissionId, second.submissionId);
  assert.equal(first.pricing.coverage.status, "complete");
  assert.equal(first.curriculum?.coverage.status, "partial");
  assert.ok(first.source.fieldSources["pricing.data.0"]);
  assert.equal(first.education?.data?.duration.contentMinutes, 1020);
  assert.deepEqual(validateIngestion(first), first);
  const reviews = readFileSync(new URL("./fixtures/maktabkhooneh-reviews.html", import.meta.url), "utf8");
  const reviewed = validateIngestion(parseObservation(reviews, url, checkedAt, "reviews-1"));
  assert.ok(reviewed.feedback?.data?.reviews.items?.length);
  assert.equal(reviewed.feedback?.coverage.status, "partial");
});
test("native required pricing preserves paid/free/ambiguous zero and sparse coverage", () => {
  const observe = (details: Record<string, unknown>, sections = {}) => validateIngestion(parseObservation(variant(details, sections), url, checkedAt, "test"));
  const free = observe({ type: "FREE", full_course_sale: false, course_content_sale: false });
  assert.equal(free.pricing.data?.[0].status, "free");
  const unknown = observe({ type: "NORMAL", full_course_sale: true, course_content_sale: false, price: { FULL: 0 }, discounted_price: { FULL: 0 }, image_thumbnail_url: null, image: null });
  assert.equal(unknown.pricing.data?.[0].amount, null);
  assert.equal(unknown.pricing.data?.[0].sourcePrice.amount, 0);
  assert.equal(unknown.pricing.coverage.status, "unknown");
  assert.equal(unknown.thumbnail.data, null);
  const missing = observe({}, { chapterData: null, courseReviews: null, courseReviewsCount: null });
  assert.equal(missing.curriculum?.coverage.status, "unknown");
  const failed = observe({}, { chapterData: { chapters: [{ title: null }] } });
  assert.equal(failed.curriculum?.coverage.status, "failed");
  assert.equal(failed.curriculum?.data, null);
  const empty = observe({}, { chapterData: { chapters: [] }, courseReviews: [], courseReviewsCount: { confirmed_review_count: 0 } });
  assert.deepEqual(empty.feedback?.data?.reviews.items, []);
  assert.ok(empty.source.fieldSources["feedback.data.reviews.items"]);
  assert.deepEqual(empty.curriculum?.data?.syllabus, []);
  assert.throws(() => observe({ title: "" }));
});
test("native anonymous feedback redacts detectable contact details and preserves sample limits", () => {
  const value = validateIngestion(parseObservation(variant({}, { courseReviews: [{ review_description: "نام نمونه user@example.org ۰۹۱۲۳۴۵۶۷۸۹ تمرین خوب بود", user: { full_name: "نام نمونه" }, rate: 4 }], courseReviewsCount: { confirmed_review_count: 20 } }), url, checkedAt, "anonymous"));
  const review = value.feedback?.data?.reviews.items?.[0];
  assert.ok(review?.redacted);
  assert.doesNotMatch(review.text, /نام نمونه|example.org|۰۹۱۲/);
  assert.equal(value.feedback?.data?.reviews.collection.publishedCount, 20);
  assert.equal(value.feedback?.coverage.status, "partial");
});
