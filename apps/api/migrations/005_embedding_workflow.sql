CREATE TABLE embedding_configurations (
 id text PRIMARY KEY CHECK(id ~ '^[a-f0-9]{64}$'),
 body jsonb NOT NULL CHECK(jsonb_typeof(body)='object'), created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE embedding_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL UNIQUE,
 request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 configuration_id text NOT NULL REFERENCES embedding_configurations(id), request jsonb NOT NULL,
 state text NOT NULL DEFAULT 'registered' CHECK(state IN ('registered','running','complete','interrupted','failed','cancelled')),
 progress jsonb NOT NULL DEFAULT '{}', cancel_requested boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE embedding_manifests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL UNIQUE REFERENCES embedding_operations(id),
 body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE embedding_manifest_entities (
 manifest_id uuid NOT NULL REFERENCES embedding_manifests(id), entity_type text NOT NULL CHECK(entity_type IN ('course','group')),
 entity_id text NOT NULL, course_id text REFERENCES courses(id), group_id uuid REFERENCES course_groups(id),
 source_snapshot_id uuid REFERENCES course_snapshots(id), input_hash text NOT NULL CHECK(input_hash ~ '^[a-f0-9]{64}$'),
 input jsonb NOT NULL, exclusion text CHECK(exclusion IN ('protected','missing-observation','sparse')),
 PRIMARY KEY(manifest_id,entity_type,entity_id),
 CHECK((entity_type='course' AND course_id IS NOT NULL AND course_id=entity_id AND group_id IS NULL) OR (entity_type='group' AND group_id IS NOT NULL AND group_id::text=entity_id AND course_id IS NULL)),
 CHECK(entity_type='course' OR source_snapshot_id IS NULL)
);
CREATE TABLE embedding_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL REFERENCES embedding_operations(id),
 attempt_number integer NOT NULL CHECK(attempt_number>0), token uuid NOT NULL DEFAULT gen_random_uuid(),
 state text NOT NULL CHECK(state IN ('running','complete','interrupted','failed','cancelled')),
 lease_until timestamptz NOT NULL, started_at timestamptz NOT NULL DEFAULT clock_timestamp(), ended_at timestamptz,
 UNIQUE(operation_id,attempt_number)
);
CREATE TABLE embedding_execution (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), attempt_id uuid REFERENCES embedding_attempts(id)
);
INSERT INTO embedding_execution(singleton) VALUES(true);
CREATE TABLE embedding_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL REFERENCES embedding_operations(id),
 manifest_id uuid NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL,
 configuration_id text NOT NULL REFERENCES embedding_configurations(id),
 input_hash text NOT NULL CHECK(input_hash ~ '^[a-f0-9]{64}$'), checksum text NOT NULL CHECK(checksum ~ '^[a-f0-9]{64}$'),
 embedding public.vector(1024) NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(manifest_id,entity_type,entity_id) REFERENCES embedding_manifest_entities(manifest_id,entity_type,entity_id),
 UNIQUE(operation_id,entity_type,entity_id)
);
CREATE TABLE embedding_preferred (
 entity_type text NOT NULL, entity_id text NOT NULL, configuration_id text NOT NULL REFERENCES embedding_configurations(id),
 input_hash text NOT NULL, revision_id uuid NOT NULL REFERENCES embedding_revisions(id),
 PRIMARY KEY(entity_type,entity_id,configuration_id,input_hash)
);
CREATE TABLE embedding_selections (
 operation_id uuid NOT NULL REFERENCES embedding_operations(id), entity_type text NOT NULL, entity_id text NOT NULL,
 revision_id uuid NOT NULL REFERENCES embedding_revisions(id), PRIMARY KEY(operation_id,entity_type,entity_id)
);
CREATE TABLE embedding_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL UNIQUE REFERENCES embedding_operations(id),
 computation_key text NOT NULL CHECK(computation_key ~ '^[a-f0-9]{64}$'),
 manifest_id uuid NOT NULL REFERENCES embedding_manifests(id), configuration_id text NOT NULL REFERENCES embedding_configurations(id),
 settings jsonb NOT NULL, revision_ids jsonb NOT NULL, partial boolean NOT NULL, complete boolean NOT NULL DEFAULT false,
 expected_pairs integer NOT NULL CHECK(expected_pairs BETWEEN 0 AND 2000), expected_sets integer NOT NULL CHECK(expected_sets BETWEEN 0 AND 10000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX embedding_completed_computation ON embedding_runs(computation_key) WHERE complete;
CREATE TABLE embedding_operation_runs (
 operation_id uuid PRIMARY KEY REFERENCES embedding_operations(id), run_id uuid NOT NULL REFERENCES embedding_runs(id)
);
CREATE TABLE embedding_result_batches (
 run_id uuid NOT NULL REFERENCES embedding_runs(id), batch_id uuid NOT NULL, request_hash text NOT NULL,
 PRIMARY KEY(run_id,batch_id)
);
CREATE TABLE embedding_match_pairs (
 run_id uuid NOT NULL REFERENCES embedding_runs(id), course_id text NOT NULL REFERENCES courses(id), group_id uuid NOT NULL REFERENCES course_groups(id),
 raw_score double precision NOT NULL CHECK(raw_score BETWEEN .60 AND 1 AND raw_score<>'NaN'::float8),
 PRIMARY KEY(run_id,course_id,group_id)
);
CREATE TABLE embedding_discoveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES embedding_runs(id),
 set_key text NOT NULL CHECK(set_key ~ '^[a-f0-9]{64}$'), body jsonb NOT NULL,
 UNIQUE(run_id,set_key)
);
CREATE TABLE embedding_discovery_reviews (
 candidate_id uuid PRIMARY KEY REFERENCES embedding_discoveries(id), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','dismissed')),
 version integer NOT NULL DEFAULT 0 CHECK(version>=0), title text, note text, partial_accepted boolean NOT NULL DEFAULT false
);
CREATE TABLE embedding_discovery_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES embedding_discoveries(id),
 from_version integer NOT NULL, version integer NOT NULL, request_id uuid NOT NULL UNIQUE, request_hash text NOT NULL,
 body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(candidate_id,version)
);
CREATE TABLE embedding_promotions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL UNIQUE, request_hash text NOT NULL,
 candidate_id uuid NOT NULL UNIQUE REFERENCES embedding_discoveries(id), group_id uuid NOT NULL UNIQUE REFERENCES course_groups(id),
 group_input_hash text NOT NULL, body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE embedding_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES embedding_runs(id),
 promotion_id uuid REFERENCES embedding_promotions(id), course_id text NOT NULL REFERENCES courses(id), group_id uuid NOT NULL REFERENCES course_groups(id),
 score_kind text NOT NULL CHECK(score_kind IN ('course-group-cosine-v1','discovery-member-mean-cosine-v1')),
 raw_score double precision NOT NULL CHECK(raw_score BETWEEN 0 AND 1 AND raw_score<>'NaN'::float8),
 dependencies jsonb NOT NULL, suggestion_id uuid UNIQUE REFERENCES group_suggestions(id),
 UNIQUE NULLS NOT DISTINCT(run_id,promotion_id,course_id,group_id)
);
CREATE TABLE embedding_suggestion_evidence (
 suggestion_id uuid PRIMARY KEY REFERENCES group_suggestions(id), delivery_id uuid NOT NULL UNIQUE REFERENCES embedding_deliveries(id),
 body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE embedding_partial_acceptance (
 run_id uuid PRIMARY KEY REFERENCES embedding_runs(id), accepted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- History is retained independently of mutable preferred references and job state.
CREATE FUNCTION prevent_embedding_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Embedding history is immutable' USING ERRCODE='23514'; END;
$$;
CREATE TRIGGER immutable_embedding_configurations BEFORE UPDATE OR DELETE ON embedding_configurations FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_manifests BEFORE UPDATE OR DELETE ON embedding_manifests FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_inputs BEFORE UPDATE OR DELETE ON embedding_manifest_entities FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_revisions BEFORE UPDATE OR DELETE ON embedding_revisions FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_pairs BEFORE UPDATE OR DELETE ON embedding_match_pairs FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_discoveries BEFORE UPDATE OR DELETE ON embedding_discoveries FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_review_history BEFORE UPDATE OR DELETE ON embedding_discovery_history FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_promotions BEFORE UPDATE OR DELETE ON embedding_promotions FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_embedding_evidence BEFORE UPDATE OR DELETE ON embedding_suggestion_evidence FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
ALTER TABLE embedding_revisions ADD CONSTRAINT embedding_revision_identity UNIQUE(id,entity_type,entity_id,configuration_id,input_hash);
ALTER TABLE embedding_preferred ADD CONSTRAINT preferred_matches_revision FOREIGN KEY(revision_id,entity_type,entity_id,configuration_id,input_hash) REFERENCES embedding_revisions(id,entity_type,entity_id,configuration_id,input_hash);
CREATE TRIGGER immutable_embedding_selections BEFORE UPDATE OR DELETE ON embedding_selections FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE FUNCTION protect_embedding_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.complete OR NOT NEW.complete OR (to_jsonb(OLD)-'complete') IS DISTINCT FROM (to_jsonb(NEW)-'complete') THEN RAISE EXCEPTION 'Run evidence is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_finalized_embedding_run BEFORE UPDATE ON embedding_runs FOR EACH ROW EXECUTE FUNCTION protect_embedding_run();
CREATE TRIGGER immutable_embedding_run_delete BEFORE DELETE ON embedding_runs FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
CREATE TRIGGER immutable_partial_acceptance BEFORE UPDATE OR DELETE ON embedding_partial_acceptance FOR EACH ROW EXECUTE FUNCTION prevent_embedding_history_mutation();
