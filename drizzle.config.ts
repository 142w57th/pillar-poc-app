import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./src/server/storage/database-url";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
