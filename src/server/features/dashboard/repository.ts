import { getCurrentClient, listBrokerAccountsByClientId } from "@/server/storage/keyv-store";

export type LinkedBrokerAccount = {
  accountType: string;
  externalAccountId: string;
};

export async function listLinkedBrokerAccounts(): Promise<LinkedBrokerAccount[]> {
  const client = await getCurrentClient();
  if (!client) {
    return [];
  }
  return listBrokerAccountsByClientId(client.id);
}

export async function getCurrentPartyId(): Promise<string | null> {
  const client = await getCurrentClient();
  return client?.id ?? null;
}
