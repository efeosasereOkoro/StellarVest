CREATE TYPE "public"."contribution_status" AS ENUM('pledged', 'paid', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"investor_email" text,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"reference" text NOT NULL,
	"status" "contribution_status" DEFAULT 'pledged' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "contributions_deal_id_user_id_unique" UNIQUE("deal_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;