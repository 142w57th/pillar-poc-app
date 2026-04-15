import { getHarborProvider } from "@/server/integrations/harbor/provider";
import { getCurrentPartyId, listLinkedBrokerAccounts } from "@/server/features/dashboard/repository";
import type {
  DashboardAccountSnapshot,
  DashboardAccountsResult,
  DashboardResult,
  LegacyBalancesResult,
} from "@/server/features/dashboard/types";
import { toCanonicalAssetClassCode } from "@/lib/account-asset-class";

type DashboardErrorCode =
  | "NO_LINKED_ACCOUNTS"
  | "HARBOR_AUTH_FAILED"
  | "HARBOR_BALANCES_FETCH_FAILED"
  | "SERVER_CONFIG_ERROR";

type GetBalancesFilters = {
  assetClass?: string;
  scope?: "party" | "account";
};

export class DashboardServiceError extends Error {
  code: DashboardErrorCode;
  status: number;

  constructor(code: DashboardErrorCode, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function parseMoney(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    return parseMoney(value);
  }
  return 0;
}

function latestDate(values: string[]) {
  const timestamps = values
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function buildAggregate(accounts: DashboardAccountSnapshot[]) {
  const primaryCurrency = accounts[0]?.currency ?? "USD";
  const calculatedAt = latestDate(accounts.map((item) => item.calculatedAt));

  return accounts.reduce(
    (sum, item) => ({
      totalMarketValue: sum.totalMarketValue + item.totalMarketValue,
      totalCostBasis: sum.totalCostBasis + item.totalCostBasis,
      cashBalance: sum.cashBalance + item.cashBalance,
      buyingPower: sum.buyingPower + item.buyingPower,
      cashAvailableForWithdrawal: sum.cashAvailableForWithdrawal + item.cashAvailableForWithdrawal,
      accountValue: sum.accountValue + item.accountValue,
      currency: primaryCurrency,
      calculatedAt,
    }),
    {
      totalMarketValue: 0,
      totalCostBasis: 0,
      cashBalance: 0,
      buyingPower: 0,
      cashAvailableForWithdrawal: 0,
      accountValue: 0,
      currency: primaryCurrency,
      calculatedAt,
    },
  );
}

function toAccountSnapshot(
  accountType: string,
  response: {
    data: {
      accountId: string;
      totalMarketValue: string;
      totalCostBasis: string;
      cashBalance: string;
      buyingPower: string;
      cashAvailableForWithdrawal: string;
      accountValue: string;
      currency: string;
      calculatedAt: string;
    };
  },
): DashboardAccountSnapshot {
  return {
    accountType,
    accountId: response.data.accountId,
    totalMarketValue: parseMoney(response.data.totalMarketValue),
    totalCostBasis: parseMoney(response.data.totalCostBasis),
    cashBalance: parseMoney(response.data.cashBalance),
    buyingPower: parseMoney(response.data.buyingPower),
    cashAvailableForWithdrawal: parseMoney(response.data.cashAvailableForWithdrawal),
    accountValue: parseMoney(response.data.accountValue),
    currency: response.data.currency,
    calculatedAt: response.data.calculatedAt,
  };
}

function toDashboardServiceError(error: unknown): DashboardServiceError {
  if (error instanceof DashboardServiceError) {
    return error;
  }

  console.error("[dashboard] Harbor balance fetch failed:", error);
  const message = error instanceof Error ? error.message : "Unexpected Harbor integration error.";

  if (message.toLowerCase().includes("auth")) {
    return new DashboardServiceError("HARBOR_AUTH_FAILED", message, 502);
  }

  if (message.toLowerCase().includes("required")) {
    return new DashboardServiceError("SERVER_CONFIG_ERROR", message, 500);
  }

  return new DashboardServiceError("HARBOR_BALANCES_FETCH_FAILED", message, 502);
}

function normalizeAssetClass(value: string | undefined) {
  return value?.trim().toUpperCase();
}

function accountTypeMatchesAssetClass(accountType: string, assetClass: string | undefined) {
  if (!assetClass) return true;
  const normalizedType = toCanonicalAssetClassCode(accountType);
  const normalizedAssetClass = toCanonicalAssetClassCode(assetClass);
  if (normalizedAssetClass) {
    return normalizedType === normalizedAssetClass;
  }
  if (assetClass === "OPTION" || assetClass === "EVENT_CONTRACT") return false;
  return true;
}

async function getLinkedAccountsOrThrow(userId: string) {
  const harborProvider = getHarborProvider();
  const partyId = await getCurrentPartyId(userId);
  const linkedAccount = await listLinkedBrokerAccounts(userId);
  if (linkedAccount.length === 0) {
    throw new DashboardServiceError(
      "NO_LINKED_ACCOUNTS",
      "No linked broker account found. Complete onboarding first.",
      404,
    );
  }
  if (!partyId) {
    throw new DashboardServiceError("NO_LINKED_ACCOUNTS", "No linked client found. Complete onboarding first.", 404);
  }
  return { harborProvider, linkedAccount, partyId };
}

export async function getDashboardSnapshot(userId: string): Promise<DashboardResult> {
  const { harborProvider, linkedAccount, partyId } = await getLinkedAccountsOrThrow(userId);

  try {
    const partyResponse = await harborProvider.fetchBalanceByPartyId(partyId);
    const partySummary = partyResponse.data.party;
    const calculatedAt = latestDate([partySummary.calculatedAt]);
    const fallbackCalculatedAt = calculatedAt ?? new Date().toISOString();
    const rawAccounts = Array.isArray(partyResponse.data.accounts) ? partyResponse.data.accounts : [];
    const partyAccountsById = new Map<string, Record<string, unknown>>();
    for (const account of rawAccounts) {
      if (!account || typeof account !== "object") continue;
      const candidate = account as Record<string, unknown>;
      const accountId = typeof candidate.accountId === "string" ? candidate.accountId : "";
      if (!accountId) continue;
      partyAccountsById.set(accountId, candidate);
    }

    const accounts = linkedAccount.map((linked) => {
      const matched = partyAccountsById.get(linked.externalAccountId);
      if (!matched) {
        return {
          accountType: linked.accountType,
          accountId: linked.externalAccountId,
          totalMarketValue: 0,
          totalCostBasis: 0,
          cashBalance: 0,
          buyingPower: 0,
          cashAvailableForWithdrawal: 0,
          accountValue: 0,
          currency: partySummary.currency || "USD",
          calculatedAt: fallbackCalculatedAt,
        } satisfies DashboardAccountSnapshot;
      }

      return {
        accountType: linked.accountType,
        accountId: linked.externalAccountId,
        totalMarketValue: parseNumericValue(matched.totalMarketValue),
        totalCostBasis: parseNumericValue(matched.totalCostBasis),
        cashBalance: parseNumericValue(matched.cashBalance),
        buyingPower: parseNumericValue(matched.buyingPower),
        cashAvailableForWithdrawal: parseNumericValue(matched.cashAvailableForWithdrawal),
        accountValue: parseNumericValue(matched.accountValue),
        currency: typeof matched.currency === "string" ? matched.currency : partySummary.currency || "USD",
        calculatedAt:
          typeof matched.calculatedAt === "string" && matched.calculatedAt
            ? matched.calculatedAt
            : fallbackCalculatedAt,
      } satisfies DashboardAccountSnapshot;
    });

    return {
      aggregated: {
        totalMarketValue: parseMoney(partySummary.totalMarketValue),
        totalCostBasis: parseMoney(partySummary.totalCostBasis),
        cashBalance: parseMoney(partySummary.cashBalance),
        buyingPower: parseMoney(partySummary.buyingPower),
        cashAvailableForWithdrawal: parseMoney(partySummary.cashAvailableForWithdrawal),
        accountValue: parseMoney(partySummary.accountValue),
        currency: partySummary.currency || "USD",
        calculatedAt,
      },
      accounts,
      meta: {
        clientId: partyId,
        accountCount: accounts.length,
        provider: "harbor",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    throw toDashboardServiceError(error);
  }
}

export async function getDashboardAccountBalances(
  userId: string,
  filters?: GetBalancesFilters,
): Promise<DashboardAccountsResult> {
  const { harborProvider, linkedAccount, partyId } = await getLinkedAccountsOrThrow(userId);

  try {
    const scope = filters?.scope === "account" ? "account" : "party";
    const normalizedAssetClass = normalizeAssetClass(filters?.assetClass);
    const accountsInScope =
      scope === "account"
        ? linkedAccount.filter((account) => accountTypeMatchesAssetClass(account.accountType, normalizedAssetClass))
        : linkedAccount;

    if (accountsInScope.length === 0) {
      return {
        accounts: [],
        meta: {
          clientId: partyId,
          accountCount: 0,
          provider: "harbor",
          generatedAt: new Date().toISOString(),
        },
      };
    }

    const accounts = await Promise.all(
      accountsInScope.map(async (record) => {
        const response = await harborProvider.fetchBalanceByAccountId(record.externalAccountId);
        return toAccountSnapshot(record.accountType, response);
      }),
    );

    return {
      accounts,
      meta: {
        clientId: partyId,
        accountCount: accounts.length,
        provider: "harbor",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    throw toDashboardServiceError(error);
  }
}

export async function getBalancesSnapshot(userId: string, filters?: GetBalancesFilters): Promise<LegacyBalancesResult> {
  const accountDetails = await getDashboardAccountBalances(userId, filters);
  return {
    aggregated: buildAggregate(accountDetails.accounts),
    accounts: accountDetails.accounts,
    meta: accountDetails.meta,
  };
}
