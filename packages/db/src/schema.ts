import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, integer, jsonb, uniqueIndex, check, pgEnum } from "drizzle-orm/pg-core";
import type { ProviderCourse } from "@dorob/utils/course";
import type { GroupSnapshot } from "@dorob/core";

export const groupState = pgEnum("group_state", ["draft", "ready-for-review", "published", "withdrawn"]);
export const runState = pgEnum("run_state", ["queued", "running", "waiting-review", "succeeded", "failed", "superseded"]);
const time = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const providers = pgTable("providers", { id: text("id").primaryKey() });
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => providers.id),
  providerCourseId: text("provider_course_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  // The composite FK to revisions is added in the reviewed migration (circular relation).
  currentRevisionId: uuid("current_revision_id"),
  lastSuccessfulCheck: time("last_successful_check"),
}, table => [uniqueIndex("source_identity").on(table.providerId, table.providerCourseId)]);
export const revisions = pgTable("course_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  contentHash: text("content_hash").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  facts: jsonb("facts").$type<ProviderCourse>().notNull(),
  createdAt: time("created_at").defaultNow().notNull(),
}, table => [uniqueIndex("course_evidence_revision").on(table.courseId, table.evidenceHash), uniqueIndex("revision_owner").on(table.courseId, table.id)]);
export const observations = pgTable("course_observations", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  revisionId: uuid("revision_id").references(() => revisions.id),
  checkedAt: time("checked_at").notNull(),
  status: text("status", { enum: ["succeeded", "failed"] }).notNull(),
  error: text("error"),
}, table => [uniqueIndex("observation_identity").on(table.courseId, table.checkedAt, table.status),
  check("observation_outcome", sql`(${table.status} = 'succeeded' AND ${table.revisionId} IS NOT NULL AND ${table.error} IS NULL) OR (${table.status} = 'failed' AND ${table.revisionId} IS NULL AND ${table.error} IS NOT NULL)`)]);
export const groups = pgTable("comparison_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  targetLevel: text("target_level", { enum: ["beginner", "intermediate", "advanced", "multi-level"] }),
  criteria: text("criteria").notNull(),
  definitionRevision: integer("definition_revision").notNull().default(1),
  state: groupState("state").notNull().default("draft"),
  currentSnapshotId: uuid("current_snapshot_id"),
  publishedSnapshotId: uuid("published_snapshot_id"),
});
export const memberships = pgTable("group_memberships", {
  groupId: uuid("group_id").notNull().references(() => groups.id),
  courseId: text("course_id").notNull().references(() => courses.id),
  approvedRevisionId: uuid("approved_revision_id").notNull().references(() => revisions.id),
  method: text("method").notNull().default("operator"),
}, table => [uniqueIndex("group_course_membership").on(table.groupId, table.courseId)]);
export const runs = pgTable("workflow_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  inputDigest: text("input_digest").notNull(),
  input: jsonb("input").$type<{ definitionRevision: number; members: { courseId: string; revisionId: string }[] }>().notNull(),
  operationVersion: text("operation_version").notNull().default("facts-v1"),
  buildJobId: uuid("build_job_id"),
  finalizeJobId: uuid("finalize_job_id"),
  state: runState("state").notNull().default("queued"),
  createdAt: time("created_at").defaultNow().notNull(),
  updatedAt: time("updated_at").defaultNow().notNull(),
}, table => [uniqueIndex("workflow_input_identity").on(table.groupId, table.inputDigest, table.operationVersion)]);
export const attempts = pgTable("workflow_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().references(() => runs.id),
  jobId: uuid("job_id").notNull(),
  step: text("step").notNull(),
  state: text("state", { enum: ["running", "succeeded", "failed", "interrupted"] }).notNull(),
  startedAt: time("started_at").defaultNow().notNull(),
  finishedAt: time("finished_at"),
  error: text("error"),
});
export const snapshots = pgTable("group_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().unique().references(() => runs.id),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  data: jsonb("data").$type<GroupSnapshot>().notNull(),
  generatedAt: time("generated_at").defaultNow().notNull(),
});
