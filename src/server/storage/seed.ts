import dotenv from "dotenv";
import { resolve } from "node:path";

import { createClient, upsertBrokerAccountForClientId } from "@/server/storage/keyv-store";

dotenv.config({ path: resolve(process.cwd(), "src/server/.env"), override: false });

const DEFAULT_ACCOUNT_SEED = [
  { accountType: "equity", externalAccountId: "acct-019d6eef-1e3b-7658-94c4-94d6d3a7446d" },
  { accountType: "crypto", externalAccountId: "acct-019d6eef-1f81-701f-b2ed-fdbae000300d" },
] as const;

const DEMO_PARTY_ID = process.env.DEMO_PARTY_ID ?? "pty-019d6eef-1d5b-7367-887d-91803a87e053";

async function upsertBrokerAccount(clientId: string, accountType: string, externalAccountId: string) {
  await upsertBrokerAccountForClientId(clientId, accountType, externalAccountId);
}

export async function seedBrokerAccount() {
  const client = await createClient(DEMO_PARTY_ID);
  await Promise.all(DEFAULT_ACCOUNT_SEED.map((item) => upsertBrokerAccount(client.id, item.accountType, item.externalAccountId)));
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
