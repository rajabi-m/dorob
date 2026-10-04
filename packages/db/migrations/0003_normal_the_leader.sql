CREATE TABLE "ingestion_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"max_courses" integer NOT NULL,
	"requested_urls" jsonb NOT NULL,
	"discovered_urls" jsonb,
	"state" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"selection_id" uuid,
	"state" text NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "provider_limits" (
	"provider_id" text PRIMARY KEY NOT NULL,
	"token" uuid,
	"busy_until" timestamp with time zone DEFAULT now() NOT NULL,
	"next_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delay_ms" integer DEFAULT 1500 NOT NULL,
	"paused" text
);
--> statement-breakpoint
CREATE TABLE "ingestion_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"revision_id" uuid,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "ingestion_attempts" ADD CONSTRAINT "ingestion_attempts_collection_id_ingestion_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."ingestion_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_attempts" ADD CONSTRAINT "ingestion_attempts_selection_id_ingestion_selections_id_fk" FOREIGN KEY ("selection_id") REFERENCES "public"."ingestion_selections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_selections" ADD CONSTRAINT "ingestion_selections_collection_id_ingestion_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."ingestion_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_selections" ADD CONSTRAINT "ingestion_selections_revision_id_course_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_url" ON "ingestion_selections" USING btree ("collection_id","source_url");