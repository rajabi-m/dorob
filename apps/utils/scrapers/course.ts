import { createHash } from "node:crypto";

export type CourseMethod = "public-html" | "public-html-and-embedded-data" | "public-html-and-public-api" | "public-api" | "browser-rendered-html";
export type CoverageStatus = "complete" | "partial" | "unknown";
export type CourseReview = {
  id: string; sourceType: "review" | "comment"; text: string; rating: { value: number; scale: number } | null;
  publishedAt: string | null; publishedDateText: string | null; verifiedEnrollment: boolean | null;
  sourceUrl: string; sourceLocator: string; redacted: boolean;
};
export type ProviderCourse = {
  schemaVersion: 2;
  id: string; providerId: string; providerCourseId: string; sourceUrl: string; title: string;
  description: string | null; learningOutcomes: string[] | null; prerequisites: string | null;
  intendedAudience: string | null;
  technologies: { name: string; version: string | null }[] | null;
  learningSupport: { practiceDescription: string | null; assessmentDescription: string | null; supportDescription: string | null };
  image: { url: string; alt: string } | null;
  language: string | null;
  format: "recorded-video" | "interactive" | "live" | "blended" | "other" | null;
  instructors: { name: string; role: string | null }[] | null;
  providerCategories: string[] | null; providerLevel: string | null;
  offers: {
    id: string; type: "full" | "content" | "subscription" | "free" | "other"; label: string | null;
    amount: number | null; originalAmount: number | null; unit: "toman";
    status: "free" | "paid" | "subscription" | "unknown";
    billingPeriod: "monthly" | "yearly" | "other" | null; certificateIncluded: boolean | null;
    accessDescription: string | null; supportDescription: string | null;
    sourcePrice: { amount: number | null; originalAmount: number | null; unit: "toman" | "rial" | "unknown"; label: string | null };
  }[] | null;
  duration: { contentMinutes: number | null; effortHours: number | null; completionWindowDays: number | null };
  syllabus: {
    id: string | null; order: number; title: string; description: string | null;
    lessons: {
      id: string | null; order: number; title: string; description: string | null;
      type: "video" | "text" | "exercise" | "quiz" | "project" | "live" | "other" | "unknown";
      providerType: string | null; contentMinutes: number | null;
    }[] | null;
  }[] | null;
  syllabusCoverage: { status: CoverageStatus; publishedLessonCount: number | null; extractedLessonCount: number | null; reasons: string[] };
  reviews: {
    items: CourseReview[] | null;
    collection: { status: CoverageStatus; publishedCount: number | null; collectedCount: number | null;
      selection: string | null; pagesRead: number; hasMore: boolean | null; omittedCount: number; stopReason: string | null };
  };
  availability: "available" | "unavailable" | "unknown";
  providerStatus: string | null; ongoing: boolean | null; providerUpdatedAt: string | null;
  rating: { value: number; scale: number; count: number | null } | null;
  studentCount: number | null; lessonCount: number | null;
  features: { label: string; value: string }[] | null;
  source: {
    checkedAt: string; parser: string; parserVersion: string; method: CourseMethod;
    contentHash: string; fieldSources: Record<string, string>; warnings: string[];
  };
  raw: Record<string, unknown>;
  derived: null;
};

export function createCourse(providerId: string, providerCourseId: string, title: string, sourceUrl: string,
  checkedAt = new Date().toISOString(), method: CourseMethod = "public-html"): ProviderCourse {
  return {
    schemaVersion: 2, id: `${providerId}:${providerCourseId}`, providerId, providerCourseId, title, sourceUrl,
    description: null, learningOutcomes: null, prerequisites: null, intendedAudience: null, technologies: null,
    learningSupport: { practiceDescription: null, assessmentDescription: null, supportDescription: null }, image: null, language: null, format: null,
    instructors: null, providerCategories: null, providerLevel: null, offers: null,
    duration: { contentMinutes: null, effortHours: null, completionWindowDays: null }, syllabus: null,
    syllabusCoverage: { status: "unknown", publishedLessonCount: null, extractedLessonCount: null, reasons: [] },
    reviews: { items: null, collection: { status: "unknown", publishedCount: null, collectedCount: null, selection: null,
      pagesRead: 0, hasMore: null, omittedCount: 0, stopReason: "Reviews were not identified in the public source." } },
    availability: "unknown", providerStatus: null, ongoing: null, providerUpdatedAt: null,
    rating: null, studentCount: null, lessonCount: null, features: null,
    source: { checkedAt, parser: providerId, parserVersion: "1.0.0", method, contentHash: "", fieldSources: {}, warnings: [] },
    raw: {}, derived: null,
  };
}

