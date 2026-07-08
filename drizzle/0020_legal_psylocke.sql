ALTER TABLE "contributions" ALTER COLUMN "currency" SET DEFAULT 'NGN';--> statement-breakpoint
ALTER TABLE "disbursements" ALTER COLUMN "currency" SET DEFAULT 'NGN';--> statement-breakpoint
UPDATE "contributions" SET "currency" = 'NGN' WHERE "currency" = 'USD';--> statement-breakpoint
UPDATE "disbursements" SET "currency" = 'NGN' WHERE "currency" = 'USD';
