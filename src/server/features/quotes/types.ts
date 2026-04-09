export type QuoteAssetClass = "Equity" | "Crypto" | "Event Contract";

export type QuoteEventPricing = {
  yesPrice: number;
  noPrice: number;
};

export type QuotePosition = {
  invested: number;
  currentValue: number;
};

export type QuoteItem = {
  symbol: string;
  assetClass: QuoteAssetClass;
  price: number;
  change: number;
  dayChangePercent: number;
  open: number;
  high: number;
  low: number;
  close: number | null;
  previousClose: number;
  volume: number;
  vwap: number | null;
  tradingDay: string;
  marketSession: "OPEN" | "CLOSED" | "PRE_MARKET" | "AFTER_HOURS" | "HALTED" | "EARLY_CLOSE" | "UNKNOWN";
  afterHoursPrice: number | null;
  preMarketPrice: number | null;
  updatedAt: string;
  instrumentName?: string;
  exchange?: string;
  instrumentType?: string;
  position?: QuotePosition;
  eventPricing?: QuoteEventPricing;
};

export type QuoteResult = {
  quote: QuoteItem;
  meta: {
    provider: "harbor";
    source: string;
    generatedAt: string;
  };
};
