CREATE TABLE "model_admission" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"busy_until" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_admission_singleton" CHECK ("model_admission"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE placement_requests ADD CONSTRAINT placement_revision_owner FOREIGN KEY (course_id, revision_id) REFERENCES course_revisions(course_id, id);
--> statement-breakpoint
CREATE FUNCTION placement_immutable_inputs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'placement_taxonomies' THEN
    IF (NEW.version, NEW.data, NEW.digest) IS DISTINCT FROM (OLD.version, OLD.data, OLD.digest) THEN
      RAISE EXCEPTION 'Taxonomy versions are immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'placement_requests' THEN
    IF (NEW.request_hash, NEW.budget_id, NEW.course_id, NEW.revision_id, NEW.group_id, NEW.definition_revision, NEW.taxonomy_version, NEW.kind, NEW.input)
      IS DISTINCT FROM (OLD.request_hash, OLD.budget_id, OLD.course_id, OLD.revision_id, OLD.group_id, OLD.definition_revision, OLD.taxonomy_version, OLD.kind, OLD.input) THEN
      RAISE EXCEPTION 'Placement request inputs are immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'retrieval_documents' THEN
    IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Retrieval documents are immutable'; END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER placement_taxonomy_immutable BEFORE UPDATE ON placement_taxonomies FOR EACH ROW EXECUTE FUNCTION placement_immutable_inputs();
--> statement-breakpoint
CREATE TRIGGER placement_request_immutable BEFORE UPDATE ON placement_requests FOR EACH ROW EXECUTE FUNCTION placement_immutable_inputs();
--> statement-breakpoint
CREATE TRIGGER retrieval_document_immutable BEFORE UPDATE ON retrieval_documents FOR EACH ROW EXECUTE FUNCTION placement_immutable_inputs();
