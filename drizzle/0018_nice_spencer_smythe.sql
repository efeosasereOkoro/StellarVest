ALTER TABLE "contributions" DROP CONSTRAINT "contributions_deal_id_user_id_unique";--> statement-breakpoint
ALTER TABLE "contributions" ALTER COLUMN "deal_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "investor_cohort_id" uuid;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_investor_cohort_id_investor_cohorts_id_fk" FOREIGN KEY ("investor_cohort_id") REFERENCES "public"."investor_cohorts"("id") ON DELETE no action ON UPDATE no action;