import { z } from "zod";

export const levelSchema = z.enum(["beginner", "intermediate", "advanced", "multi-level"]);
export const groupDefinitionSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: z.string().trim().min(1).max(200),
  topic: z.string().trim().min(1).max(200),
  targetLevel: levelSchema.nullable(),
  criteria: z.string().trim().min(1).max(4000),
});
export type GroupDefinition = z.infer<typeof groupDefinitionSchema>;

// Explicit public projection: no source HTML, feedback identities or model payloads.
export type PublicCourse = {
  id: string;
  revisionId: string;
  providerId: string;
  title: string;
  sourceUrl: string;
  lastSuccessfulCheck: string;
  availability: "available" | "unavailable" | "unknown";
  providerLevel: string | null;
  durationMinutes: number | null;
  offers: { id: string; status: "free" | "paid" | "subscription" | "unknown";
    amount: number | null; unit: "toman"; accessDescription: string | null;
    type: string; label: string | null; originalAmount: number | null;
    sourcePrice: { amount: number | null; originalAmount: number | null; unit: "toman" | "rial" | "unknown"; label: string | null };
    billingPeriod: "monthly" | "yearly" | "other" | null; certificateIncluded: boolean | null }[] | null;
  syllabusCoverage: "complete" | "partial" | "unknown";
  warnings: string[];
};
export type GroupSnapshot = {
  schemaVersion: 1;
  kind: "source-facts";
  groupId: string;
  definitionRevision: number;
  title: string;
  topic: string;
  targetLevel: z.infer<typeof levelSchema> | null;
  criteria: string;
  courses: PublicCourse[];
  analysis: null | {
    analysisId: string; policyVersion: string; promptVersion: string; taxonomyVersion: string; definitionId: string;
    priceComparisons: { leftCourseId: string; leftOfferId: string; rightCourseId: string; rightOfferId: string;
      difference: number; unit: "toman"; horizon: string; qualificationFa: string }[];
    priceAccess: { courseId: string; offers: { id: string; label: string | null; originalAmount: number | null; type: string; status: string; amount: number | null; unit: "toman";
      sourcePrice: { amount: number | null; originalAmount: number | null; unit: "toman" | "rial" | "unknown"; label: string | null };
      billingPeriod: "monthly" | "yearly" | "other" | null; horizon: string; accessDescription: string | null;
      certificateIncluded: boolean | null; comparableKey: string | null }[] | null }[];
    ranking: "disabled"; badges: never[];
    candidates: { courseId: string; revisionId: string; status: string; assessment: {
      courseId: string; revisionId: string; status: "assessed" | "insufficient-evidence" | "needs-review";
      coverage: { rubricId: string; status: "advertised" | "not-listed" | "unknown"; evidenceIds: string[] }[];
      claims: { textFa: string; dimension: string; basis: "provider-fact" | "ai-inference"; kind: "coverage" | "tradeoff";
        evidenceIds: string[]; quotes: { evidenceId: string; quote: string }[] }[];
      evidenceLimitationsFa: string[];
    } | null }[];
    limitationsFa: string[];
  };
};
export type PublicGroup = GroupSnapshot & { slug: string; generatedAt: string; stale: boolean; analysisState: "approved" | "partial" | "stale" | "none" };

export const jobSchema = z.strictObject({
  version: z.literal(1),
  workflowRunId: z.uuid(),
  groupId: z.uuid(),
});
export type GroupJob = z.infer<typeof jobSchema>;

export * from "./discovery";
export * from "./public-validation";
