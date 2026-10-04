import { z } from "zod";
import type { ProviderCourse } from "@dorob/utils/course";
import { evidenceBundle, BUNDLE_VERSION } from "./placement-contracts.ts";

export const GROUP_PROMPT = "group-evidence-fa-v1";
export const GROUP_POLICY = "unranked-operator-v1";
export const fa = z.string().trim().min(1).max(2000).regex(/[\u0600-\u06ff]/)
  .refine(text => !/https?:\/\/|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:[0-9۰-۹][\s().-]*){10,15}|<\/?[a-z]|ignore previous|نادیده.*دستور/iu.test(text), "Unsafe generated text");
const safeExcerpt = z.string().min(1).max(1500).refine(text => !/ignore (?:all|previous)|reveal.*(?:secret|key)|نادیده.*دستور|دستور.*نادیده|<script/iu.test(text), "Unsafe source instructions");
const refs = z.array(z.string().min(1).max(200)).min(1).max(20);
export const rubricSchema = z.array(z.strictObject({ id: z.string().regex(/^[a-z][a-z0-9-]*$/).max(60), titleFa: fa, criterionFa: fa })).min(1).max(12)
  .refine(items => new Set(items.map(x => x.id)).size === items.length);
export const draftSchema = z.strictObject({ titleFa: fa.max(200), topicId: z.string().min(1).max(100), targetLearnerFa: fa,
  outcomesFa: z.array(fa).min(1).max(12), scopeFa: fa, prerequisitesFa: fa,
  level: z.enum(["unknown", "beginner", "intermediate", "advanced", "multi-level"]), rubric: rubricSchema,
  evidenceIds: refs, limitationsFa: z.array(fa).min(1).max(12) });
export type Draft = z.infer<typeof draftSchema>;
// There are deliberately no scores, winner, rank or badge fields in the accepted schema.
export const claimSchema = z.strictObject({ textFa: fa, dimension: z.string().min(1).max(60),
  basis: z.enum(["provider-fact", "ai-inference"]), kind: z.enum(["coverage", "tradeoff"]), evidenceIds: refs,
  // Exact supporting excerpts let validation reject fabricated quotations; entailment remains a human review.
  quotes: z.array(z.strictObject({ evidenceId: z.string(), quote: safeExcerpt })).min(1).max(20) });
export const assessmentSchema = z.strictObject({ courseId: z.string().min(1), revisionId: z.uuid(),
  status: z.enum(["assessed", "insufficient-evidence", "needs-review"]),
  coverage: z.array(z.strictObject({ rubricId: z.string(), status: z.enum(["advertised", "not-listed", "unknown"]), evidenceIds: z.array(z.string()).max(20) })).min(1).max(12),
  claims: z.array(claimSchema).max(12), evidenceLimitationsFa: z.array(fa).min(1).max(12) });
