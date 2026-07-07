CREATE TYPE "public"."update_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "startup_updates" ADD COLUMN "status" "update_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "startup_updates" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "startup_updates" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
-- Backfill: updates that already existed were live under the pre-moderation
-- flow, so keep them visible to investors (approved) rather than hiding them.
UPDATE "startup_updates" SET "status" = 'approved', "reviewed_at" = now();