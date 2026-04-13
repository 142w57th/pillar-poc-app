import { check, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appUsers = pgTable(
  "app_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("app_users_status_check", sql`${table.status} IN ('ACTIVE', 'DISABLED')`)],
);

export const keyv = pgTable("keyv", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value"),
});
