import { resolve } from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), "src/server/.env"), override: false });

export type StorageMode = "postgres" | "memory";

let resolvedMode: StorageMode | null = null;
let resolvedUrl: string | null | undefined = undefined;

function resolveFromEnv(): { mode: StorageMode; url: string | null } {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return { mode: "postgres", url };
  }

  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim() || "5432";
  const database = process.env.DB_NAME?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD?.trim();

  if (host && database && user && password) {
    const built = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    return { mode: "postgres", url: built };
  }

  return { mode: "memory", url: null };
}

function ensureResolved() {
  if (resolvedMode === null) {
    const result = resolveFromEnv();
    resolvedMode = result.mode;
    resolvedUrl = result.url;
  }
}

export function getStorageMode(): StorageMode {
  ensureResolved();
  return resolvedMode!;
}

export function getDatabaseUrlOrNull(): string | null {
  ensureResolved();
  return resolvedUrl ?? null;
}

type ResetCallback = () => void;
const resetCallbacks: ResetCallback[] = [];

export function registerInMemoryReset(callback: ResetCallback) {
  resetCallbacks.push(callback);
}

export function clearInMemoryStores() {
  if (getStorageMode() !== "memory") {
    throw new Error("clearInMemoryStores() is only available in memory mode.");
  }
  for (const callback of resetCallbacks) {
    callback();
  }
}
