import { createHash } from "node:crypto";
import type { CourseIngestion, CourseReview, Section } from "../../../packages/core/src/ingestion";
import { validateIngestion } from "../../api/src/ingestion-validation";

export type SectionData<K extends keyof CourseIngestion> = NonNullable<CourseIngestion[K]> extends Section<infer T> ? T : never;
export type Offers = SectionData<"pricing">;
export type Education = SectionData<"education">;
export type Curriculum = SectionData<"curriculum">;
export type Feedback = SectionData<"feedback">;
export type FeedbackSettings = { feedbackPages: number; feedbackItems: number };
export const defaultFeedbackSettings: FeedbackSettings = { feedbackPages: 10, feedbackItems: 500 };
export function feedbackSettings(input: Partial<FeedbackSettings> = {}): FeedbackSettings {
  const value = { feedbackPages: input.feedbackPages === undefined ? defaultFeedbackSettings.feedbackPages : input.feedbackPages,
    feedbackItems: input.feedbackItems === undefined ? defaultFeedbackSettings.feedbackItems : input.feedbackItems };
  if (!Number.isSafeInteger(value.feedbackPages) || value.feedbackPages < 1 ||
      !Number.isSafeInteger(value.feedbackItems) || value.feedbackItems < 1 || value.feedbackItems > 2000) throw new Error("Invalid feedback bounds");
  return value;
}
export function section<T>(data: T | null, status: Section<T>["coverage"]["status"] = "unknown", reason: string | null = "Public source completeness unverified"): Section<T> {
  return { data, coverage: { status, reason } };
}
/** Accept only native sections; no legacy course construction or conversion. */
export function nativeObservation(input: Omit<CourseIngestion, "schemaVersion">): CourseIngestion {
  return validateIngestion({ schemaVersion: 3, ...input });
}
/** Evidence for a populated subtree, retaining precise locators supplied by parsers. */
export function evidenceTree(value: unknown, path: string, locator: string, evidence: Record<string, string>): void {
  if (value === null || value === undefined) return;
  evidence[path] ??= locator;
  if (Object.keys(evidence).length > 4000) throw new Error("Field evidence bound exceeded");
  if (Array.isArray(value)) value.forEach((child, index) => evidenceTree(child, `${path}.${index}`, `${locator}[${index}]`, evidence));
  else if (typeof value === "object") for (const [key, child] of Object.entries(value)) evidenceTree(child, `${path}.${key}`, `${locator}.${key}`, evidence);
}
export function anonymizeReviewText(input: string, authorNames: string[] = []): { text: string; redacted: boolean } {
  let text = input;
  for (const name of authorNames.filter(name => name.trim().length > 1).sort((a, b) => b.length - a.length)) text = text.split(name).join("[حذف مشخصات]");
  text = text.replace(/(?:https?:\/\/|www\.)[^\s<>]+/giu, "[حذف پیوند]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "[حذف ایمیل]")
    .replace(/@[\p{L}\p{N}_.-]+/gu, "[حذف شناسه]")
    .replace(/(?:[+＋]?[0-9۰-۹٠-٩][\s().-]*){10,15}/gu, "[حذف شماره]");
  return { text: text.trim(), redacted: text !== input };
}
export function reviewContentId(text: string, date: string | null, rating: CourseReview["rating"]): string {
  return createHash("sha256").update(JSON.stringify([text, date, rating])).digest("hex");
}
/** Providers own source decoding and evidenced next-page requests. Embedded pages count too. */
export class FeedbackAccumulator {
  private readonly ids = new Set<string>();
  private readonly items: CourseReview[] = [];
  private pages = 0;
  private omitted = 0;
  private more: boolean | null = null;
  private stop: string | null = null;
  readonly settings: FeedbackSettings;
  constructor(settings: FeedbackSettings = feedbackSettings()) { this.settings = feedbackSettings(settings); }
  canRead(): boolean { return this.pages < this.settings.feedbackPages && this.items.length < this.settings.feedbackItems && !this.stop; }
  addPage(items: CourseReview[], hasMore: boolean | null, excluded = 0): void {
    if (!this.canRead()) throw new Error("Feedback bound reached");
    this.pages++; this.more = hasMore; this.omitted += excluded;
    for (const item of items) {
      if (this.ids.has(item.id)) continue;
      this.ids.add(item.id);
      if (this.items.length >= this.settings.feedbackItems) { this.omitted++; this.stop = "item-limit"; continue; }
      const anonymous = anonymizeReviewText(item.text);
      this.items.push({ ...item, ...anonymous, redacted: item.redacted || anonymous.redacted });
    }
    if (!this.stop && hasMore !== false && this.items.length >= this.settings.feedbackItems) this.stop = "item-limit";
    if (!this.stop && hasMore !== false && this.pages >= this.settings.feedbackPages) this.stop = "page-limit";
  }
  fail(reason: string): void { this.stop = reason; }
  result(publishedCount: number | null = null): Feedback["reviews"] {
    const complete = this.pages > 0 && this.more === false && this.omitted === 0 && !this.stop && (publishedCount === null || publishedCount === this.items.length);
    return { items: this.pages ? [...this.items] : null, collection: {
      status: complete ? "complete" : this.pages ? "partial" : "unknown", publishedCount,
      collectedCount: this.pages ? this.items.length : null, selection: "public source order; bounded pages/items",
      pagesRead: this.pages, hasMore: this.more, omittedCount: this.omitted,
      stopReason: complete ? null : this.stop ?? (this.omitted ? "excluded-items" : "source-exhaustion-unverified"),
    } };
  }
}
