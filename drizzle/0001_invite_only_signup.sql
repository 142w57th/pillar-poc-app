CREATE TABLE IF NOT EXISTS "app_invites" (
	"email" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
