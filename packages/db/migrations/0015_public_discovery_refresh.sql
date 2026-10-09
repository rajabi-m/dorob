CREATE FUNCTION dorob_normalize_search(input text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT trim(regexp_replace(regexp_replace(regexp_replace(
    translate(lower(normalize(input, NFKC)), 'يىك۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', 'ییک01234567890123456789'),
    '[ً-ٰٟـ]', '', 'g'), '[^[:alnum:]]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;
--> statement-breakpoint
CREATE FUNCTION dorob_public_search(input text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT value || CASE WHEN (' ' || value || ' ') ~ ' (python|پایتون) ' THEN ' python پایتون' ELSE '' END
    || CASE WHEN (' ' || value || ' ') ~ ' (javascript|js|جاوااسکریپت|جاوا اسکریپت) ' THEN ' javascript js جاوااسکریپت جاوا اسکریپت' ELSE '' END
    || CASE WHEN (' ' || value || ' ') ~ ' (n8n|ان ایت ان) ' THEN ' n8n ان ایت ان' ELSE '' END
  FROM (SELECT dorob_normalize_search(input) AS value) normalized
$$;
--> statement-breakpoint
ALTER TABLE ingestion_collections ADD COLUMN transport_mode text NOT NULL DEFAULT 'live' CHECK (transport_mode IN ('live','offline'));
--> statement-breakpoint
ALTER TABLE ingestion_collections ADD COLUMN refresh_opt_in text NOT NULL DEFAULT 'no' CHECK (refresh_opt_in IN ('yes','no'));
--> statement-breakpoint
CREATE TABLE refresh_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key text NOT NULL CONSTRAINT refresh_requests_request_key_unique UNIQUE, input_digest text NOT NULL,
  input jsonb NOT NULL, collection_ids jsonb NOT NULL, operator text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE TRIGGER refresh_requests_immutable BEFORE UPDATE OR DELETE ON refresh_requests FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
