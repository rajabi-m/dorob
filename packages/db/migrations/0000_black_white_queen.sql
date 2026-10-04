CREATE TYPE "public"."group_state" AS ENUM('draft', 'ready-for-review', 'published', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."run_state" AS ENUM('queued', 'running', 'waiting-review', 'succeeded', 'failed', 'superseded');--> statement-breakpoint
CREATE TABLE "workflow_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"step" text NOT NULL,
	"state" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"provider_course_id" text NOT NULL,
	"source_url" text NOT NULL,
	"current_revision_id" uuid,
	"last_successful_check" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comparison_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"target_level" text,
	"criteria" text NOT NULL,
	"definition_revision" integer DEFAULT 1 NOT NULL,
	"state" "group_state" DEFAULT 'draft' NOT NULL,
	"current_snapshot_id" uuid,
	"published_snapshot_id" uuid,
	CONSTRAINT "comparison_groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"group_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"approved_revision_id" uuid NOT NULL,
	"method" text DEFAULT 'operator' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" text NOT NULL,
	"revision_id" uuid,
	"checked_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"error" text,
	CONSTRAINT "observation_outcome" CHECK (("course_observations"."status" = 'succeeded' AND "course_observations"."revision_id" IS NOT NULL AND "course_observations"."error" IS NULL) OR ("course_observations"."status" = 'failed' AND "course_observations"."revision_id" IS NULL AND "course_observations"."error" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" text NOT NULL,
	"content_hash" text NOT NULL,
	"evidence_hash" text NOT NULL,
	"facts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"input_digest" text NOT NULL,
	"input" jsonb NOT NULL,
	"operation_version" text DEFAULT 'facts-v1' NOT NULL,
	"state" "run_state" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_snapshots_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
ALTER TABLE "workflow_attempts" ADD CONSTRAINT "workflow_attempts_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_comparison_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."comparison_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_approved_revision_id_course_revisions_id_fk" FOREIGN KEY ("approved_revision_id") REFERENCES "public"."course_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_observations" ADD CONSTRAINT "course_observations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_observations" ADD CONSTRAINT "course_observations_revision_id_course_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_revisions" ADD CONSTRAINT "course_revisions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_group_id_comparison_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."comparison_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_snapshots" ADD CONSTRAINT "group_snapshots_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_snapshots" ADD CONSTRAINT "group_snapshots_group_id_comparison_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."comparison_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "source_identity" ON "courses" USING btree ("provider_id","provider_course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_course_membership" ON "group_memberships" USING btree ("group_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "observation_identity" ON "course_observations" USING btree ("course_id","checked_at","status");--> statement-breakpoint
CREATE UNIQUE INDEX "course_evidence_revision" ON "course_revisions" USING btree ("course_id","evidence_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "revision_owner" ON "course_revisions" USING btree ("course_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_input_identity" ON "workflow_runs" USING btree ("group_id","input_digest","operation_version");