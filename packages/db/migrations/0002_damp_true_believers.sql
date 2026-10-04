ALTER TABLE "workflow_runs" ADD COLUMN "build_job_id" uuid;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "finalize_job_id" uuid;