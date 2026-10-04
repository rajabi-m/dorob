import { z } from "zod";
import { finalizeCourse, type ProviderCourse } from "@dorob/utils/course";

const text = z.string();
const nullableText = text.nullable();
const count = z.number().int().nonnegative().nullable();
const amount = z.number().nonnegative().nullable();
const https = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
});
const date = z.iso.datetime({ offset: true });
const rating = z.strictObject({ value: z.number().nonnegative(), scale: z.number().positive(), count }).nullable();
const coverage = z.enum(["complete", "partial", "unknown"]);

// Validate every retained field before using the adapters' semantic validation/hash.
const courseSchema = z.strictObject({
  schemaVersion: z.literal(2), id: text.min(1), providerId: text.regex(/^[a-z][a-z0-9-]*$/),
  providerCourseId: text.min(1), sourceUrl: https, title: text.trim().min(1),
  description: nullableText, learningOutcomes: z.array(text).nullable(), prerequisites: nullableText,
  intendedAudience: nullableText, technologies: z.array(z.strictObject({ name: text.min(1), version: nullableText })).nullable(),
  learningSupport: z.strictObject({ practiceDescription: nullableText, assessmentDescription: nullableText, supportDescription: nullableText }),
  image: z.strictObject({ url: https, alt: text }).nullable(), language: nullableText,
  format: z.enum(["recorded-video", "interactive", "live", "blended", "other"]).nullable(),
  instructors: z.array(z.strictObject({ name: text, role: nullableText })).nullable(),
  providerCategories: z.array(text).nullable(), providerLevel: nullableText,
  offers: z.array(z.strictObject({
    id: text.min(1), type: z.enum(["full", "content", "subscription", "free", "other"]), label: nullableText,
    amount, originalAmount: amount, unit: z.literal("toman"), status: z.enum(["free", "paid", "subscription", "unknown"]),
    billingPeriod: z.enum(["monthly", "yearly", "other"]).nullable(), certificateIncluded: z.boolean().nullable(),
    accessDescription: nullableText, supportDescription: nullableText,
    sourcePrice: z.strictObject({ amount, originalAmount: amount, unit: z.enum(["toman", "rial", "unknown"]), label: nullableText }),
  })).nullable(),
  duration: z.strictObject({ contentMinutes: amount, effortHours: amount, completionWindowDays: amount }),
  syllabus: z.array(z.strictObject({ id: nullableText, order: z.number().int().positive(), title: text.min(1), description: nullableText,
    lessons: z.array(z.strictObject({ id: nullableText, order: z.number().int().positive(), title: text.min(1), description: nullableText,
      type: z.enum(["video", "text", "exercise", "quiz", "project", "live", "other", "unknown"]),
      providerType: nullableText, contentMinutes: amount })).nullable(),
  })).nullable(),
  syllabusCoverage: z.strictObject({ status: coverage, publishedLessonCount: count, extractedLessonCount: count, reasons: z.array(text) }),
  reviews: z.strictObject({
    items: z.array(z.strictObject({ id: text.min(1), sourceType: z.enum(["review", "comment"]), text: text.min(1),
      rating: z.strictObject({ value: z.number().nonnegative(), scale: z.number().positive() }).nullable(),
      publishedAt: date.nullable(), publishedDateText: nullableText, verifiedEnrollment: z.boolean().nullable(),
      sourceUrl: https, sourceLocator: text.min(1), redacted: z.boolean() })).nullable(),
    collection: z.strictObject({ status: coverage, publishedCount: count, collectedCount: count, selection: nullableText,
      pagesRead: z.number().int().nonnegative(), hasMore: z.boolean().nullable(), omittedCount: z.number().int().nonnegative(), stopReason: nullableText }),
  }),
  availability: z.enum(["available", "unavailable", "unknown"]), providerStatus: nullableText,
  ongoing: z.boolean().nullable(), providerUpdatedAt: date.nullable(), rating, studentCount: count, lessonCount: count,
  features: z.array(z.strictObject({ label: text, value: text })).nullable(),
  source: z.strictObject({ checkedAt: date, parser: text.min(1), parserVersion: text.min(1),
    method: z.enum(["public-html", "public-html-and-embedded-data", "public-html-and-public-api", "public-api", "browser-rendered-html"]),
    contentHash: text, fieldSources: z.record(text, text), warnings: z.array(text) }),
  raw: z.record(text, z.unknown()), derived: z.null(),
});

export function validateCourse(input: unknown): ProviderCourse {
  return finalizeCourse(courseSchema.parse(input));
}

const exportSchema = z.object({
  schemaVersion: z.literal(2), providerId: text.min(1), courses: z.array(z.unknown()).max(10000),
  errors: z.array(z.object({ sourceUrl: text, message: text, attemptedAt: date })).default([]),
});
export function validateExport(input: unknown) {
  const parsed = exportSchema.parse(input);
  const courses = parsed.courses.map(validateCourse);
  if (courses.some(course => course.providerId !== parsed.providerId)) throw new Error("Export contains a different provider");
  if (new Set(courses.map(course => course.id)).size !== courses.length) throw new Error("Export contains duplicate source identities");
  return { ...parsed, courses };
}
