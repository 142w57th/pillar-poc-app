import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

export type HarborBalanceData = {
  accountId: string;
  totalMarketValue: string;
  totalCostBasis: string;
  cashBalance: string;
  buyingPower: string;
  currency: string;
  cashAvailableForWithdrawal: string;
  accountValue: string;
  calculatedAt: string;
};

export type HarborBalanceResponse = {
  data: HarborBalanceData;
  meta: Record<string, unknown>;
};

export type HarborPartyBalanceData = Omit<HarborBalanceData, "accountId"> & {
  partyId: string;
};

export type HarborPartyBalanceResponse = {
  data: HarborPartyBalanceData;
  meta: Record<string, unknown>;
};

export async function fetchHarborBalanceByAccountId(accountId: string) {
  const config = getHarborConfig();
  const encodedAccountId = encodeURIComponent(accountId);
  const path = config.balancesPath.includes("{accountId}")
    ? config.balancesPath.replace("{accountId}", encodedAccountId)
    : `${config.balancesPath.replace(/\/+$/, "")}/${encodedAccountId}/balances`;
  return harborFetch<HarborBalanceResponse>(path);
}

export async function fetchHarborBalanceByPartyId(partyId: string) {
  const config = getHarborConfig();
  const path = `${config.partyBalancesPath}/${encodeURIComponent(partyId)}/balances`;
  return harborFetch<HarborPartyBalanceResponse>(path);
}
