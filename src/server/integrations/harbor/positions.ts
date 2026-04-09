import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

export type PositionAssetClass = "Equity" | "Crypto" | "Event Contract";

export type PositionSnapshot = {
  symbol: string;
  assetClass: PositionAssetClass;
  lastPrice: number;
  dayChangePercent: number;
  preMarketPrice: number;
  preMarketChangePercent: number;
  marketValue: number;
  investedValue: number;
  pnlPercent: number;
  pnlAmount: number;
  eventSide?: "YES" | "NO";
  eventYesPrice?: number;
  eventNoPrice?: number;
};

export type PositionsResponse = {
  positions: PositionSnapshot[];
  meta: {
    source: string;
    generatedAt: string;
  };
};

type HarborPositionAssetClass =
  | "EQUITY"
  | "OPTION"
  | "CRYPTO"
  | "MUTUAL_FUND"
  | "FIXED_INCOME"
  | "FUTURE"
  | "FOREX";

type HarborPositionRecord = {
  accountId: string;
  instrumentIdentifier: {
    symbol: string;
  };
  quantity: string;
  assetClass: HarborPositionAssetClass;
  marketValue: string;
  costBasis: string;
  unrealizedGainLossPercent: string;
  unrealizedGainLoss: string;
  todaysUnrealizedGainLossPercent: string;
};

type HarborPositionsDtoResponse = {
  data: HarborPositionRecord[];
  meta?: {
    pagination?: {
      page?: number;
      limit?: number;
      total?: number;
      totalPages?: number;
    };
  };
};

function toPositionAssetClass(assetClass: HarborPositionAssetClass): PositionAssetClass | null {
  if (assetClass === "EQUITY") return "Equity";
  if (assetClass === "CRYPTO") return "Crypto";
  if (assetClass === "OPTION") return "Event Contract";
  return null;
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function parseFixedTwoDecimals(value: string, fallback = 0) {
  return roundToTwoDecimals(parseNumber(value, fallback));
}

function resolveAccountPositionsPath(positionsPath: string, accountId: string) {
  const encodedAccountId = encodeURIComponent(accountId);
  return positionsPath.includes("{accountId}")
    ? positionsPath.replace("{accountId}", encodedAccountId)
    : `${positionsPath.replace(/\/+$/, "")}/${encodedAccountId}/positions`;
}

function resolvePartyPositionsPath(partyPositionsPath: string, partyId: string) {
  const encodedPartyId = encodeURIComponent(partyId);
  return partyPositionsPath.includes("{partyId}")
    ? partyPositionsPath.replace("{partyId}", encodedPartyId)
    : `${partyPositionsPath.replace(/\/+$/, "")}/${encodedPartyId}/positions`;
}

async function fetchPositionsByPath(path: string) {
  const response = await harborFetch<HarborPositionsDtoResponse>(path);
  const positions = response.data
    .map((item) => {
      const mappedAssetClass = toPositionAssetClass(item.assetClass);
      if (!mappedAssetClass) {
        return null;
      }

      const quantity = parseNumber(item.quantity, 0);
      const marketValue = parseNumber(item.marketValue, 0);
      const lastPrice = quantity > 0 ? marketValue / quantity : 0;

      return {
        symbol: item.instrumentIdentifier.symbol,
        assetClass: mappedAssetClass,
        lastPrice,
        dayChangePercent: parseFixedTwoDecimals(item.todaysUnrealizedGainLossPercent, 0),
        preMarketPrice: lastPrice,
        preMarketChangePercent: 0,
        marketValue,
        investedValue: parseFixedTwoDecimals(item.costBasis, 0),
        pnlPercent: parseFixedTwoDecimals(item.unrealizedGainLossPercent, 0),
        pnlAmount: parseFixedTwoDecimals(item.unrealizedGainLoss, 0),
      } satisfies PositionSnapshot;
    })
    .filter((item): item is PositionSnapshot => item !== null);

  return {
    positions,
    meta: {
      source: "harbor",
      generatedAt: new Date().toISOString(),
    },
  } satisfies PositionsResponse;
}

export async function fetchHarborPositions(accountId: string) {
  const config = getHarborConfig();
  const path = resolveAccountPositionsPath(config.positionsPath, accountId);
  return fetchPositionsByPath(path);
}

export async function fetchHarborPartyPositions(partyId: string) {
  const config = getHarborConfig();
  const path = resolvePartyPositionsPath(config.partyPositionsPath, partyId);
  return fetchPositionsByPath(path);
}
