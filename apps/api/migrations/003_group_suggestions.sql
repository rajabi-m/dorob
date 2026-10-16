CREATE TABLE group_pair_reviews (
  group_id uuid NOT NULL REFERENCES course_groups(id) ON DELETE RESTRICT,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending','approved','rejected')),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  selected_suggestion_id uuid,
  origin text CHECK (origin IN ('manual','suggestion')),
  decided_at timestamptz,
  PRIMARY KEY (group_id,course_id),
  CHECK ((origin = 'suggestion' AND selected_suggestion_id IS NOT NULL) OR (origin IS DISTINCT FROM 'suggestion' AND selected_suggestion_id IS NULL)),
  CHECK ((status = 'pending' AND decided_at IS NULL AND origin IS NULL) OR (status <> 'pending' AND decided_at IS NOT NULL AND origin IS NOT NULL))
);
CREATE TABLE group_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  course_id text NOT NULL,
  system_id text NOT NULL CHECK (length(btrim(system_id)) BETWEEN 1 AND 100),
  system_name text NOT NULL CHECK (length(btrim(system_name)) BETWEEN 1 AND 200),
  submission_id text NOT NULL CHECK (length(btrim(submission_id)) BETWEEN 1 AND 200),
  confidence_percent numeric NOT NULL CHECK (confidence_percent >= 0 AND confidence_percent <= 100 AND confidence_percent <> 'NaN'::numeric),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (system_id,submission_id),
  UNIQUE (group_id,course_id,id),
  FOREIGN KEY (group_id,course_id) REFERENCES group_pair_reviews(group_id,course_id) ON DELETE RESTRICT
);
ALTER TABLE group_pair_reviews ADD CONSTRAINT selected_pair_suggestion
  FOREIGN KEY (group_id,course_id,selected_suggestion_id) REFERENCES group_suggestions(group_id,course_id,id) ON DELETE RESTRICT;
CREATE TABLE group_review_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  course_id text NOT NULL,
  from_version integer NOT NULL CHECK (from_version >= 0),
  to_version integer NOT NULL CHECK (to_version >= from_version),
  action text NOT NULL CHECK (action IN ('approve','reject','reopen','manual-add','manual-remove','baseline')),
  suggestion_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  outcome jsonb NOT NULL,
  UNIQUE (group_id,course_id,to_version),
  FOREIGN KEY (group_id,course_id) REFERENCES group_pair_reviews(group_id,course_id) ON DELETE RESTRICT,
  FOREIGN KEY (group_id,course_id,suggestion_id) REFERENCES group_suggestions(group_id,course_id,id) ON DELETE RESTRICT
);
CREATE INDEX group_pair_reviews_status_idx ON group_pair_reviews(group_id,status,course_id);
CREATE INDEX group_suggestions_order_idx ON group_suggestions(group_id,confidence_percent DESC,received_at DESC,id);
CREATE INDEX group_suggestions_pair_idx ON group_suggestions(group_id,course_id);
CREATE INDEX group_review_history_idx ON group_review_transitions(group_id,course_id,to_version DESC);
INSERT INTO group_pair_reviews(group_id,course_id,status,version,origin,decided_at)
  SELECT group_id,course_id,'approved',0,'manual',clock_timestamp() FROM course_group_courses;
INSERT INTO group_review_transitions(group_id,course_id,from_version,to_version,action,outcome)
  SELECT group_id,course_id,0,0,'baseline',jsonb_build_object('groupId',group_id,'courseId',course_id,'status',status,'version',version,'selectedSuggestionId',NULL,'origin',origin,'decidedAt',to_char(decided_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) FROM group_pair_reviews;
-- Submissions and transition history are append-only, even for accidental SQL updates.
CREATE FUNCTION prevent_review_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Review history is immutable' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER immutable_group_suggestions BEFORE UPDATE OR DELETE ON group_suggestions FOR EACH ROW EXECUTE FUNCTION prevent_review_history_mutation();
CREATE TRIGGER immutable_group_review_transitions BEFORE UPDATE OR DELETE ON group_review_transitions FOR EACH ROW EXECUTE FUNCTION prevent_review_history_mutation();
