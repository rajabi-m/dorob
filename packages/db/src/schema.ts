import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, integer, jsonb, uniqueIndex, check, pgEnum, customType } from "drizzle-orm/pg-core";
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
  discoveryKey: text("discovery_key").unique(),
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
  approvedDefinitionRevision: integer("approved_definition_revision").notNull().default(1),
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

// Durable operator collection ledger; queue retention never deletes this history.
export const collections = pgTable("ingestion_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: text("provider_id").notNull(),
  generation: integer("generation").notNull().default(0),
  maxCourses: integer("max_courses").notNull(),
  transportMode: text("transport_mode", { enum: ["live", "offline"] }).notNull().default("live"),
  refreshOptIn: text("refresh_opt_in").notNull().default("no"),
  requestedUrls: jsonb("requested_urls").$type<string[]>().notNull(),
  discoveredUrls: jsonb("discovered_urls").$type<string[]>(),
  state: text("state").notNull().default("queued"),
  error: text("error"),
  createdAt: time("created_at").defaultNow().notNull(),
}, t => [check("collection_bounds", sql`${t.maxCourses} between 1 and 100 and ${t.generation} >= 0 and jsonb_typeof(${t.requestedUrls}) = 'array' and jsonb_array_length(${t.requestedUrls}) <= ${t.maxCourses}`),
  check("collection_provider", sql`${t.providerId} in ('maktabkhooneh', 'roocket')`),
  check("collection_state", sql`${t.state} in ('queued', 'running', 'succeeded', 'partial', 'failed', 'paused')`)]);
export const selections = pgTable("ingestion_selections", {
  id: uuid("id").defaultRandom().primaryKey(),
  collectionId: uuid("collection_id").notNull().references(() => collections.id),
  sourceUrl: text("source_url").notNull(),
  state: text("state").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  revisionId: uuid("revision_id").references(() => revisions.id),
  error: text("error"),
}, t => [uniqueIndex("collection_url").on(t.collectionId, t.sourceUrl),
  uniqueIndex("selection_collection_owner").on(t.collectionId, t.id),
  check("selection_attempt_budget", sql`${t.attempts} between 0 and 3`),
  check("selection_state", sql`${t.state} in ('pending', 'running', 'retryable', 'succeeded', 'access-denied', 'malformed-evidence', 'operator-required', 'exhausted')`),
  check("selection_success", sql`(${t.state} = 'succeeded') = (${t.revisionId} is not null)`)]);
export const ingestionAttempts = pgTable("ingestion_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  collectionId: uuid("collection_id").notNull().references(() => collections.id),
  selectionId: uuid("selection_id").references(() => selections.id),
  state: text("state").notNull(),
  error: text("error"),
  startedAt: time("started_at").defaultNow().notNull(),
  finishedAt: time("finished_at"),
});
export const providerLimits = pgTable("provider_limits", {
  providerId: text("provider_id").primaryKey(),
  token: uuid("token"),
  busyUntil: time("busy_until").defaultNow().notNull(),
  nextAt: time("next_at").defaultNow().notNull(),
  delayMs: integer("delay_ms").notNull().default(1500),
  paused: text("paused"),
}, t => [check("provider_spacing", sql`${t.delayMs} >= 0`)]);

export const invalidations = pgTable("group_invalidations", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  courseId: text("course_id").notNull().references(() => courses.id),
  revisionId: uuid("revision_id").notNull().references(() => revisions.id),
  state: text("state").notNull().default("pending"),
  jobId: uuid("job_id"),
}, t => [uniqueIndex("group_revision_invalidation").on(t.groupId, t.courseId, t.revisionId)]);

