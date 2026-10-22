-- Additive derived query facts; immutable snapshots remain authoritative.
CREATE TABLE course_catalog_preparation (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  projection_version integer NOT NULL CHECK (projection_version > 0),
  generation uuid NOT NULL DEFAULT gen_random_uuid(),
  complete boolean NOT NULL DEFAULT false,
  last_course_id text,
  batches integer NOT NULL DEFAULT 0 CHECK (batches >= 0)
);
INSERT INTO course_catalog_preparation(singleton,projection_version) VALUES (true,1);
CREATE TABLE course_catalog_entries (
  course_id text PRIMARY KEY REFERENCES courses(id) ON DELETE RESTRICT,
  snapshot_id uuid NOT NULL,
  projection_version integer NOT NULL CHECK (projection_version > 0),
  generation uuid NOT NULL,
  received_at timestamptz NOT NULL,
  provider_id text NOT NULL,
  search_text text NOT NULL,
  content_minutes double precision CHECK (content_minutes >= 0 AND content_minutes < 'Infinity'::double precision),
  price_status text NOT NULL CHECK (price_status IN ('free','paid','subscription','unknown')),
  price_summary jsonb NOT NULL CHECK (jsonb_typeof(price_summary)='object'),
  FOREIGN KEY (course_id,snapshot_id) REFERENCES course_snapshots(course_id,id) ON DELETE RESTRICT
);
CREATE INDEX course_catalog_order_idx ON course_catalog_entries(received_at DESC,course_id COLLATE "C");
CREATE INDEX course_catalog_provider_order_idx ON course_catalog_entries(provider_id,received_at DESC,course_id COLLATE "C");
CREATE INDEX course_catalog_price_duration_idx ON course_catalog_entries(price_status,content_minutes);
-- Old binaries cannot maintain entries. Their committed pointer changes invalidate
-- readiness automatically; new writers install matching entries before commit.
CREATE FUNCTION invalidate_course_catalog_preparation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM courses c CROSS JOIN course_catalog_preparation p
    WHERE c.id=NEW.id AND c.current_snapshot_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM course_catalog_entries e WHERE e.course_id=c.id
        AND e.snapshot_id=c.current_snapshot_id AND e.projection_version=p.projection_version AND e.generation=p.generation
    )
  ) THEN
    UPDATE course_catalog_preparation SET complete=false,last_course_id=NULL;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER course_catalog_writer_guard
AFTER INSERT OR UPDATE OF current_snapshot_id ON courses DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION invalidate_course_catalog_preparation();
