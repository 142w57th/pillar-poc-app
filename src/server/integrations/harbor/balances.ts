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

export type HarborPartyAccountBalanceData = {
  accountNumber: string;
  accountProviderId: string;
  currency: string;
  updatedOn: string;
  fundsAvailable: number;
  freeCreditBalance: number;
  cashBalances: {
    cashBalance: number;
    cashAvailable: number;
  };
  marginBalances: {
    marginBalance: number;
    buyingPower: number;
    cashAvailable: number;
  };
  sweepBalances: {
    sweepBalance: number;
  };
  otherBalances: {
    fedCallBalance: number;
    houseCallBalance: number;
    specialMiscellaneousBalances: number;
  };
};

export type HarborPartySummaryBalanceData = Omit<HarborBalanceData, "accountId"> & {
  partyId: string;
};

export type HarborPartyBalanceResponse = {
  data: {
    accounts: HarborPartyAccountBalanceData[];
    party: HarborPartySummaryBalanceData;
  };
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
  const encodedPartyId = encodeURIComponent(partyId);
  const path = config.partyBalancesPath.includes("{partyId}")
    ? config.partyBalancesPath.replace("{partyId}", encodedPartyId)
    : `${config.partyBalancesPath.replace(/\/+$/, "")}/${encodedPartyId}/balances`;
  return harborFetch<HarborPartyBalanceResponse>(path);
}
