CREATE TABLE IF NOT EXISTS "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email"),
	CONSTRAINT "app_users_status_check" CHECK ("app_users"."status" IN ('ACTIVE', 'DISABLED'))
);

CREATE TABLE IF NOT EXISTS "keyv" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text
);
