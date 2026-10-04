-- Custom SQL migration file, put your code below! --
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE courses ADD CONSTRAINT current_revision_owner
  FOREIGN KEY (id, current_revision_id) REFERENCES course_revisions(course_id, id);
--> statement-breakpoint
ALTER TABLE group_memberships ADD CONSTRAINT membership_revision_owner
  FOREIGN KEY (course_id, approved_revision_id) REFERENCES course_revisions(course_id, id);
--> statement-breakpoint
ALTER TABLE course_observations ADD CONSTRAINT observation_revision_owner
  FOREIGN KEY (course_id, revision_id) REFERENCES course_revisions(course_id, id);
--> statement-breakpoint
ALTER TABLE group_snapshots ADD CONSTRAINT snapshot_group_identity UNIQUE (group_id, id);
--> statement-breakpoint
ALTER TABLE comparison_groups ADD CONSTRAINT current_snapshot_owner
  FOREIGN KEY (id, current_snapshot_id) REFERENCES group_snapshots(group_id, id);
--> statement-breakpoint
ALTER TABLE comparison_groups ADD CONSTRAINT published_snapshot_owner
  FOREIGN KEY (id, published_snapshot_id) REFERENCES group_snapshots(group_id, id);
--> statement-breakpoint
ALTER TABLE workflow_runs ADD CONSTRAINT workflow_group_identity UNIQUE (group_id, id);
--> statement-breakpoint
ALTER TABLE group_snapshots ADD CONSTRAINT snapshot_run_owner
  FOREIGN KEY (group_id, run_id) REFERENCES workflow_runs(group_id, id);
--> statement-breakpoint
ALTER TABLE comparison_groups ADD CONSTRAINT normalized_level
  CHECK (target_level IS NULL OR target_level IN ('beginner', 'intermediate', 'advanced', 'multi-level'));
--> statement-breakpoint
-- Revisions and completed factual snapshots are retained inputs, never mutable edits.
CREATE FUNCTION reject_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Retained evidence is immutable; create a new revision';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER immutable_course_revision BEFORE UPDATE OR DELETE ON course_revisions
  FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
--> statement-breakpoint
CREATE TRIGGER immutable_group_snapshot BEFORE UPDATE OR DELETE ON group_snapshots
  FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
