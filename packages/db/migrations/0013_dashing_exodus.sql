CREATE TABLE "discovery_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equivalent_key" text NOT NULL,
	"taxonomy_version" text NOT NULL,
	"input" jsonb NOT NULL,
	"group_id" uuid,
	"state" text DEFAULT 'waiting-review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_proposals_equivalent_key_unique" UNIQUE("equivalent_key")
);
--> statement-breakpoint
CREATE TABLE "group_ai_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"policy_version" text NOT NULL,
	CONSTRAINT "group_ai_singleton" CHECK ("group_ai_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "group_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"input_hash" text NOT NULL,
	"input" jsonb NOT NULL,
	"state" text DEFAULT 'waiting-review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_analysis_input_hash_unique" UNIQUE("input_hash")
);
--> statement-breakpoint
CREATE TABLE "group_definition_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"group_id" uuid,
	"request_id" uuid,
	"parent_id" uuid,
	"data" jsonb NOT NULL,
	"binding" jsonb NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_review_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid,
	"definition_id" uuid,
	"request_id" uuid,
	"action" text NOT NULL,
	"operator" text NOT NULL,
	"note" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "placement_requests" DROP CONSTRAINT "placement_kind";--> statement-breakpoint
ALTER TABLE "discovery_proposals" ADD CONSTRAINT "discovery_proposals_taxonomy_version_placement_taxonomies_version_fk" FOREIGN KEY ("taxonomy_version") REFERENCES "public"."placement_taxonomies"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_proposals" ADD CONSTRAINT "discovery_proposals_group_id_comparison_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."comparison_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_analysis" ADD CONSTRAINT "group_analysis_group_id_comparison_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."comparison_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_definition_history" ADD CONSTRAINT "group_definition_history_proposal_id_discovery_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."discovery_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_definition_history" ADD CONSTRAINT "group_definition_history_group_id_comparison_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."comparison_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_definition_history" ADD CONSTRAINT "group_definition_history_request_id_placement_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."placement_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_review_history" ADD CONSTRAINT "group_review_history_proposal_id_discovery_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."discovery_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_review_history" ADD CONSTRAINT "group_review_history_definition_id_group_definition_history_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."group_definition_history"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_review_history" ADD CONSTRAINT "group_review_history_request_id_placement_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."placement_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "definition_model_request" ON "group_definition_history" USING btree ("request_id");--> statement-breakpoint
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_kind" CHECK ("placement_requests"."kind" in ('classify','evaluate','embed','discover','definition','assess'));--> statement-breakpoint
CREATE UNIQUE INDEX one_approved_definition ON group_definition_history(group_id) WHERE state = 'approved';
--> statement-breakpoint
ALTER TABLE group_definition_history ADD CONSTRAINT definition_parent FOREIGN KEY(parent_id) REFERENCES group_definition_history(id);
--> statement-breakpoint
CREATE FUNCTION group_ai_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Group AI history is retained'; END IF;
  IF TG_TABLE_NAME = 'group_review_history' THEN
    RAISE EXCEPTION 'Reviews are immutable';
  ELSIF TG_TABLE_NAME = 'group_definition_history' THEN
    IF (NEW.id, NEW.proposal_id, NEW.parent_id, NEW.request_id, NEW.data, NEW.binding, NEW.created_at) IS DISTINCT FROM (OLD.id, OLD.proposal_id, OLD.parent_id, OLD.request_id, OLD.data, OLD.binding, OLD.created_at) THEN
      RAISE EXCEPTION 'Definition inputs are immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'group_analysis' THEN
    IF (NEW.id, NEW.group_id, NEW.input_hash, NEW.input, NEW.created_at) IS DISTINCT FROM (OLD.id, OLD.group_id, OLD.input_hash, OLD.input, OLD.created_at) THEN
      RAISE EXCEPTION 'Analysis inputs are immutable';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER definition_history_immutable BEFORE UPDATE OR DELETE ON group_definition_history FOR EACH ROW EXECUTE FUNCTION group_ai_history_immutable();
--> statement-breakpoint
CREATE TRIGGER review_history_immutable BEFORE UPDATE OR DELETE ON group_review_history FOR EACH ROW EXECUTE FUNCTION group_ai_history_immutable();
--> statement-breakpoint
CREATE TRIGGER analysis_inputs_immutable BEFORE UPDATE OR DELETE ON group_analysis FOR EACH ROW EXECUTE FUNCTION group_ai_history_immutable();
