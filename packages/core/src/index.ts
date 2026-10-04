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
    amount: number | null; unit: "toman"; accessDescription: string | null }[] | null;
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
  analysis: null;
};
export type PublicGroup = GroupSnapshot & { slug: string; generatedAt: string; stale: boolean };

export const jobSchema = z.strictObject({
  version: z.literal(1),
  workflowRunId: z.uuid(),
  groupId: z.uuid(),
});
export type GroupJob = z.infer<typeof jobSchema>;
