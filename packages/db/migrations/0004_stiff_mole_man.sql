CREATE TABLE "group_invalidations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"revision_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"job_id" uuid
);
--> statement-breakpoint
ALTER TABLE "ingestion_collections" ADD COLUMN "generation" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "group_invalidations" ADD CONSTRAINT "group_invalidations_group_id_comparison_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."comparison_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invalidations" ADD CONSTRAINT "group_invalidations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invalidations" ADD CONSTRAINT "group_invalidations_revision_id_course_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_revision_invalidation" ON "group_invalidations" USING btree ("group_id","course_id","revision_id");