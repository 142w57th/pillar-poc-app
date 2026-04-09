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

export type PriceMarketSession =
  | "OPEN"
  | "CLOSED"
  | "PRE_MARKET"
  | "AFTER_HOURS"
  | "HALTED"
  | "EARLY_CLOSE"
  | "UNKNOWN";

export type QuoteSnapshot = {
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
  marketSession: PriceMarketSession;
  afterHoursPrice: number | null;
  preMarketPrice: number | null;
  updatedAt: string;
  instrumentName?: string;
  exchange?: string;
  instrumentType?: string;
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

type HarborPriceSnapshotResponse = {
  data: {
    identifier: {
      symbol: string;
      name?: string;
    };
    name?: string;
    exchange?: string;
    instrumentType?: string;
    price: string;
    change: string;
    changePercent: string;
    open: string;
    high: string;
    low: string;
    close: string | null;
    previousClose: string;
    volume: string;
    vwap: string | null;
    tradingDay: string;
    marketSession: PriceMarketSession;
    afterHoursPrice: string | null;
    preMarketPrice: string | null;
    updatedAt: string;
  };
  meta: {
    sourceType?: string;
    asOf?: string;
  };
};

export type FetchHarborQuoteOptions = {
  assetClass?: string;
  includeExtendedHours?: boolean;
};

function parseNumber(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapAssetClass(value: string | undefined): QuoteAssetClass {
  if (value === "CRYPTO") return "Crypto";
  if (value === "OPTION") return "Event Contract";
  return "Equity";
}

export async function fetchHarborQuote(symbol: string, options?: FetchHarborQuoteOptions) {
  const config = getHarborConfig();
  const encodedSymbol = encodeURIComponent(symbol);
  const basePath = config.priceSnapshotApiPath.includes("{symbol}")
    ? config.priceSnapshotApiPath.replace("{symbol}", encodedSymbol)
    : `${config.priceSnapshotApiPath.replace(/\/+$/, "")}/${encodedSymbol}/snapshot`;
  const params = new URLSearchParams();
  if (options?.assetClass) {
    params.set("assetClass", options.assetClass);
  }
  const path = `${basePath}?${params.toString()}`;
  const response = await harborFetch<HarborPriceSnapshotResponse>(path);

  const data = response.data;
  return {
    quote: {
      symbol: data.identifier.symbol,
      assetClass: mapAssetClass(options?.assetClass),
      price: parseNumber(data.price) ?? 0,
      change: parseNumber(data.change) ?? 0,
      dayChangePercent: parseNumber(data.changePercent) ?? 0,
      open: parseNumber(data.open) ?? 0,
      high: parseNumber(data.high) ?? 0,
      low: parseNumber(data.low) ?? 0,
      close: parseNumber(data.close),
      previousClose: parseNumber(data.previousClose) ?? 0,
      volume: parseNumber(data.volume) ?? 0,
      vwap: parseNumber(data.vwap),
      tradingDay: data.tradingDay,
      marketSession: data.marketSession,
      afterHoursPrice: parseNumber(data.afterHoursPrice),
      preMarketPrice: parseNumber(data.preMarketPrice),
      updatedAt: data.updatedAt,
      instrumentName: data.identifier.name ?? data.name,
      exchange: data.exchange,
      instrumentType: data.instrumentType,
    },
    meta: {
      source: response.meta?.sourceType ?? "harbor-price-snapshot",
      generatedAt: response.meta?.asOf ?? data.updatedAt ?? new Date().toISOString(),
    },
  } satisfies QuoteResponse;
}
