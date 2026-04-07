import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import dotenv from "dotenv";
import Keyv from "keyv";

dotenv.config({ path: resolve(process.cwd(), "src/server/.env"), override: false });

type ClientRecord = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type BrokerAccountRecord = {
  id: string;
  clientId: string;
  accountType: string;
  externalAccountId: string;
  createdAt: string;
  updatedAt: string;
};

type OAuthTokenRecord = {
  id: string;
  provider: string;
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  scope: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderRecord = {
  id: string;
  userId: string;
  accountId: string;
  provider: "mock" | "harbor";
  orderId: string;
  status: "accepted" | "rejected" | "pending";
  submittedAt: string;
  instrumentSymbol: string;
  assetClass: "Equity" | "Crypto" | "Event Contract";
  side: "BUY" | "SELL";
  amountUsd: number;
  pricePerUnit: number;
  eventSide?: "YES" | "NO";
  estimatedUnits?: number;
  estimatedMaxReturnUsd?: number;
  providerReference?: string;
  createdAt: string;
  updatedAt: string;
};

type KVStoreData = {
  version: 1;
  clients: ClientRecord[];
  brokerAccounts: BrokerAccountRecord[];
  oauthTokens: OAuthTokenRecord[];
  orders: OrderRecord[];
};

const STORE_KEY = "app:kv-store:data";
const keyv = new Keyv<KVStoreData>();

const EMPTY_STORE: KVStoreData = {
  version: 1,
  clients: [],
  brokerAccounts: [],
  oauthTokens: [],
  orders: [],
};

let writeQueue: Promise<void> = Promise.resolve();

async function readStore(): Promise<KVStoreData> {
  const parsed = (await keyv.get(STORE_KEY)) as Partial<KVStoreData> | undefined;

  if (!parsed) {
    return structuredClone(EMPTY_STORE);
  }

  return {
    version: 1,
    clients: parsed.clients ?? [],
    brokerAccounts: parsed.brokerAccounts ?? [],
    oauthTokens: parsed.oauthTokens ?? [],
    orders: parsed.orders ?? [],
  };
}

async function writeStore(data: KVStoreData) {
  await keyv.set(STORE_KEY, data);
}

async function mutateStore<T>(mutator: (data: KVStoreData) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  };

  const current = writeQueue.then(run, run);
  writeQueue = current.then(
    () => undefined,
    () => undefined,
  );
  return current;
}

export async function listBrokerAccountsByUserId(userId: string) {
  const store = await readStore();
  const client = store.clients.find((item) => item.userId === userId);

  if (!client) {
    return [];
  }

  return store.brokerAccounts
    .filter((item) => item.clientId === client.id)
    .sort((a, b) => a.accountType.localeCompare(b.accountType))
    .map((item) => ({
      accountType: item.accountType,
      externalAccountId: item.externalAccountId,
    }));
}

export async function upsertBrokerAccountForUserId(userId: string, accountType: string, externalAccountId: string) {
  await mutateStore((store) => {
    const now = new Date().toISOString();

    let client = store.clients.find((item) => item.userId === userId);
    if (!client) {
      client = {
        id: randomUUID(),
        userId,
        createdAt: now,
        updatedAt: now,
      };
      store.clients.push(client);
    } else {
      client.updatedAt = now;
    }

    const existing = store.brokerAccounts.find(
      (item) => item.clientId === client.id && item.accountType === accountType,
    );

    if (existing) {
      existing.externalAccountId = externalAccountId;
      existing.updatedAt = now;
      return;
    }

    store.brokerAccounts.push({
      id: randomUUID(),
      clientId: client.id,
      accountType,
      externalAccountId,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function getClientByUserId(userId: string) {
  const store = await readStore();
  return store.clients.find((item) => item.userId === userId) ?? null;
}

export async function getCurrentClient() {
  const store = await readStore();
  if (store.clients.length === 0) {
    return null;
  }

  const sorted = [...store.clients].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return sorted[0] ?? null;
}

export async function createClientForUserId(userId: string, clientId?: string) {
  return mutateStore((store) => {
    const existing = store.clients.find((item) => item.userId === userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const client: ClientRecord = {
      id: clientId ?? randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    store.clients.push(client);
    return client;
  });
}

export async function getOAuthToken(provider: string) {
  const store = await readStore();
  return store.oauthTokens.find((item) => item.provider === provider) ?? null;
}

export async function upsertOAuthToken(params: {
  provider: string;
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  scope: string | null;
}) {
  await mutateStore((store) => {
    const now = new Date().toISOString();
    const existing = store.oauthTokens.find((item) => item.provider === params.provider);

    if (existing) {
      existing.accessToken = params.accessToken;
      existing.tokenType = params.tokenType;
      existing.expiresAt = params.expiresAt;
      existing.scope = params.scope;
      existing.updatedAt = now;
      return;
    }

    store.oauthTokens.push({
      id: randomUUID(),
      provider: params.provider,
      accessToken: params.accessToken,
      tokenType: params.tokenType,
      expiresAt: params.expiresAt,
      scope: params.scope,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function appendOrderForUser(params: {
  userId: string;
  accountId: string;
  provider: "mock" | "harbor";
  orderId: string;
  status: "accepted" | "rejected" | "pending";
  submittedAt: string;
  instrumentSymbol: string;
  assetClass: "Equity" | "Crypto" | "Event Contract";
  side: "BUY" | "SELL";
  amountUsd: number;
  pricePerUnit: number;
  eventSide?: "YES" | "NO";
  estimatedUnits?: number;
  estimatedMaxReturnUsd?: number;
  providerReference?: string;
}) {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    const record: OrderRecord = {
      id: randomUUID(),
      userId: params.userId,
      accountId: params.accountId,
      provider: params.provider,
      orderId: params.orderId,
      status: params.status,
      submittedAt: params.submittedAt,
      instrumentSymbol: params.instrumentSymbol,
      assetClass: params.assetClass,
      side: params.side,
      amountUsd: params.amountUsd,
      pricePerUnit: params.pricePerUnit,
      eventSide: params.eventSide,
      estimatedUnits: params.estimatedUnits,
      estimatedMaxReturnUsd: params.estimatedMaxReturnUsd,
      providerReference: params.providerReference,
      createdAt: now,
      updatedAt: now,
    };

    store.orders.push(record);
    return record;
  });
}

export async function listOrdersByUserId(userId: string) {
  const store = await readStore();

  return store.orders
    .filter((item) => item.userId === userId)
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
    .map((item) => ({
      accountId: item.accountId,
      provider: item.provider,
      orderId: item.orderId,
      status: item.status,
      submittedAt: item.submittedAt,
      instrumentSymbol: item.instrumentSymbol,
      assetClass: item.assetClass,
      side: item.side,
      amountUsd: item.amountUsd,
      pricePerUnit: item.pricePerUnit,
      eventSide: item.eventSide,
      estimatedUnits: item.estimatedUnits,
      estimatedMaxReturnUsd: item.estimatedMaxReturnUsd,
      providerReference: item.providerReference,
    }));
}
