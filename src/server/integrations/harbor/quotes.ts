import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

export type QuoteAssetClass = "Equity" | "Crypto" | "Event Contract";

export type QuoteEventPricing = {
  yesPrice: number;
  noPrice: number;
};

export type QuotePosition = {
  invested: number;
  currentValue: number;
};

export type QuoteSnapshot = {
  symbol: string;
  assetClass: QuoteAssetClass;
  price: number;
  dayChangePercent: number;
  position?: QuotePosition;
  eventPricing?: QuoteEventPricing;
};

export type QuoteResponse = {
  quote: QuoteSnapshot;
  meta: {
    source: string;
    generatedAt: string;
  };
};

export async function fetchHarborQuote(symbol: string) {
  const config = getHarborConfig();
  const path = `${config.quotesPath}?symbol=${encodeURIComponent(symbol)}`;
  return harborFetch<QuoteResponse>(path);
}