export type Assessment = z.infer<typeof assessmentSchema>;
export function curatedEvidence(courseId: string, revisionId: string, facts: ProviderCourse) {
  const base = evidenceBundle(facts, revisionId);
  // Feedback is deliberately omitted in v1: names in free text cannot be reliably removed by schema validation.
  const extra = ["learningSupport", "duration", "offers"] as const;
  const evidence = [...base.evidence, ...extra.filter(path => facts[path] !== null).map(path => ({ id: `${revisionId}:${path}`, path,
    value: facts[path], sourceUrl: facts.sourceUrl, locator: facts.source.fieldSources[path] ?? path }))]
    .map(item => ({ ...item, courseId, revisionId, checkedAt: facts.source.checkedAt }));
  if (Buffer.byteLength(JSON.stringify(evidence)) > 40000) throw new Error("Evidence too large; no silent truncation");
  return { courseId, revisionId, evidence, coverage: base.coverage,
    omissions: ["feedback-excluded-v1", "raw-html-excluded", "ratings-popularity-identities-excluded"], version: BUNDLE_VERSION };
}
export type Evidence = ReturnType<typeof curatedEvidence>;
export function validateRefs(ids: string[], bundles: Evidence[], courseId?: string) {
  const index = bundles.flatMap(b => b.evidence);
  if (new Set(ids).size !== ids.length || ids.some(id => !index.some(e => e.id === id && (!courseId || e.courseId === courseId)))) throw new Error("Invalid retained evidence reference");
}
export function validateDraft(input: unknown, bundles: Evidence[], topicIds: string[]) {
  const draft = draftSchema.parse(input); validateRefs(draft.evidenceIds, bundles);
  if (!topicIds.includes(draft.topicId)) throw new Error("Topic outside retained taxonomy");
  if (draft.level !== "unknown" && bundles.every(b => !b.coverage.level)) throw new Error("Level requires retained evidence");
  return draft;
}
export function validateAssessment(input: unknown, bundle: Evidence, draft: Draft) {
  const result = assessmentSchema.parse(input);
  if (result.courseId !== bundle.courseId || result.revisionId !== bundle.revisionId) throw new Error("Candidate revision differs");
  if (result.coverage.map(c => c.rubricId).sort().join() !== draft.rubric.map(r => r.id).sort().join()) throw new Error("Every rubric criterion must be accounted for");
  for (const coverage of result.coverage) {
    validateRefs(coverage.evidenceIds, [bundle]);
    if (coverage.status !== "unknown" && !coverage.evidenceIds.length) throw new Error("Coverage needs evidence");
    if (coverage.status === "not-listed" && (bundle.coverage.syllabus !== "complete" || !coverage.evidenceIds.includes(`${bundle.revisionId}:syllabus`))) throw new Error("Absence requires complete published syllabus");
  }
  for (const claim of result.claims) {
    if (!draft.rubric.some(r => r.id === claim.dimension)) throw new Error("Claim outside rubric");
    validateRefs(claim.evidenceIds, [bundle], bundle.courseId);
    if (claim.quotes.map(q => q.evidenceId).sort().join() !== [...claim.evidenceIds].sort().join()) throw new Error("Every reference needs an exact excerpt");
    for (const quote of claim.quotes) {
      const evidence = bundle.evidence.find(e => e.id === quote.evidenceId)!;
      const strings = (v: unknown): string[] => typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
      if (!strings(evidence.value).some(v => v.includes(quote.quote))) throw new Error("Quotation does not resolve to retained field");
    }
    // High-risk conclusions are excluded from this uncalibrated policy, even if the provider advertises them.
    if (/کیفیت|تضمین|اشتغال|بازار\s*کار|محبوب|شهرت|بهترین|برنده|شروع از صفر/.test(claim.textFa)) throw new Error("Unsupported policy dimension");
  }
  if (result.status === "insufficient-evidence" && result.claims.length) throw new Error("Insufficient evidence cannot yield assessment claims");
  return result;
}
export function priceAccess(bundles: { courseId: string; facts: ProviderCourse }[]) {
  // No currency conversion guesses, subscription multiplication, conditional discounts or economic ranking.
  return bundles.map(({ courseId, facts }) => ({ courseId, offers: facts.offers?.map(o => ({ id: o.id, label: o.label, originalAmount: o.originalAmount, type: o.type, status: o.status,
    amount: o.amount, unit: o.unit, sourcePrice: o.sourcePrice, billingPeriod: o.billingPeriod,
    horizon: o.status === "subscription" ? o.billingPeriod ?? "unknown" : "one-time-price-access-unspecified",
    accessDescription: o.accessDescription, certificateIncluded: o.certificateIncluded,
    comparableKey: o.amount === null || o.sourcePrice.unit === "unknown" || o.type === "other" || o.status === "unknown" ? null : `${o.type}:${o.unit}:${o.billingPeriod ?? "one-time"}` })) ?? null }));
}

export function priceComparisons(bundles: { courseId: string; facts: ProviderCourse }[]) {
  const prices = priceAccess(bundles);
  const result: { leftCourseId: string; leftOfferId: string; rightCourseId: string; rightOfferId: string;
    difference: number; unit: "toman"; horizon: string; qualificationFa: string }[] = [];
  for (let i = 0; i < prices.length; i++) for (let j = i + 1; j < prices.length; j++) {
    for (const left of prices[i].offers ?? []) for (const right of prices[j].offers ?? []) {
      if (!left.comparableKey || left.comparableKey !== right.comparableKey || left.amount === null || right.amount === null || left.horizon !== right.horizon ||
        left.status === "subscription" && !["monthly", "yearly"].includes(left.billingPeriod ?? "")) continue;
      result.push({ leftCourseId: prices[i].courseId, leftOfferId: left.id, rightCourseId: prices[j].courseId, rightOfferId: right.id,
        difference: left.amount - right.amount, unit: "toman", horizon: left.horizon,
        qualificationFa: "اختلاف مبلغ منتشرشده برای نوع خرید و بازه یکسان؛ برابری محتوا یا شرایط دسترسی تأیید نشده است." });
      if (result.length > 500) throw new Error("Price comparison bound exceeded");
    }
  }
  return result;
}
