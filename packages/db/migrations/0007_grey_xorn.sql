CREATE TABLE "retrieval_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"entity_id" text NOT NULL,
	"revision" text NOT NULL,
	"taxonomy_version" text NOT NULL,
	"bundle_version" text NOT NULL,
	"original_text" text NOT NULL,
	"lexical_text" text NOT NULL,
	"text_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retrieval_vectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer NOT NULL,
	"bundle_version" text NOT NULL,
	"embedding" vector NOT NULL,
	CONSTRAINT "retrieval_dimensions" CHECK ("retrieval_vectors"."dimensions" between 1 and 16000 and vector_dims("retrieval_vectors"."embedding") = "retrieval_vectors"."dimensions")
);
--> statement-breakpoint
ALTER TABLE "retrieval_documents" ADD CONSTRAINT "retrieval_documents_taxonomy_version_placement_taxonomies_version_fk" FOREIGN KEY ("taxonomy_version") REFERENCES "public"."placement_taxonomies"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retrieval_vectors" ADD CONSTRAINT "retrieval_vectors_document_id_retrieval_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."retrieval_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "retrieval_vector_identity" ON "retrieval_vectors" USING btree ("document_id","model","dimensions","bundle_version");