import { createHash } from "node:crypto";
import { t } from "elysia";
import { Value } from "@sinclair/typebox/value";
import type { CourseIngestion } from "@dorob/core";
import { minimal, rich } from "./ingestion-examples";
import { CatalogError } from "./catalog";

const obj = <T extends Record<string, import("@sinclair/typebox").TSchema>>(properties: T) => t.Object(properties, { additionalProperties: false });
const text = (maxLength = 20000) => t.String({ maxLength });
const nonblank = (maxLength = 20000) => t.String({ minLength: 1, maxLength, pattern: "\\S" });
const nullable = <T extends import("@sinclair/typebox").TSchema>(schema: T) => t.Union([schema, t.Null()]);
const list = <T extends import("@sinclair/typebox").TSchema>(schema: T) => t.Array(schema, { maxItems: 2000 });
const choice = (...values: string[]) => t.Union(values.map(value => t.Literal(value)));
const count = nullable(t.Integer({ minimum: 0, maximum: 2147483647 }));
const amount = nullable(t.Number({ minimum: 0, maximum: 1e15 }));
const date = text(40);
const url = nonblank(2048);
const rating = nullable(obj({ value: t.Number({ minimum: 0 }), scale: t.Number({ exclusiveMinimum: 0 }) }));
const coverage = obj({ status: choice("complete", "partial", "unknown", "failed"), reason: nullable(nonblank(2000)) });
const section = <T extends import("@sinclair/typebox").TSchema>(data: T) => obj({ coverage, data: nullable(data) });
const offer = obj({ id: nonblank(200), type: choice("full", "content", "subscription", "free", "other"), label: nullable(text()), amount, originalAmount: amount,
  unit: t.Literal("toman"), status: choice("free", "paid", "subscription", "unknown"), billingPeriod: nullable(choice("monthly", "yearly", "other")),
  certificateIncluded: nullable(t.Boolean()), accessDescription: nullable(text()), supportDescription: nullable(text()),
  sourcePrice: obj({ amount, originalAmount: amount, unit: choice("toman", "rial", "unknown"), label: nullable(text()) }) });
const lesson = obj({ id: nullable(text(200)), order: t.Integer({ minimum: 1 }), title: nonblank(), description: nullable(text()),
  type: choice("video", "text", "exercise", "quiz", "project", "live", "other", "unknown"), providerType: nullable(text()), contentMinutes: amount });
const review = obj({ id: nonblank(200), sourceType: choice("review", "comment"), text: nonblank(), rating,
  publishedAt: nullable(date), publishedDateText: nullable(text()), verifiedEnrollment: nullable(t.Boolean()), sourceUrl: url, sourceLocator: nonblank(), redacted: t.Boolean() });
