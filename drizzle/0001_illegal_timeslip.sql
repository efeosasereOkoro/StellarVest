CREATE TABLE "kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"pathname" text NOT NULL,
	"url" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text,
	"size" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