export const taxonomies = pgTable("placement_taxonomies", {
  version: text("version").primaryKey(), data: jsonb("data").notNull(), digest: text("digest").notNull(),
  reviewedBy: text("reviewed_by"), reviewedAt: time("reviewed_at"),
});
export const modelBudgets = pgTable("model_budgets", {
  id: uuid("id").defaultRandom().primaryKey(), mode: text("mode").notNull(), maxCalls: integer("max_calls").notNull(),
  usedCalls: integer("used_calls").notNull().default(0), maxMicros: integer("max_micros").notNull(),
  reservedMicros: integer("reserved_micros").notNull().default(0), perCallMicros: integer("per_call_micros").notNull(),
  state: text("state").notNull().default("open"), createdAt: time("created_at").defaultNow().notNull(),
}, t => [check("model_budget_bounds", sql`${t.maxCalls} between 1 and 100 and ${t.usedCalls} between 0 and ${t.maxCalls} and ${t.maxMicros} between 1 and 100000000 and ${t.perCallMicros} between 1 and ${t.maxMicros} and ${t.reservedMicros} >= 0`),
  check("model_budget_mode", sql`${t.mode} in ('offline', 'live')`), check("model_budget_state", sql`${t.state} in ('open','cancelled','overrun')`)]);
export const placementRequests = pgTable("placement_requests", {
  id: uuid("id").defaultRandom().primaryKey(), requestHash: text("request_hash").notNull().unique(),
  budgetId: uuid("budget_id").notNull().references(() => modelBudgets.id), courseId: text("course_id").references(() => courses.id),
  revisionId: uuid("revision_id").references(() => revisions.id), groupId: uuid("group_id").references(() => groups.id),
  definitionRevision: integer("definition_revision"), taxonomyVersion: text("taxonomy_version").notNull().references(() => taxonomies.version),
  kind: text("kind").notNull(), input: jsonb("input").notNull(), result: jsonb("result"),
  state: text("state").notNull().default("queued"), attempts: integer("attempts").notNull().default(0),
  activeAttemptId: uuid("active_attempt_id"), jobId: uuid("job_id"), createdAt: time("created_at").defaultNow().notNull(),
}, t => [check("placement_attempt_bound", sql`${t.attempts} between 0 and 3`), check("placement_kind", sql`${t.kind} in ('classify','evaluate','embed','discover','definition','assess')`),
  check("placement_state", sql`${t.state} in ('queued','running','completed','failed','cancelled','stale')`)]);
export const modelAttempts = pgTable("model_attempts", {
  id: uuid("id").defaultRandom().primaryKey(), requestId: uuid("request_id").notNull().references(() => placementRequests.id),
  budgetId: uuid("budget_id").notNull().references(() => modelBudgets.id), state: text("state").notNull(),
  reservedMicros: integer("reserved_micros").notNull(), usage: jsonb("usage"), response: jsonb("response"), servedModel: text("served_model"),
  startedAt: time("started_at").defaultNow().notNull(), finishedAt: time("finished_at"),
});
export const placementReviews = pgTable("placement_reviews", {
  id: uuid("id").defaultRandom().primaryKey(), requestId: uuid("request_id").notNull().unique().references(() => placementRequests.id),
  outcome: text("outcome").notNull(), state: text("state").notNull().default("pending"), operator: text("operator"), note: text("note"),
});
export const placementOutbox = pgTable("placement_outbox", {
  revisionId: uuid("revision_id").primaryKey().references(() => revisions.id), courseId: text("course_id").notNull().references(() => courses.id),
  state: text("state").notNull().default("needs-configuration"), requestId: uuid("request_id").references(() => placementRequests.id),
});

const vector = customType<{ data: string }>({ dataType: () => "vector" });
export const retrievalDocuments = pgTable("retrieval_documents", {
  id: text("id").primaryKey(), kind: text("kind").notNull(), entityId: text("entity_id").notNull(), revision: text("revision").notNull(),
  taxonomyVersion: text("taxonomy_version").notNull().references(() => taxonomies.version), bundleVersion: text("bundle_version").notNull(),
  originalText: text("original_text").notNull(), lexicalText: text("lexical_text").notNull(), textHash: text("text_hash").notNull(),
});
export const retrievalVectors = pgTable("retrieval_vectors", {
  id: uuid("id").defaultRandom().primaryKey(), documentId: text("document_id").notNull().references(() => retrievalDocuments.id),
  model: text("model").notNull(), dimensions: integer("dimensions").notNull(), bundleVersion: text("bundle_version").notNull(), embedding: vector("embedding").notNull(),
}, t => [uniqueIndex("retrieval_vector_identity").on(t.documentId, t.model, t.dimensions, t.bundleVersion),
  check("retrieval_dimensions", sql`${t.dimensions} between 1 and 16000 and vector_dims(${t.embedding}) = ${t.dimensions}`)]);

