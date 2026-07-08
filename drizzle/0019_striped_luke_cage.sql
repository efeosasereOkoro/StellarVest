DROP TABLE IF EXISTS "syndicates" CASCADE;--> statement-breakpoint
ALTER TABLE "investor_cohorts" DROP COLUMN IF EXISTS "syndicate_id";
