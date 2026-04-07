import { getHarborProvider } from "@/server/integrations/harbor/provider";
import { getPartyIdByUserId, listLinkedBrokerAccountByUserId } from "@/server/features/dashboard/repository";
import { getCurrentClient } from "@/server/storage/keyv-store";
import {
  DashboardAccountSnapshot,
  DashboardAccountsResult,
  DashboardResult,
  LegacyBalancesResult,
} from "@/server/features/dashboard/types";

type DashboardErrorCode =
  | "NO_LINKED_ACCOUNTS"
  | "INVALID_ACCOUNT_TYPE"
  | "HARBOR_AUTH_FAILED"
  | "HARBOR_BALANCES_FETCH_FAILED"
  | "SERVER_CONFIG_ERROR";

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

function normalizeAccountType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
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

async function resolveCurrentClientOrThrow() {
  const client = await getCurrentClient();
  if (!client) {
    throw new DashboardServiceError("SERVER_CONFIG_ERROR", "No onboarded client found in keyv store.", 404);
  }

  return client;
}

async function getLinkedAccountsOrThrow() {
  const client = await resolveCurrentClientOrThrow();
  const harborProvider = getHarborProvider();
  const linkedAccount = await listLinkedBrokerAccountByUserId(client.userId);

  if (linkedAccount.length === 0) {
    throw new DashboardServiceError(
      "NO_LINKED_ACCOUNTS",
      `No linked broker account record found for client ${client.id}. Ensure key-value mappings are seeded first.`,
      404,
    );
  }

  return { client, harborProvider, linkedAccount };
}

export async function getDashboardSnapshot(): Promise<DashboardResult> {
  const { client, harborProvider, linkedAccount } = await getLinkedAccountsOrThrow();

  try {
    const partyId = await getPartyIdByUserId(client.userId);
    if (!partyId) {
      throw new DashboardServiceError("SERVER_CONFIG_ERROR", `No party id found for client ${client.id}.`, 500);
    }

    const response = await harborProvider.fetchBalanceByPartyId(partyId);
    const calculatedAt = latestDate([response.data.calculatedAt]);
    const accounts = linkedAccount.map((item) => ({
      accountType: item.accountType,
      accountId: item.externalAccountId,
    }));

    return {
      aggregated: {
        totalMarketValue: parseMoney(response.data.totalMarketValue),
        totalCostBasis: parseMoney(response.data.totalCostBasis),
        cashBalance: parseMoney(response.data.cashBalance),
        buyingPower: parseMoney(response.data.buyingPower),
        cashAvailableForWithdrawal: parseMoney(response.data.cashAvailableForWithdrawal),
        accountValue: parseMoney(response.data.accountValue),
        currency: response.data.currency || "USD",
        calculatedAt,
      },
      accounts,
      meta: {
        userId: client.userId,
        accountCount: accounts.length,
        provider: "harbor",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    throw toDashboardServiceError(error);
  }
}

export async function getDashboardAccountBalances(): Promise<DashboardAccountsResult> {
  const { client, harborProvider, linkedAccount } = await getLinkedAccountsOrThrow();

  try {
    const accounts = await Promise.all(
      linkedAccount.map(async (record) => {
        const response = await harborProvider.fetchBalanceByAccountId(record.externalAccountId);
        return toAccountSnapshot(record.accountType, response);
      }),
    );

    return {
      accounts,
      meta: {
        userId: client.userId,
        accountCount: accounts.length,
        provider: "harbor",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    throw toDashboardServiceError(error);
  }
}

export async function getBalancesSnapshot(): Promise<LegacyBalancesResult> {
  const accountDetails = await getDashboardAccountBalances();
  return {
    aggregated: buildAggregate(accountDetails.accounts),
    accounts: accountDetails.accounts,
    meta: accountDetails.meta,
  };
}

export async function getDashboardAccountBalanceByType(
  accountType: string,
): Promise<DashboardAccountsResult> {
  const { client, harborProvider, linkedAccount } = await getLinkedAccountsOrThrow();
  const normalizedAccountType = normalizeAccountType(accountType);
  const matchedAccount = linkedAccount.find(
    (account) => normalizeAccountType(account.accountType) === normalizedAccountType,
  );

  if (!matchedAccount) {
    throw new DashboardServiceError(
      "INVALID_ACCOUNT_TYPE",
      `No linked account found for accountType "${accountType}".`,
      404,
    );
  }

  try {
    const response = await harborProvider.fetchBalanceByAccountId(matchedAccount.externalAccountId);
    const accountSnapshot = toAccountSnapshot(matchedAccount.accountType, response);
    return {
      accounts: [accountSnapshot],
      meta: {
        userId: client.userId,
        accountCount: 1,
        provider: "harbor",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    throw toDashboardServiceError(error);
  }
}
