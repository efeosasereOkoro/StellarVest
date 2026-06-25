CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"escrow_instructions" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
