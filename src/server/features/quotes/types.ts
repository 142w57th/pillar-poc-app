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
  dayChangePercent: number;
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