const nestedCoverage = choice("complete", "partial", "unknown");
export const ingestionSchema = obj({
  schemaVersion: t.Literal(3), submissionId: nonblank(200),
  providerId: t.String({ minLength: 1, maxLength: 64, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }), providerCourseId: nonblank(200), title: nonblank(300), sourceUrl: url,
  source: obj({ checkedAt: date, extractor: nonblank(200), extractorVersion: nonblank(100),
    method: choice("public-html", "public-html-and-embedded-data", "public-html-and-public-api", "public-api", "browser-rendered-html"),
    fieldSources: t.Record(nonblank(300), nonblank(2000), { maxProperties: 4000 }), warnings: list(text(2000)) }),
  pricing: section(list(offer)),
  thumbnail: section(t.Union([obj({ kind: t.Literal("url"), url, alt: text(1000) }), obj({ kind: t.Literal("upload"), uploadId: t.String({ pattern: "^[a-f0-9]{64}$" }), alt: text(1000) })])),
  description: t.Optional(section(text())),
  education: t.Optional(section(obj({ learningOutcomes: nullable(list(nonblank())), prerequisites: nullable(text()), intendedAudience: nullable(text()),
    technologies: nullable(list(obj({ name: nonblank(300), version: nullable(text(300)) }))),
    learningSupport: obj({ practiceDescription: nullable(text()), assessmentDescription: nullable(text()), supportDescription: nullable(text()) }),
    duration: obj({ contentMinutes: amount, effortHours: amount, completionWindowDays: amount }) }))),
  classification: t.Optional(section(obj({ language: nullable(text(200)), format: nullable(choice("recorded-video", "interactive", "live", "blended", "other")), providerCategories: nullable(list(nonblank(300))), providerLevel: nullable(text(300)) }))),
  instructors: t.Optional(section(list(obj({ name: nonblank(300), role: nullable(text(300)) })))),
  curriculum: t.Optional(section(obj({ syllabus: nullable(list(obj({ id: nullable(text(200)), order: t.Integer({ minimum: 1 }), title: nonblank(), description: nullable(text()), lessons: nullable(list(lesson)) }))),
    syllabusCoverage: obj({ status: nestedCoverage, publishedLessonCount: count, extractedLessonCount: count, reasons: list(nonblank(2000)) }), lessonCount: count }))),
  feedback: t.Optional(section(obj({ reviews: obj({ items: nullable(list(review)), collection: obj({ status: nestedCoverage, publishedCount: count, collectedCount: count, selection: nullable(text()), pagesRead: t.Integer({ minimum: 0 }), hasMore: nullable(t.Boolean()), omittedCount: t.Integer({ minimum: 0 }), stopReason: nullable(text()) }) }),
    rating: nullable(obj({ value: t.Number({ minimum: 0 }), scale: t.Number({ exclusiveMinimum: 0 }), count })), studentCount: count }))),
  providerState: t.Optional(section(obj({ availability: choice("available", "unavailable", "unknown"), providerStatus: nullable(text()), ongoing: nullable(t.Boolean()), providerUpdatedAt: nullable(date) }))),
  features: t.Optional(section(list(obj({ label: nonblank(2000), value: text() })))),
  raw: t.Optional(section(t.Record(nonblank(200), t.Unknown(), { maxProperties: 100 }))),
  providerData: t.Optional(section(t.Record(t.String({ pattern: "^[a-z0-9]+(?:[.-][a-z0-9]+)+$", maxLength: 100 }), t.Record(text(200), t.Unknown(), { maxProperties: 100 }), { maxProperties: 20 }))),
});

ingestionSchema.examples = [minimal(), rich()];

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export const requestHash = (value: CourseIngestion) => hash(value);
export function factHash(value: CourseIngestion): string {
  const facts = Object.fromEntries(Object.entries(value).filter(([key]) => !["submissionId", "source", "raw"].includes(key)));
  return hash(facts);
}
function requireFact(condition: unknown): asserts condition { if (!condition) throw new CatalogError(422); }
function https(value: string) {
  let url: URL; try { url = new URL(value); } catch { throw new CatalogError(422); }
  requireFact(url.protocol === "https:" && !url.username && !url.password);
}
function validDate(value: string) { requireFact(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value))); }
function safeEvidence(value: unknown, depth = 0) {
  requireFact(depth <= 8);
  if (typeof value === "string") requireFact(value.length <= 20000 && !/<\/?(?:html|script|iframe|body)\b/i.test(value) && !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value));
  else if (Array.isArray(value)) { requireFact(value.length <= 2000); for (const item of value) safeEvidence(item, depth + 1); }
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) {
    requireFact(!/(?:author|avatar|email|phone|password|secret|credential|cookie|authorization|profileUrl)/i.test(key)); safeEvidence(item, depth + 1);
  }
  else requireFact(value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)));
}