/** Remove known authors and detectable contact details before review text reaches records/fixtures. */
export function anonymizeReviewText(input: string, authorNames: string[] = []): { text: string; redacted: boolean } {
  let text = input;
  for (const name of authorNames.filter(name => name.trim().length > 1).sort((a, b) => b.length - a.length)) {
    text = text.split(name).join("[حذف مشخصات]");
  }
  text = text.replace(/(?:https?:\/\/|www\.)[^\s<>]+/giu, "[حذف پیوند]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "[حذف ایمیل]")
    .replace(/@[\p{L}\p{N}_.-]+/gu, "[حذف شناسه]")
    .replace(/(?:[+＋]?[0-9۰-۹٠-٩][\s().-]*){10,15}/gu, "[حذف شماره]");
  return { text: text.trim(), redacted: text !== input };
}

/** Anonymous fallback identity; source author IDs/names must never be part of the key. */
export function reviewContentId(text: string, publishedDateText: string | null,
  rating: { value: number; scale: number } | null): string {
  return createHash("sha256").update(JSON.stringify([text, publishedDateText, rating])).digest("hex");
}

/** Sort object keys while preserving meaningful list order. */
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, item]) => [key, sorted(item)]));
  return value;
}

function assertHttps(input: string): void {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Expected absolute HTTPS URL");
}

