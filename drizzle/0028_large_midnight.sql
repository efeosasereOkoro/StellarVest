ALTER TABLE "waitlist_signups" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "marketing_consent" boolean DEFAULT false NOT NULL;