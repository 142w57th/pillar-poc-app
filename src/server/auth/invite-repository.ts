import { eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { appInvites } from "@/server/db/schema";
import { getStorageMode, registerInMemoryReset } from "@/server/storage/storage-mode";

import { normalizeEmail } from "./user-repository";

// --- In-memory store (memory mode allows all emails by default) ---

let memoryInvites = new Set<string>();

function resetMemoryInvites() {
  memoryInvites = new Set();
}

if (getStorageMode() === "memory") {
  registerInMemoryReset(resetMemoryInvites);
}

// --- Public API ---

export async function isEmailInvited(email: string): Promise<boolean> {
  if (getStorageMode() === "memory") {
    return true;
  }
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const [row] = await db
    .select({ email: appInvites.email })
    .from(appInvites)
    .where(eq(appInvites.email, normalizedEmail))
    .limit(1);
  return Boolean(row);
}

export async function createInvite(email: string): Promise<{ email: string; created: boolean }> {
  const normalizedEmail = normalizeEmail(email);

  if (getStorageMode() === "memory") {
    const created = !memoryInvites.has(normalizedEmail);
    memoryInvites.add(normalizedEmail);
    return { email: normalizedEmail, created };
  }

  const db = getDb();
  const [row] = await db
    .insert(appInvites)
    .values({ email: normalizedEmail })
    .onConflictDoNothing({ target: appInvites.email })
    .returning({ email: appInvites.email });

  return {
    email: normalizedEmail,
    created: Boolean(row),
  };
}
