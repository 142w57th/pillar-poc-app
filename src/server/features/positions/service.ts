import { getHarborProvider } from "@/server/integrations/harbor/provider";
import { getCurrentPartyId, listLinkedBrokerAccounts } from "@/server/features/dashboard/repository";
import type { PositionsResult } from "@/server/features/positions/types";
import { toCanonicalAssetClassCode } from "@/lib/account-asset-class";

type PositionsErrorCode = "POSITIONS_FETCH_FAILED" | "SERVER_CONFIG_ERROR";

export class PositionsServiceError extends Error {
  code: PositionsErrorCode;
  status: number;

  constructor(code: PositionsErrorCode, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type GetPositionsFilters = {
  assetClass?: string;
  symbol?: string;
  scope?: "party" | "account";
};

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

function positionMatchesAssetClass(positionAssetClass: string, assetClass: string | undefined) {
  if (!assetClass) return true;
  if (assetClass === "EQUITY") return positionAssetClass === "Equity";
  if (assetClass === "CRYPTO") return positionAssetClass === "Crypto";
  if (assetClass === "OPTION" || assetClass === "EVENT_CONTRACT") return false;
  return true;
}

function emptyPositionsResult(): PositionsResult {
  return {
    positions: [],
    meta: {
      count: 0,
      provider: "harbor",
      source: "harbor",
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function getPositions(userId: string, filters?: GetPositionsFilters): Promise<PositionsResult> {
  const harborProvider = getHarborProvider();

  try {
    const scope = filters?.scope === "account" ? "account" : "party";
    const linkedAccounts = await listLinkedBrokerAccounts(userId);
    const normalizedAssetClass = normalizeAssetClass(filters?.assetClass);
    const normalizedSymbol = filters?.symbol?.trim().toUpperCase();
    const filteredAccounts = linkedAccounts.filter((account) =>
      accountTypeMatchesAssetClass(account.accountType, normalizedAssetClass),
    );
    if (filteredAccounts.length === 0) {
      return emptyPositionsResult();
    }

    if (scope === "account") {
      const accountResponses = await Promise.all(
        filteredAccounts.map((account) => harborProvider.fetchPositions(account.externalAccountId)),
      );
      const positions = accountResponses
        .flatMap((response) => response.positions)
        .filter((position) => positionMatchesAssetClass(position.assetClass, normalizedAssetClass));
      const filteredPositions = normalizedSymbol
        ? positions.filter((position) => position.symbol.toUpperCase() === normalizedSymbol)
        : positions;
      const source = accountResponses[0]?.meta.source ?? "harbor";
      const generatedAt = accountResponses[0]?.meta.generatedAt ?? new Date().toISOString();

      return {
        positions: filteredPositions,
        meta: {
          count: filteredPositions.length,
          provider: "harbor",
          source,
          generatedAt,
        },
      };
    }

    const partyId = await getCurrentPartyId(userId);
    if (!partyId) {
      return emptyPositionsResult();
    }

    const response = await harborProvider.fetchPositionsByParty(partyId);
    const positions = response.positions.filter((position) =>
      positionMatchesAssetClass(position.assetClass, normalizedAssetClass),
    );
    const filteredPositions = normalizedSymbol
      ? positions.filter((position) => position.symbol.toUpperCase() === normalizedSymbol)
      : positions;
    const source = response.meta.source ?? "harbor";
    const generatedAt = response.meta.generatedAt ?? new Date().toISOString();

    return {
      positions: filteredPositions,
      meta: {
        count: filteredPositions.length,
        provider: "harbor",
        source,
        generatedAt,
      },
    };
  } catch (error: unknown) {
    if (error instanceof PositionsServiceError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unexpected positions integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new PositionsServiceError("SERVER_CONFIG_ERROR", message, 500);
    }

    throw new PositionsServiceError("POSITIONS_FETCH_FAILED", message, 502);
  }
}
