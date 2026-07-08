CREATE TABLE "portfolio_startups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"startup_cohort_id" uuid NOT NULL,
	"startup_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_startups_startup_cohort_id_startup_id_unique" UNIQUE("startup_cohort_id","startup_id")
);
--> statement-breakpoint
ALTER TABLE "portfolio_startups" ADD CONSTRAINT "portfolio_startups_startup_cohort_id_startup_cohorts_id_fk" FOREIGN KEY ("startup_cohort_id") REFERENCES "public"."startup_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_startups" ADD CONSTRAINT "portfolio_startups_startup_id_startups_id_fk" FOREIGN KEY ("startup_id") REFERENCES "public"."startups"("id") ON DELETE no action ON UPDATE no action;