import { drizzle } from "drizzle-orm/node-postgres";

import { getPostgresPool } from "@/server/storage/postgres";

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    db = drizzle(getPostgresPool());
  }
  return db;
}
