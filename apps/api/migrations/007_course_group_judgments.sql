-- Additive private ledger. No selection/publication pointer and no catalog writes.
CREATE TABLE course_group_judgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES course_groups(id),
  system_id text NOT NULL CHECK (length(system_id) BETWEEN 1 AND 100 AND system_id ~ '^[a-z0-9][a-z0-9-]*$'),
  submission_id text NOT NULL CHECK (length(submission_id) BETWEEN 1 AND 200 AND submission_id ~ '[^[:space:]]' AND submission_id !~ '[[:cntrl:]]'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  input_revision text NOT NULL CHECK (input_revision ~ '^[a-f0-9]{64}$'),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  group_context jsonb NOT NULL CHECK (jsonb_typeof(group_context) = 'object'),
  input_manifest jsonb NOT NULL CHECK (jsonb_typeof(input_manifest) = 'object'),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  UNIQUE(system_id,submission_id)
);
CREATE INDEX course_group_judgments_history ON course_group_judgments(group_id,received_at DESC,id ASC);
CREATE FUNCTION reject_course_group_judgment_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Course group judgments are immutable' USING ERRCODE='23514'; END;
$$;
CREATE TRIGGER immutable_course_group_judgments BEFORE UPDATE OR DELETE ON course_group_judgments
  FOR EACH ROW EXECUTE FUNCTION reject_course_group_judgment_mutation();
