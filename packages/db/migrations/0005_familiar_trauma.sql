CREATE UNIQUE INDEX "selection_collection_owner" ON "ingestion_selections" USING btree ("collection_id","id");--> statement-breakpoint
ALTER TABLE "ingestion_collections" ADD CONSTRAINT "collection_bounds" CHECK ("ingestion_collections"."max_courses" between 1 and 100 and "ingestion_collections"."generation" >= 0 and jsonb_typeof("ingestion_collections"."requested_urls") = 'array' and jsonb_array_length("ingestion_collections"."requested_urls") <= "ingestion_collections"."max_courses");--> statement-breakpoint
ALTER TABLE "ingestion_collections" ADD CONSTRAINT "collection_provider" CHECK ("ingestion_collections"."provider_id" in ('maktabkhooneh', 'roocket'));--> statement-breakpoint
ALTER TABLE "ingestion_collections" ADD CONSTRAINT "collection_state" CHECK ("ingestion_collections"."state" in ('queued', 'running', 'succeeded', 'partial', 'failed', 'paused'));--> statement-breakpoint
ALTER TABLE "provider_limits" ADD CONSTRAINT "provider_spacing" CHECK ("provider_limits"."delay_ms" >= 0);--> statement-breakpoint
ALTER TABLE "ingestion_selections" ADD CONSTRAINT "selection_attempt_budget" CHECK ("ingestion_selections"."attempts" between 0 and 3);--> statement-breakpoint
ALTER TABLE "ingestion_selections" ADD CONSTRAINT "selection_state" CHECK ("ingestion_selections"."state" in ('pending', 'running', 'retryable', 'succeeded', 'access-denied', 'malformed-evidence', 'operator-required', 'exhausted'));--> statement-breakpoint
ALTER TABLE "ingestion_selections" ADD CONSTRAINT "selection_success" CHECK (("ingestion_selections"."state" = 'succeeded') = ("ingestion_selections"."revision_id" is not null));--> statement-breakpoint
ALTER TABLE ingestion_attempts ADD CONSTRAINT ingestion_attempt_selection_owner
FOREIGN KEY (collection_id, selection_id) REFERENCES ingestion_selections(collection_id, id);
--> statement-breakpoint
CREATE FUNCTION preserve_collection_input() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.max_courses IS DISTINCT FROM OLD.max_courses
    OR NEW.requested_urls IS DISTINCT FROM OLD.requested_urls
    OR (OLD.discovered_urls IS NOT NULL AND NEW.discovered_urls IS DISTINCT FROM OLD.discovered_urls) THEN
    RAISE EXCEPTION 'Retained collection input is immutable';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER immutable_collection_input BEFORE UPDATE ON ingestion_collections
FOR EACH ROW EXECUTE FUNCTION preserve_collection_input();
--> statement-breakpoint
CREATE FUNCTION preserve_selection_input() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.collection_id IS DISTINCT FROM OLD.collection_id OR NEW.source_url IS DISTINCT FROM OLD.source_url THEN
    RAISE EXCEPTION 'Retained selection input is immutable';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER immutable_selection_input BEFORE UPDATE ON ingestion_selections
FOR EACH ROW EXECUTE FUNCTION preserve_selection_input();
