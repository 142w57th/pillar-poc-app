import { drizzle } from "drizzle-orm/node-postgres";

import { getPostgresPool } from "@/server/storage/postgres";
import { getStorageMode } from "@/server/storage/storage-mode";

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (getStorageMode() === "memory") {
    throw new Error("getDb() is not available in memory storage mode. No database is configured.");
  }
  if (!db) {
    db = drizzle(getPostgresPool());
  }
  return db;
}