/** Strict JSON boundary; evidence is accountable, never evidence of inferred completeness. */
export function validateIngestion(input: unknown): CourseIngestion {
  let bytes: number;
  try { bytes = Buffer.byteLength(JSON.stringify(input)); } catch { throw new CatalogError(422); }
  requireFact(bytes <= 1024 * 1024 && Value.Check(ingestionSchema, input));
  const value = input as CourseIngestion;
  for (const key of ["providerCourseId", "title", "submissionId"] as const) requireFact(value[key] === value[key].trim());
  https(value.sourceUrl); validDate(value.source.checkedAt);
  const evidence = value.source.fieldSources;
  for (const key of ["title", "sourceUrl", "providerId", "providerCourseId"]) requireFact(evidence[key]);
  const sectionNames = ["pricing", "thumbnail", "description", "education", "classification", "instructors", "curriculum", "feedback", "providerState", "features", "raw", "providerData"] as const;
  for (const name of sectionNames) {
    const section = value[name]; if (!section) continue;
    const { status, reason } = section.coverage;
    if (status !== "complete") requireFact(reason);
    if (status === "failed") requireFact(section.data === null);
    if (status === "complete") requireFact(section.data !== null && Object.keys(evidence).some(path => path === `${name}.data` || path.startsWith(`${name}.data.`)));
    if (section.data === null) requireFact(reason && status !== "complete");
    const visit = (item: unknown, path: string) => {
      if (path.includes(".syllabusCoverage.") || path.includes(".reviews.collection.")) return;
      if (Array.isArray(item)) {
        if (item.length === 0) requireFact(evidence[path]);
        item.forEach((child, index) => visit(child, `${path}.${index}`));
      } else if (item && typeof item === "object") for (const [key, child] of Object.entries(item)) visit(child, `${path}.${key}`);
    };
    visit(section.data, `${name}.data`);
  }
  const offers = value.pricing.data ?? [];
  requireFact(new Set(offers.map(offer => offer.id)).size === offers.length);
  for (const [index, offer] of offers.entries()) {
    requireFact(offer.amount !== 0 || offer.status === "free");
    requireFact(offer.status !== "free" || (offer.amount === 0 && (evidence[`pricing.data.${index}.status`] || evidence[`pricing.data.${index}`])));
    requireFact(offer.status !== "paid" || (offer.amount !== null && offer.amount > 0));
    requireFact(offer.sourcePrice.unit !== "unknown" || offer.amount === null || offer.amount === 0);
    requireFact(offer.originalAmount === null || offer.amount === null || offer.originalAmount > offer.amount);
  }
  if (value.thumbnail.data?.kind === "url") https(value.thumbnail.data.url);
  const curriculum = value.curriculum?.data;
  if (curriculum) {
    const syllabus = curriculum.syllabus;
    const extracted = syllabus === null || (syllabus.length > 0 && syllabus.every(chapter => chapter.lessons === null)) ? null : syllabus.reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0);
    requireFact(curriculum.syllabusCoverage.extractedLessonCount === extracted);
    if (curriculum.syllabusCoverage.status === "complete") requireFact(syllabus !== null && syllabus.every(chapter => chapter.lessons !== null) && curriculum.syllabusCoverage.reasons.length && (curriculum.syllabusCoverage.publishedLessonCount === null || curriculum.syllabusCoverage.publishedLessonCount === extracted));
    for (const [i, chapter] of (syllabus ?? []).entries()) {
      requireFact(chapter.order === i + 1);
      for (const [j, lesson] of (chapter.lessons ?? []).entries()) requireFact(lesson.order === j + 1);
    }
  }
  const feedback = value.feedback?.data;
  if (feedback) {
    const { items, collection } = feedback.reviews;
    requireFact(collection.collectedCount === (items === null ? null : items.length));
    requireFact(collection.publishedCount === null || collection.collectedCount === null || collection.collectedCount <= collection.publishedCount);
    if (collection.status === "complete") requireFact(items !== null && collection.hasMore === false && collection.omittedCount === 0 && (collection.publishedCount === null || collection.publishedCount === items.length));
    requireFact(new Set((items ?? []).map(item => item.id)).size === (items ?? []).length);
    for (const item of items ?? []) {
      https(item.sourceUrl); if (item.publishedAt) validDate(item.publishedAt);
      requireFact(!/(?:https?:\/\/|www\.)\S+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|@[\p{L}\p{N}_.-]+|(?:[+＋]?[0-9۰-۹٠-٩][\s().-]*){10,15}/iu.test(item.text));
      if (item.rating) requireFact(item.rating.value <= item.rating.scale);
    }
    if (feedback.rating) requireFact(feedback.rating.value <= feedback.rating.scale);
  }
  if (value.providerState?.data?.providerUpdatedAt) validDate(value.providerState.data.providerUpdatedAt);
  for (const section of [value.raw, value.providerData]) if (section?.data) {
    requireFact(Buffer.byteLength(JSON.stringify(section.data)) <= 64 * 1024); safeEvidence(section.data);
  }
  return structuredClone(value);
}
