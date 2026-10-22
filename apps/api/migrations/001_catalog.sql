CREATE TABLE course_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (length(slug) <= 100 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 2000),
  category_id text NOT NULL CHECK (category_id IN ('code','design','data','business','language','tools')),
  target_level text CHECK (target_level IN ('beginner','intermediate','advanced','mixed')),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE courses (
  id text PRIMARY KEY,
  provider_id text NOT NULL CHECK (length(provider_id) <= 64 AND provider_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  provider_course_id text NOT NULL CHECK (length(btrim(provider_course_id)) BETWEEN 1 AND 200),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  source_url text NOT NULL CHECK (length(source_url) <= 2048 AND source_url ~ '^https?://[^[:space:]]+$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, provider_course_id),
  CHECK (id = provider_id || ':' || provider_course_id)
);
CREATE TABLE course_group_courses (
  group_id uuid NOT NULL REFERENCES course_groups(id) ON DELETE RESTRICT,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, course_id)
);
CREATE INDEX course_group_courses_course_id_idx ON course_group_courses(course_id);
