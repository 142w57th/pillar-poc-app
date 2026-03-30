export type PositionAssetClass = "Equity" | "Crypto" | "Event Contract";

export type PositionItem = {
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

export type PositionsResult = {
  positions: PositionItem[];
  meta: {
    count: number;
    provider: "harbor";
    source: string;
    generatedAt: string;
  };
};
