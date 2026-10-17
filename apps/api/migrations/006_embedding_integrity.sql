-- Cross-row identities remain enforced independently of HTTP validation.
ALTER TABLE embedding_manifest_entities ADD CONSTRAINT manifest_input_identity UNIQUE(manifest_id,entity_type,entity_id,input_hash);
ALTER TABLE embedding_manifest_entities ADD CONSTRAINT source_snapshot_matches_course FOREIGN KEY(course_id,source_snapshot_id) REFERENCES course_snapshots(course_id,id);
ALTER TABLE embedding_manifests ADD CONSTRAINT manifest_operation_identity UNIQUE(operation_id,id);
ALTER TABLE embedding_operations ADD CONSTRAINT operation_configuration_identity UNIQUE(id,configuration_id);
ALTER TABLE embedding_revisions ADD CONSTRAINT revision_input_identity FOREIGN KEY(manifest_id,entity_type,entity_id,input_hash) REFERENCES embedding_manifest_entities(manifest_id,entity_type,entity_id,input_hash);
ALTER TABLE embedding_revisions ADD CONSTRAINT revision_operation_manifest FOREIGN KEY(operation_id,manifest_id) REFERENCES embedding_manifests(operation_id,id);
ALTER TABLE embedding_revisions ADD CONSTRAINT revision_operation_configuration FOREIGN KEY(operation_id,configuration_id) REFERENCES embedding_operations(id,configuration_id);
ALTER TABLE embedding_runs ADD CONSTRAINT run_operation_manifest FOREIGN KEY(operation_id,manifest_id) REFERENCES embedding_manifests(operation_id,id);
ALTER TABLE embedding_runs ADD CONSTRAINT run_operation_configuration FOREIGN KEY(operation_id,configuration_id) REFERENCES embedding_operations(id,configuration_id);
CREATE UNIQUE INDEX embedding_one_active_attempt ON embedding_attempts(state) WHERE state='running';
CREATE TRIGGER immutable_embedding_result_batches BEFORE UPDATE OR DELETE ON embedding_result_batches FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_operation_runs BEFORE UPDATE OR DELETE ON embedding_operation_runs FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER permanent_embedding_execution_slot BEFORE DELETE ON embedding_execution FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER permanent_embedding_operations BEFORE DELETE ON embedding_operations FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER permanent_embedding_delivery_plans BEFORE DELETE ON embedding_deliveries FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE FUNCTION protect_embedding_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.suggestion_id IS NOT NULL OR NEW.suggestion_id IS NULL OR (to_jsonb(OLD)-'suggestion_id') IS DISTINCT FROM (to_jsonb(NEW)-'suggestion_id') THEN RAISE EXCEPTION 'Delivery plan is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_embedding_delivery_plan BEFORE UPDATE ON embedding_deliveries FOR EACH ROW EXECUTE FUNCTION protect_embedding_delivery();
CREATE FUNCTION protect_embedding_operation_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(OLD)-ARRAY['state','progress','cancel_requested','updated_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['state','progress','cancel_requested','updated_at']) THEN RAISE EXCEPTION 'Operation request is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_embedding_operation_request BEFORE UPDATE ON embedding_operations FOR EACH ROW EXECUTE FUNCTION protect_embedding_operation_identity();
