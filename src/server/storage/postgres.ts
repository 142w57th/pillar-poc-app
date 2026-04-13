import { Pool } from "pg";
import { getDatabaseUrl } from "@/server/storage/database-url";

let pool: Pool | null = null;

export function getPostgresPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }
  return pool;
}
