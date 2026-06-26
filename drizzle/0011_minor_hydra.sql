CREATE TABLE "disbursements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"startup_cohort_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"note" text,
	"recorded_by_email" text,
	"disbursed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_startup_cohort_id_startup_cohorts_id_fk" FOREIGN KEY ("startup_cohort_id") REFERENCES "public"."startup_cohorts"("id") ON DELETE no action ON UPDATE no action;