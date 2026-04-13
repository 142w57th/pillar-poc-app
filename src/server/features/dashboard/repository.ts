import { getCurrentClient, listBrokerAccountsByClientId } from "@/server/storage/keyv-store";

export type LinkedBrokerAccount = {
  accountType: string;
  externalAccountId: string;
};

export async function listLinkedBrokerAccounts(userId: string): Promise<LinkedBrokerAccount[]> {
  const client = await getCurrentClient(userId);
  if (!client) {
    return [];
  }
  return listBrokerAccountsByClientId(client.id);
}

export async function getCurrentPartyId(userId: string): Promise<string | null> {
  const client = await getCurrentClient(userId);
  return client?.id ?? null;
}
