CREATE TABLE "model_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"state" text NOT NULL,
	"reserved_micros" integer NOT NULL,
	"usage" jsonb,
	"served_model" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "model_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" text NOT NULL,
	"max_calls" integer NOT NULL,
	"used_calls" integer DEFAULT 0 NOT NULL,
	"max_micros" integer NOT NULL,
	"reserved_micros" integer DEFAULT 0 NOT NULL,
	"per_call_micros" integer NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_budget_bounds" CHECK ("model_budgets"."max_calls" between 1 and 100 and "model_budgets"."used_calls" between 0 and "model_budgets"."max_calls" and "model_budgets"."max_micros" between 1 and 100000000 and "model_budgets"."per_call_micros" between 1 and "model_budgets"."max_micros" and "model_budgets"."reserved_micros" >= 0),
	CONSTRAINT "model_budget_mode" CHECK ("model_budgets"."mode" in ('offline', 'live')),
	CONSTRAINT "model_budget_state" CHECK ("model_budgets"."state" in ('open','cancelled','overrun'))
);
--> statement-breakpoint
CREATE TABLE "placement_outbox" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"state" text DEFAULT 'needs-configuration' NOT NULL,
	"request_id" uuid
);
--> statement-breakpoint
CREATE TABLE "placement_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_hash" text NOT NULL,
	"budget_id" uuid NOT NULL,
	"course_id" text,
	"revision_id" uuid,
	"group_id" uuid,
	"definition_revision" integer,
	"taxonomy_version" text NOT NULL,
	"kind" text NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb,
	"state" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_requests_request_hash_unique" UNIQUE("request_hash"),
	CONSTRAINT "placement_attempt_bound" CHECK ("placement_requests"."attempts" between 0 and 3),
	CONSTRAINT "placement_kind" CHECK ("placement_requests"."kind" in ('classify','evaluate','embed')),
	CONSTRAINT "placement_state" CHECK ("placement_requests"."state" in ('queued','running','completed','failed','cancelled','stale'))
);
--> statement-breakpoint
CREATE TABLE "placement_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"operator" text,
	"note" text,
	CONSTRAINT "placement_reviews_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "placement_taxonomies" (
	"version" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"digest" text NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "model_attempts" ADD CONSTRAINT "model_attempts_request_id_placement_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."placement_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_attempts" ADD CONSTRAINT "model_attempts_budget_id_model_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."model_budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_outbox" ADD CONSTRAINT "placement_outbox_revision_id_course_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_outbox" ADD CONSTRAINT "placement_outbox_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_outbox" ADD CONSTRAINT "placement_outbox_request_id_placement_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."placement_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_budget_id_model_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."model_budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_revision_id_course_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_group_id_comparison_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."comparison_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_taxonomy_version_placement_taxonomies_version_fk" FOREIGN KEY ("taxonomy_version") REFERENCES "public"."placement_taxonomies"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_reviews" ADD CONSTRAINT "placement_reviews_request_id_placement_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."placement_requests"("id") ON DELETE no action ON UPDATE no action;