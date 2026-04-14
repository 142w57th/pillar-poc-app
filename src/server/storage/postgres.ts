import { Pool } from "pg";
import { getDatabaseUrl } from "@/server/storage/database-url";
import { getStorageMode } from "@/server/storage/storage-mode";

let pool: Pool | null = null;

export function getPostgresPool() {
  if (getStorageMode() === "memory") {
    throw new Error("getPostgresPool() is not available in memory storage mode. No database is configured.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }
  return pool;
}
