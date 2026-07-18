ALTER TABLE "founder_profiles" ADD COLUMN "id_type" text;--> statement-breakpoint
ALTER TABLE "founder_profiles" ADD COLUMN "id_number" text;--> statement-breakpoint
ALTER TABLE "founder_profiles" ADD COLUMN "verification_status" text DEFAULT 'incomplete' NOT NULL;--> statement-breakpoint
ALTER TABLE "founder_profiles" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "founder_profiles" ADD COLUMN "reviewed_at" timestamp with time zone;