/** Validate source facts before export; do not turn incomplete observations into fabricated records. */
export function finalizeCourse(course: ProviderCourse): ProviderCourse {
  const requiredKeys = Object.keys(createCourse("validation", "validation", "validation", "https://validation.invalid"));
  if (requiredKeys.some(key => !Object.hasOwn(course, key))) throw new Error("Incomplete golden course structure");
  for (const key of ["id", "providerId", "providerCourseId", "title", "sourceUrl"] as const) {
    if (typeof course[key] !== "string" || !course[key].trim()) throw new Error(`Missing required course field: ${key}`);
  }
  if (course.id !== `${course.providerId}:${course.providerCourseId}` || course.schemaVersion !== 2 || course.derived !== null) throw new Error("Invalid course identity or schema");
  assertHttps(course.sourceUrl);
  if (course.image) assertHttps(course.image.url);
  if (!Number.isFinite(Date.parse(course.source.checkedAt)) || !course.source.parser.trim() || !course.source.parserVersion.trim()) throw new Error("Invalid source metadata");
  if (!["public-html", "public-html-and-embedded-data", "public-html-and-public-api", "public-api", "browser-rendered-html"].includes(course.source.method)) throw new Error("Invalid source method");
  if (["contentMinutes", "effortHours", "completionWindowDays"].some(key => !Object.hasOwn(course.duration, key))) throw new Error("Incomplete duration structure");
  const nonnegative = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0);
  for (const value of Object.values(course.duration)) if (!nonnegative(value)) throw new Error("Invalid duration");
  for (const value of [course.studentCount, course.lessonCount, course.rating?.count ?? null]) if (!nonnegative(value) || (value !== null && !Number.isInteger(value))) throw new Error("Invalid count");
  if (course.rating && (!nonnegative(course.rating.value) || course.rating.scale <= 0 || !Number.isFinite(course.rating.scale) || course.rating.value > course.rating.scale)) throw new Error("Invalid rating");
  const count = (value: number | null) => nonnegative(value) && (value === null || Number.isInteger(value));
  const nullableText = (value: unknown) => value === null || typeof value === "string";
  const coverageStatuses = ["complete", "partial", "unknown"];
  if (!nullableText(course.intendedAudience) || (course.technologies !== null && (!Array.isArray(course.technologies) || course.technologies.some(item => !item.name?.trim() || !nullableText(item.version))))) throw new Error("Invalid educational evidence");
  if (!course.learningSupport || ["practiceDescription", "assessmentDescription", "supportDescription"].some(key => !Object.hasOwn(course.learningSupport, key) || !nullableText(course.learningSupport[key as keyof typeof course.learningSupport]))) throw new Error("Incomplete learning support");
  const coverage = course.syllabusCoverage;
  if (!coverage || !coverageStatuses.includes(coverage.status) || !count(coverage.publishedLessonCount) || !count(coverage.extractedLessonCount) || !Array.isArray(coverage.reasons) || coverage.reasons.some(reason => typeof reason !== "string")) throw new Error("Invalid syllabus coverage");
  const extracted = course.syllabus === null || (course.syllabus.length > 0 && course.syllabus.every(chapter => chapter.lessons === null)) ? null : course.syllabus.reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0);
  if (coverage.extractedLessonCount !== extracted) throw new Error("Syllabus extracted count mismatch");
  if (coverage.status === "complete" && (course.syllabus === null || course.syllabus.some(chapter => chapter.lessons === null) || !coverage.reasons.length || (coverage.publishedLessonCount !== null && coverage.publishedLessonCount !== extracted))) throw new Error("Complete syllabus requires consistent evidence");
  const reviews = course.reviews;
  const collection = reviews?.collection;
  if (!collection || !coverageStatuses.includes(collection.status) || !count(collection.publishedCount) || !count(collection.collectedCount) || !count(collection.pagesRead) || collection.pagesRead === null || !count(collection.omittedCount) || collection.omittedCount === null || !nullableText(collection.selection) || !nullableText(collection.stopReason) || ![true, false, null].includes(collection.hasMore)) throw new Error("Invalid review collection");
  if (reviews.items !== null && !Array.isArray(reviews.items)) throw new Error("Invalid review items");
  if (collection.collectedCount !== (reviews.items === null ? null : reviews.items.length)) throw new Error("Review collected count mismatch");
  if (collection.publishedCount !== null && collection.collectedCount !== null && collection.collectedCount > collection.publishedCount) throw new Error("Review count exceeds published total");
  if (collection.status === "complete" && (reviews.items === null || collection.hasMore !== false || collection.omittedCount > 0 || (collection.publishedCount !== null && collection.publishedCount !== collection.collectedCount))) throw new Error("Complete reviews require consistent evidence");
  const reviewIds = new Set<string>();
  for (const review of reviews.items ?? []) {
    const keys = ["id", "sourceType", "text", "rating", "publishedAt", "publishedDateText", "verifiedEnrollment", "sourceUrl", "sourceLocator", "redacted"];
    if (keys.some(key => !Object.hasOwn(review, key)) || Object.keys(review).some(key => !keys.includes(key))) throw new Error("Invalid review structure; identities are forbidden");
    if (!["review", "comment"].includes(review.sourceType) || !review.id?.trim() || reviewIds.has(review.id) || !review.text?.trim() || !review.sourceLocator?.trim() || typeof review.redacted !== "boolean" || ![true, false, null].includes(review.verifiedEnrollment) || !nullableText(review.publishedDateText)) throw new Error("Invalid review evidence");
    assertHttps(review.sourceUrl);
    if (review.publishedAt !== null && !Number.isFinite(Date.parse(review.publishedAt))) throw new Error("Invalid review date");
    if (review.rating && (!nonnegative(review.rating.value) || !Number.isFinite(review.rating.scale) || review.rating.scale <= 0 || review.rating.value > review.rating.scale)) throw new Error("Invalid review rating");
    if (anonymizeReviewText(review.text).text !== review.text) throw new Error("Review contact details must be redacted");
    reviewIds.add(review.id);
  }
  const offerIds = new Set<string>();
  for (const offer of course.offers ?? []) {
    if (!offer.id || offerIds.has(offer.id)) throw new Error("Invalid or duplicate offer ID");
    offerIds.add(offer.id);
    if (!nullableText(offer.accessDescription) || !nullableText(offer.supportDescription)) throw new Error("Incomplete offer terms");
    for (const amount of [offer.amount, offer.originalAmount, offer.sourcePrice.amount, offer.sourcePrice.originalAmount]) if (!nonnegative(amount)) throw new Error("Invalid price");
    if (offer.amount !== null && offer.originalAmount !== null && offer.originalAmount <= offer.amount) throw new Error("Invalid discount");
    if (offer.status === "free" && offer.amount !== 0) throw new Error("Free offer requires zero amount");
    if (offer.amount === 0 && offer.status !== "free") throw new Error("Zero price requires explicit free status");
    if (offer.status === "paid" && (offer.amount === null || offer.amount <= 0)) throw new Error("Paid offer requires positive price");
    if (offer.sourcePrice.unit === "unknown" && offer.amount !== null && offer.amount !== 0) throw new Error("Unknown currency cannot produce a normalized price");
  }
  for (const [i, chapter] of (course.syllabus ?? []).entries()) {
    if (chapter.order !== i + 1 || !chapter.title.trim() || !nullableText(chapter.description)) throw new Error("Invalid chapter order or title");
    for (const [j, lesson] of (chapter.lessons ?? []).entries()) {
      if (lesson.order !== j + 1 || !lesson.title.trim() || !nullableText(lesson.description) || !nonnegative(lesson.contentMinutes)) throw new Error("Invalid lesson");
    }
  }
  const facts = Object.fromEntries(Object.entries(course).filter(([key]) => !["source", "raw", "derived"].includes(key)));
  // Signed cover parameters expire independently of course facts.
  const imageUrl = course.image ? new URL(course.image.url) : null;
  if (imageUrl) {
    imageUrl.hash = "";
    if ([...imageUrl.searchParams.keys()].some(key => /^(?:expires?|token)$/i.test(key))) imageUrl.searchParams.delete("md5");
    for (const key of [...imageUrl.searchParams.keys()]) {
      if (/^(?:x-amz-.+|x-goog-.+|expires?|expiry|signature|sig|token|policy|key-pair-id)$/i.test(key)) imageUrl.searchParams.delete(key);
    }
    imageUrl.searchParams.sort();
  }
  const reviewCoverage: Partial<ProviderCourse["reviews"]["collection"]> = { ...course.reviews.collection };
  delete reviewCoverage.pagesRead; delete reviewCoverage.stopReason;
  const hashFacts = { ...facts, reviews: { items: course.reviews.items, collection: reviewCoverage }, image: course.image ? { ...course.image, url: imageUrl!.href } : null };
  course.source.contentHash = createHash("sha256").update(JSON.stringify(sorted(hashFacts))).digest("hex");
  return course;
}
