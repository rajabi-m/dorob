CREATE TABLE "placement_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"active_taxonomy" text NOT NULL,
	CONSTRAINT "placement_settings_singleton" CHECK ("placement_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "model_attempts" ADD COLUMN "response" jsonb;--> statement-breakpoint
ALTER TABLE "placement_settings" ADD CONSTRAINT "placement_settings_active_taxonomy_placement_taxonomies_version_fk" FOREIGN KEY ("active_taxonomy") REFERENCES "public"."placement_taxonomies"("version") ON DELETE no action ON UPDATE no action;