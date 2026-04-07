import { getClientByUserId, listBrokerAccountsByUserId } from "@/server/storage/keyv-store";

export type LinkedBrokerAccount = {
  accountType: string;
  externalAccountId: string;
};

export async function listLinkedBrokerAccountByUserId(userId: string): Promise<LinkedBrokerAccount[]> {
  return listBrokerAccountsByUserId(userId);
}

export async function getPartyIdByUserId(userId: string): Promise<string | null> {
  const client = await getClientByUserId(userId);
  return client?.id ?? null;
}
