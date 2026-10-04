CREATE TABLE "course_placements" (
	"course_id" text PRIMARY KEY NOT NULL,
	"revision_id" uuid NOT NULL,
	"taxonomy_version" text,
	"status" text DEFAULT 'unmatched' NOT NULL,
	CONSTRAINT "course_placement_status" CHECK ("course_placements"."status" in ('unmatched','needs-review','matched'))
);
--> statement-breakpoint
ALTER TABLE "course_placements" ADD CONSTRAINT "course_placements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_placements" ADD CONSTRAINT "course_placements_revision_id_course_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_placements" ADD CONSTRAINT "course_placements_taxonomy_version_placement_taxonomies_version_fk" FOREIGN KEY ("taxonomy_version") REFERENCES "public"."placement_taxonomies"("version") ON DELETE no action ON UPDATE no action;