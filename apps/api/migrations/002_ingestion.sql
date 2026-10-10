CREATE TABLE course_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  submission_id text NOT NULL,
  acceptance_order integer NOT NULL CHECK (acceptance_order > 0),
  schema_version integer NOT NULL CHECK (schema_version = 3),
  checked_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  fact_hash text NOT NULL CHECK (fact_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  UNIQUE (course_id, submission_id), UNIQUE (course_id, acceptance_order), UNIQUE (course_id, id)
);
ALTER TABLE courses ADD COLUMN current_snapshot_id uuid;
ALTER TABLE courses ADD CONSTRAINT courses_same_snapshot_fk FOREIGN KEY (id, current_snapshot_id)
  REFERENCES course_snapshots(course_id, id) ON DELETE RESTRICT;
CREATE INDEX snapshots_history_idx ON course_snapshots(course_id, acceptance_order DESC);
CREATE TABLE thumbnail_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text NOT NULL UNIQUE CHECK (hash ~ '^[a-f0-9]{64}$'),
  profile text NOT NULL,
  storage_key text NOT NULL UNIQUE CHECK (storage_key ~ '^[a-f0-9]{64}\.webp$'),
  format text NOT NULL CHECK (format = 'webp'),
  width integer NOT NULL CHECK (width BETWEEN 1 AND 640),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 640),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 524288),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE thumbnail_attempts (
  snapshot_id uuid PRIMARY KEY REFERENCES course_snapshots(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending','missing','failed','ready')),
  failure_code text,
  lease_id uuid, lease_until timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  profile text,
  asset_id uuid REFERENCES thumbnail_assets(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'ready') = (asset_id IS NOT NULL)),
  CHECK ((lease_id IS NULL) = (lease_until IS NULL))
);
CREATE INDEX thumbnail_attempts_asset_idx ON thumbnail_attempts(asset_id);
CREATE TABLE thumbnail_uploads (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  staging_key text NOT NULL UNIQUE CHECK (staging_key ~ '^[a-f0-9]{64}\.webp$'),
  hash text NOT NULL CHECK (hash ~ '^[a-f0-9]{64}$'),
  profile text NOT NULL,
  width integer NOT NULL CHECK (width BETWEEN 1 AND 640),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 640),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 524288),
  expires_at timestamptz NOT NULL,
  consumed_snapshot_id uuid UNIQUE REFERENCES course_snapshots(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX thumbnail_uploads_expiry_idx ON thumbnail_uploads(expires_at) WHERE consumed_snapshot_id IS NULL;
