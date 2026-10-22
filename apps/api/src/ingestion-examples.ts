import type { CourseIngestion } from "@dorob/core";
/** Fictional source observations for Swagger and offline verification. */
export function minimal(): CourseIngestion {
  return { schemaVersion: 3, submissionId: "synthetic-1", providerId: "example", providerCourseId: "101", title: "دورهٔ نمونه", sourceUrl: "https://example.org/101",
    source: { checkedAt: "2026-10-10T00:00:00Z", extractor: "synthetic", extractorVersion: "1", method: "public-html", fieldSources: { title: "h1", sourceUrl: "canonical", providerId: "adapter", providerCourseId: "page.id" }, warnings: [] },
    pricing: { coverage: { status: "unknown", reason: "Price not established" }, data: null }, thumbnail: { coverage: { status: "unknown", reason: "Image not established" }, data: null } };
}
export function rich(): CourseIngestion {
  const value = minimal();
  value.pricing = { coverage: { status: "complete", reason: null }, data: [
    { id: "free", type: "free", label: "رایگان", amount: 0, originalAmount: null, unit: "toman", status: "free", billingPeriod: null, certificateIncluded: false, accessDescription: null, supportDescription: null, sourcePrice: { amount: 0, originalAmount: null, unit: "toman", label: "رایگان" } },
    { id: "full", type: "full", label: "کامل", amount: 200, originalAmount: 300, unit: "toman", status: "paid", billingPeriod: null, certificateIncluded: true, accessDescription: "دسترسی کامل", supportDescription: null, sourcePrice: { amount: 2000, originalAmount: 3000, unit: "rial", label: "۲۰۰۰ ریال" } } ] };
  value.source.fieldSources["pricing.data"] = "purchase options";
  value.source.fieldSources["pricing.data.0.status"] = "explicit free label";
  value.thumbnail = { coverage: { status: "complete", reason: null }, data: { kind: "url", url: "https://example.org/image.png", alt: "نمونه" } };
  value.source.fieldSources["thumbnail.data"] = "cover";
  value.description = { coverage: { status: "unknown", reason: "Completeness unverified" }, data: "متن منتشرشده" };
  value.education = { coverage: { status: "partial", reason: "Only duration available" }, data: { learningOutcomes: null, prerequisites: null, intendedAudience: null, technologies: null, learningSupport: { practiceDescription: null, assessmentDescription: null, supportDescription: null }, duration: { contentMinutes: 5, effortHours: null, completionWindowDays: null } } };
  value.feedback = { coverage: { status: "partial", reason: "First page only" }, data: { rating: { value: 4, scale: 5, count: 20 }, studentCount: null, reviews: { items: [{ id: "r1", sourceType: "comment", text: "تمرین مفید بود", rating: null, publishedAt: null, publishedDateText: null, verifiedEnrollment: null, sourceUrl: value.sourceUrl, sourceLocator: "comments[0]", redacted: false }], collection: { status: "partial", publishedCount: 5, collectedCount: 1, selection: "first", pagesRead: 1, hasMore: true, omittedCount: 0, stopReason: "bounded" } } } };
  return value;
}
