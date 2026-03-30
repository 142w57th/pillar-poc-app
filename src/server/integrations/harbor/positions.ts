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
  pnlPercent: number;
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

export async function fetchHarborPositions(partyId: string) {
  const config = getHarborConfig();
  const encodedPartyId = encodeURIComponent(partyId);
  const path = `${config.positionsPath}/${encodedPartyId}/positions`;
  return harborFetch<PositionsResponse>(path);
}
