import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { appUsers } from "@/server/db/schema";
import { getStorageMode, registerInMemoryReset } from "@/server/storage/storage-mode";

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

// --- In-memory store (used when no DB is configured) ---

const DEMO_EMAIL = "demo@pillar.app";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD?.trim() || "password";
const DEMO_PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD, 10);

function createDemoUser(): AppUser {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    email: DEMO_EMAIL,
    passwordHash: DEMO_PASSWORD_HASH,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

let memoryUsersById = new Map<string, AppUser>();
let memoryUsersByEmail = new Map<string, AppUser>();

function seedMemoryStore() {
  memoryUsersById = new Map();
  memoryUsersByEmail = new Map();
  const demo = createDemoUser();
  memoryUsersById.set(demo.id, demo);
  memoryUsersByEmail.set(demo.email, demo);
}

if (getStorageMode() === "memory") {
  seedMemoryStore();
  registerInMemoryReset(seedMemoryStore);
}

// --- Public API ---

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  if (getStorageMode() === "memory") {
    return memoryUsersByEmail.get(normalizeEmail(email)) ?? null;
  }
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const [row] = await db.select().from(appUsers).where(eq(appUsers.email, normalizedEmail)).limit(1);
  return row ? mapRow(row) : null;
}

export async function findUserById(id: string): Promise<AppUser | null> {
  if (getStorageMode() === "memory") {
    return memoryUsersById.get(id) ?? null;
  }
  const db = getDb();
  const [row] = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  status?: AppUserStatus;
}): Promise<AppUser> {
  const normalizedEmail = normalizeEmail(params.email);

  if (getStorageMode() === "memory") {
    if (memoryUsersByEmail.has(normalizedEmail)) {
      throw new Error("An account with this email already exists.");
    }
    const now = new Date().toISOString();
    const user: AppUser = {
      id: randomUUID(),
      email: normalizedEmail,
      passwordHash: params.passwordHash,
      status: params.status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    memoryUsersById.set(user.id, user);
    memoryUsersByEmail.set(user.email, user);
    return user;
  }

  const db = getDb();
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
