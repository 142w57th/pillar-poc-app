import dotenv from "dotenv";
import { resolve } from "node:path";

import { upsertBrokerAccountForUserId } from "@/server/storage/kv-store";

dotenv.config({ path: resolve(process.cwd(), "src/server/.env"), override: false });

const DEFAULT_ACCOUNT_SEED = [
  { accountType: "equity", externalAccountId: "9c1e7a2b-4f8b-4f2c-9273-6a5e46c348f7" },
  { accountType: "crypto", externalAccountId: "6fdd9c62-99e8-42d8-9f3d-4fbefccae1a4" },
  { accountType: "event-contract", externalAccountId: "b8271cf9-4de9-4889-a489-d66fef50e782" },
] as const;

const DEMO_USER_ID = process.env.DEMO_USER_ID ?? "31f44327-82c4-4e7f-a6c5-362c230243b1";

async function upsertBrokerAccount(userId: string, accountType: string, externalAccountId: string) {
  await upsertBrokerAccountForUserId(userId, accountType, externalAccountId);
}

export async function seedBrokerAccount() {
  await Promise.all(DEFAULT_ACCOUNT_SEED.map((item) => upsertBrokerAccount(DEMO_USER_ID, item.accountType, item.externalAccountId)));
}

async function run() {
  await seedBrokerAccount();
}

if (process.argv[1]?.endsWith("seed.ts")) {
  run()
    .then(() => {
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("Seed failed", error);
      process.exit(1);
    });
}
