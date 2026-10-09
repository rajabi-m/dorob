import { z } from "zod";
import type { PublicGroup } from "./index.ts";
const text = z.string().max(4000);
const id = z.string().min(1).max(300);
const amount = z.number().finite().nonnegative().nullable();
const texts = z.array(text).max(100);
const sourcePrice = z.strictObject({ amount, originalAmount: amount, unit: z.enum(["toman", "rial", "unknown"]), label: text.nullable() });
export const publicOfferSchema = z.strictObject({ id, status: z.enum(["free", "paid", "subscription", "unknown"]), amount,
  unit: z.literal("toman"), accessDescription: text.nullable(), type: text, label: text.nullable(), originalAmount: amount,
  sourcePrice, billingPeriod: z.enum(["monthly", "yearly", "other"]).nullable(), certificateIncluded: z.boolean().nullable() });
const priceOffer = publicOfferSchema.extend({ status: text, horizon: text, comparableKey: text.nullable() });
const assessment = z.strictObject({ courseId: id, revisionId: id, status: z.enum(["assessed", "insufficient-evidence", "needs-review"]),
  coverage: z.array(z.strictObject({ rubricId: id, status: z.enum(["advertised", "not-listed", "unknown"]), evidenceIds: texts })).max(30),
  claims: z.array(z.strictObject({ textFa: text, dimension: text, basis: z.enum(["provider-fact", "ai-inference"]), kind: z.enum(["coverage", "tradeoff"]), evidenceIds: texts,
    quotes: z.array(z.strictObject({ evidenceId: id, quote: text })).max(100) })).max(100), evidenceLimitationsFa: texts });
export const publicGroupSchema: z.ZodType<PublicGroup> = z.strictObject({ schemaVersion: z.literal(1), kind: z.literal("source-facts"), groupId: id,
  definitionRevision: z.number().int().positive(), title: text, topic: text, targetLevel: z.enum(["beginner", "intermediate", "advanced", "multi-level"]).nullable(), criteria: text,
  courses: z.array(z.strictObject({ id, revisionId: id, providerId: id, title: text,
    sourceUrl: z.url().refine(value => { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; }),
    lastSuccessfulCheck: z.iso.datetime(), availability: z.enum(["available", "unavailable", "unknown"]), providerLevel: text.nullable(), durationMinutes: amount,
    offers: z.array(publicOfferSchema).max(100).nullable(), syllabusCoverage: z.enum(["complete", "partial", "unknown"]), warnings: texts })).min(2).max(10000),
  analysis: z.strictObject({ analysisId: id, policyVersion: id, promptVersion: id, taxonomyVersion: id, definitionId: id,
    priceComparisons: z.array(z.strictObject({ leftCourseId: id, leftOfferId: id, rightCourseId: id, rightOfferId: id, difference: z.number().finite(), unit: z.literal("toman"), horizon: text, qualificationFa: text })).max(10000),
    priceAccess: z.array(z.strictObject({ courseId: id, offers: z.array(priceOffer).max(100).nullable() })).max(10000), ranking: z.literal("disabled"), badges: z.array(z.never()).max(0),
    candidates: z.array(z.strictObject({ courseId: id, revisionId: id, status: text, assessment: assessment.nullable() })).max(10000), limitationsFa: texts }).nullable(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), generatedAt: z.iso.datetime(), stale: z.boolean(),
  analysisState: z.enum(["approved", "partial", "stale", "none"]),
}).refine(group => !(group.stale && group.analysis) && (group.analysis === null) === ["stale", "none"].includes(group.analysisState), "Analysis state differs");