export const placementSettings = pgTable("placement_settings", {
  id: integer("id").primaryKey().default(1), activeTaxonomy: text("active_taxonomy").notNull().references(() => taxonomies.version),
}, t => [check("placement_settings_singleton", sql`${t.id} = 1`)]);

export const modelAdmission = pgTable("model_admission", {
  id: integer("id").primaryKey().default(1), token: uuid("token"), busyUntil: time("busy_until").defaultNow().notNull(),
}, t => [check("model_admission_singleton", sql`${t.id} = 1`)]);
export const coursePlacements = pgTable("course_placements", {
  courseId: text("course_id").primaryKey().references(() => courses.id), revisionId: uuid("revision_id").notNull().references(() => revisions.id),
  taxonomyVersion: text("taxonomy_version").references(() => taxonomies.version), status: text("status").notNull().default("unmatched"),
}, t => [check("course_placement_status", sql`${t.status} in ('unmatched','needs-review','matched')`)]);

// Milestone 4 uses the existing placement request/model ledger and queue.
export const discoveryProposals = pgTable("discovery_proposals", {
  id: uuid("id").defaultRandom().primaryKey(), equivalentKey: text("equivalent_key").notNull().unique(),
  taxonomyVersion: text("taxonomy_version").notNull().references(() => taxonomies.version),
  input: jsonb("input").notNull(), groupId: uuid("group_id").references(() => groups.id),
  state: text("state").notNull().default("waiting-review"), createdAt: time("created_at").defaultNow().notNull(),
});
export const groupDefinitions = pgTable("group_definition_history", {
  id: uuid("id").defaultRandom().primaryKey(), proposalId: uuid("proposal_id").notNull().references(() => discoveryProposals.id),
  groupId: uuid("group_id").references(() => groups.id), requestId: uuid("request_id").references(() => placementRequests.id),
  parentId: uuid("parent_id"), data: jsonb("data").notNull(), binding: jsonb("binding").notNull(),
  state: text("state").notNull().default("draft"), createdAt: time("created_at").defaultNow().notNull(),
}, t => [uniqueIndex("definition_model_request").on(t.requestId)]);
export const groupReviews = pgTable("group_review_history", {
  id: uuid("id").defaultRandom().primaryKey(), proposalId: uuid("proposal_id").references(() => discoveryProposals.id),
  definitionId: uuid("definition_id").references(() => groupDefinitions.id), requestId: uuid("request_id").references(() => placementRequests.id),
  action: text("action").notNull(), operator: text("operator").notNull(), note: text("note").notNull(),
  data: jsonb("data"), createdAt: time("created_at").defaultNow().notNull(),
});
export const groupAnalysis = pgTable("group_analysis", {
  id: uuid("id").defaultRandom().primaryKey(), groupId: uuid("group_id").notNull().references(() => groups.id),
  inputHash: text("input_hash").notNull().unique(), input: jsonb("input").notNull(),
  state: text("state").notNull().default("waiting-review"), createdAt: time("created_at").defaultNow().notNull(),
});
export const groupAiSettings = pgTable("group_ai_settings", {
  id: integer("id").primaryKey().default(1), policyVersion: text("policy_version").notNull(),
}, t => [check("group_ai_singleton", sql`${t.id} = 1`)]);

// Immutable bounded refresh selection and idempotency identity; outcomes live in collection ledger.
export const refreshRequests = pgTable("refresh_requests", {
  id: uuid("id").defaultRandom().primaryKey(), requestKey: text("request_key").notNull().unique(), inputDigest: text("input_digest").notNull(),
  input: jsonb("input").notNull(), collectionIds: jsonb("collection_ids").$type<string[]>().notNull(), operator: text("operator").notNull(), createdAt: time("created_at").defaultNow().notNull(),
});
