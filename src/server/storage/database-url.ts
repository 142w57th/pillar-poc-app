import { getDatabaseUrlOrNull } from "@/server/storage/storage-mode";

/**
 * Returns the Postgres connection URL or throws if no DB is configured.
 * Used by drizzle.config.ts (migrations) and any code that strictly requires Postgres.
 */
export function getDatabaseUrl() {
  const url = getDatabaseUrlOrNull();
  if (url) {
    return url;
  }

  throw new Error(
    "Postgres config is missing. Set DATABASE_URL or all of DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.",
  );
}
