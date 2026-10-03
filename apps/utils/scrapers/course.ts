import { createHash } from "node:crypto";

export type CourseMethod = "public-html" | "public-html-and-embedded-data" | "public-api" | "browser-rendered-html";
export type ProviderCourse = {
  schemaVersion: 1;
  id: string; providerId: string; providerCourseId: string; sourceUrl: string; title: string;
  description: string | null; learningOutcomes: string[] | null; prerequisites: string | null;
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
    sourcePrice: { amount: number | null; originalAmount: number | null; unit: "toman" | "rial" | "unknown"; label: string | null };
  }[] | null;
  duration: { contentMinutes: number | null; effortHours: number | null; completionWindowDays: number | null };
  syllabus: {
    id: string | null; order: number; title: string;
    lessons: {
      id: string | null; order: number; title: string;
      type: "video" | "text" | "exercise" | "quiz" | "project" | "live" | "other" | "unknown";
      providerType: string | null; contentMinutes: number | null;
    }[] | null;
  }[] | null;
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
    schemaVersion: 1, id: `${providerId}:${providerCourseId}`, providerId, providerCourseId, title, sourceUrl,
    description: null, learningOutcomes: null, prerequisites: null, image: null, language: null, format: null,
    instructors: null, providerCategories: null, providerLevel: null, offers: null,
    duration: { contentMinutes: null, effortHours: null, completionWindowDays: null }, syllabus: null,
    availability: "unknown", providerStatus: null, ongoing: null, providerUpdatedAt: null,
    rating: null, studentCount: null, lessonCount: null, features: null,
    source: { checkedAt, parser: providerId, parserVersion: "1.0.0", method, contentHash: "", fieldSources: {}, warnings: [] },
    raw: {}, derived: null,
  };
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
  if (course.id !== `${course.providerId}:${course.providerCourseId}` || course.schemaVersion !== 1 || course.derived !== null) throw new Error("Invalid course identity or schema");
  assertHttps(course.sourceUrl);
  if (course.image) assertHttps(course.image.url);
  if (!Number.isFinite(Date.parse(course.source.checkedAt)) || !course.source.parser.trim() || !course.source.parserVersion.trim()) throw new Error("Invalid source metadata");
  if (!["public-html", "public-html-and-embedded-data", "public-api", "browser-rendered-html"].includes(course.source.method)) throw new Error("Invalid source method");
  if (["contentMinutes", "effortHours", "completionWindowDays"].some(key => !Object.hasOwn(course.duration, key))) throw new Error("Incomplete duration structure");
  const nonnegative = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0);
  for (const value of Object.values(course.duration)) if (!nonnegative(value)) throw new Error("Invalid duration");
  for (const value of [course.studentCount, course.lessonCount, course.rating?.count ?? null]) if (!nonnegative(value) || (value !== null && !Number.isInteger(value))) throw new Error("Invalid count");
  if (course.rating && (!nonnegative(course.rating.value) || course.rating.scale <= 0 || !Number.isFinite(course.rating.scale) || course.rating.value > course.rating.scale)) throw new Error("Invalid rating");
  const offerIds = new Set<string>();
  for (const offer of course.offers ?? []) {
    if (!offer.id || offerIds.has(offer.id)) throw new Error("Invalid or duplicate offer ID");
    offerIds.add(offer.id);
    for (const amount of [offer.amount, offer.originalAmount, offer.sourcePrice.amount, offer.sourcePrice.originalAmount]) if (!nonnegative(amount)) throw new Error("Invalid price");
    if (offer.amount !== null && offer.originalAmount !== null && offer.originalAmount <= offer.amount) throw new Error("Invalid discount");
    if (offer.status === "free" && offer.amount !== 0) throw new Error("Free offer requires zero amount");
    if (offer.amount === 0 && offer.status !== "free") throw new Error("Zero price requires explicit free status");
    if (offer.status === "paid" && (offer.amount === null || offer.amount <= 0)) throw new Error("Paid offer requires positive price");
    if (offer.sourcePrice.unit === "unknown" && offer.amount !== null && offer.amount !== 0) throw new Error("Unknown currency cannot produce a normalized price");
  }
  for (const [i, chapter] of (course.syllabus ?? []).entries()) {
    if (chapter.order !== i + 1 || !chapter.title.trim()) throw new Error("Invalid chapter order or title");
    for (const [j, lesson] of (chapter.lessons ?? []).entries()) {
      if (lesson.order !== j + 1 || !lesson.title.trim() || !nonnegative(lesson.contentMinutes)) throw new Error("Invalid lesson");
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
  const hashFacts = { ...facts, image: course.image ? { ...course.image, url: imageUrl!.href } : null };
  course.source.contentHash = createHash("sha256").update(JSON.stringify(sorted(hashFacts))).digest("hex");
  return course;
}
