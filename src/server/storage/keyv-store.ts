import { randomUUID } from "node:crypto";

import Keyv from "keyv";
import { getDatabaseUrlOrNull, getStorageMode, registerInMemoryReset } from "@/server/storage/storage-mode";

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

type KVStoreData = {
  version: 2;
  clients: ClientRecord[];
  brokerAccounts: BrokerAccountRecord[];
  oauthTokens: OAuthTokenRecord[];
};

const STORE_KEY = "app:kv-store:data";
let keyv: Keyv<KVStoreData> | null = null;

function resolveKeyvStoreUrl(): string | null {
  const keyvUrl = process.env.KEYV_POSTGRES_URL?.trim();
  if (keyvUrl) {
    return keyvUrl;
  }
  return getDatabaseUrlOrNull();
}

function getKeyv() {
  if (!keyv) {
    const url = resolveKeyvStoreUrl();
    if (url && getStorageMode() === "postgres") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("@keyv/postgres");
      const KeyvPostgres = mod.default ?? mod.KeyvPostgres ?? mod;
      keyv = new Keyv<KVStoreData>({ store: new KeyvPostgres(url) });
    } else {
      keyv = new Keyv<KVStoreData>();
    }
  }
  return keyv;
}

const EMPTY_STORE: KVStoreData = {
  version: 2,
  clients: [],
  brokerAccounts: [],
  oauthTokens: [],
};

let writeQueue: Promise<void> = Promise.resolve();

function cloneStore(data?: Partial<KVStoreData>): KVStoreData {
  return {
    version: 2,
    clients: (data?.clients ?? []).filter((client): client is ClientRecord => Boolean(client.userId)),
    brokerAccounts: data?.brokerAccounts ?? [],
    oauthTokens: data?.oauthTokens ?? [],
  };
}

async function readStore(): Promise<KVStoreData> {
  const parsed = (await getKeyv().get(STORE_KEY)) as Partial<KVStoreData> | undefined;
  if (!parsed) {
    return structuredClone(EMPTY_STORE);
  }
  return cloneStore(parsed);
}

async function writeStore(data: KVStoreData) {
  await getKeyv().set(STORE_KEY, data);
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

if (getStorageMode() === "memory") {
  registerInMemoryReset(() => {
    getKeyv().clear();
    writeQueue = Promise.resolve();
  });
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

export async function listBrokerAccountsByClientId(clientId: string) {
  const store = await readStore();

  return store.brokerAccounts
    .filter((item) => item.clientId === clientId)
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

export async function upsertBrokerAccountForClientId(clientId: string, accountType: string, externalAccountId: string) {
  await mutateStore((store) => {
    const now = new Date().toISOString();
    const client = store.clients.find((item) => item.id === clientId);
    if (!client) {
      throw new Error(`No client found for id "${clientId}".`);
    }

    client.updatedAt = now;

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

export async function getCurrentClient(userId: string) {
  return getClientByUserId(userId);
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
