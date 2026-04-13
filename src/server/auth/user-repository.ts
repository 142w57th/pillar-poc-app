import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { appUsers } from "@/server/db/schema";

export type AppUserStatus = "ACTIVE" | "DISABLED";

export type AppUser = {
  id: string;
  email: string;
  passwordHash: string;
  status: AppUserStatus;
  createdAt: string;
  updatedAt: string;
};

function toIso(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(String(value)).toISOString();
}

function mapRow(row: typeof appUsers.$inferSelect): AppUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    status: row.status as AppUserStatus,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const [row] = await db.select().from(appUsers).where(eq(appUsers.email, normalizedEmail)).limit(1);
  return row ? mapRow(row) : null;
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const db = getDb();
  const [row] = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  status?: AppUserStatus;
}): Promise<AppUser> {
  const db = getDb();
  const normalizedEmail = normalizeEmail(params.email);
  const id = randomUUID();
  const status = params.status ?? "ACTIVE";
  const [row] = await db
    .insert(appUsers)
    .values({
      id,
      email: normalizedEmail,
      passwordHash: params.passwordHash,
      status,
    })
    .onConflictDoNothing({ target: appUsers.email })
    .returning();

  if (!row) {
    throw new Error("An account with this email already exists.");
  }

  return mapRow(row);
}
