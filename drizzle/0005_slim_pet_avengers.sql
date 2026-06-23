CREATE TABLE "allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"startup_cohort_id" uuid NOT NULL,
	"percentage" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allocations_pool_id_startup_cohort_id_unique" UNIQUE("pool_id","startup_cohort_id")
);
--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_pool_id_investment_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."investment_pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_startup_cohort_id_startup_cohorts_id_fk" FOREIGN KEY ("startup_cohort_id") REFERENCES "public"."startup_cohorts"("id") ON DELETE no action ON UPDATE no action;