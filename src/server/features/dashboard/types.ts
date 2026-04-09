export type DashboardAccountSummary = {
  accountType: string;
  accountId: string;
};

export type DashboardAccountSnapshot = {
  accountType: string;
  accountId: string;
  totalMarketValue: number;
  totalCostBasis: number;
  cashBalance: number;
  buyingPower: number;
  cashAvailableForWithdrawal: number;
  accountValue: number;
  currency: string;
  calculatedAt: string;
};

export type DashboardAggregate = {
  totalMarketValue: number;
  totalCostBasis: number;
  cashBalance: number;
  buyingPower: number;
  cashAvailableForWithdrawal: number;
  accountValue: number;
  currency: string;
  calculatedAt: string | null;
};

export type DashboardResult = {
  aggregated: DashboardAggregate;
  accounts: DashboardAccountSnapshot[];
  meta: {
    clientId: string;
    accountCount: number;
    provider: "harbor";
    generatedAt: string;
  };
};

export type DashboardAccountsResult = {
  accounts: DashboardAccountSnapshot[];
  meta: {
    clientId: string;
    accountCount: number;
    provider: "harbor";
    generatedAt: string;
  };
};

export type LegacyBalancesResult = {
  aggregated: DashboardAggregate;
  accounts: DashboardAccountSnapshot[];
  meta: {
    clientId: string;
    accountCount: number;
    provider: "harbor";
    generatedAt: string;
  };
};
