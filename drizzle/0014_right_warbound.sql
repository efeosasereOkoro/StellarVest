ALTER TABLE "deals" ADD COLUMN "startup_id" uuid;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "funding_goal" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "valuation" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "terms" text;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_startup_id_startups_id_fk" FOREIGN KEY ("startup_id") REFERENCES "public"."startups"("id") ON DELETE no action ON UPDATE no action;