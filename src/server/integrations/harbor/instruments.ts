import { harborFetch } from "@/server/integrations/harbor/client";

export type InstrumentRecord = {
  symbol: string;
  name: string;
  exchange: string;
  assetClass: string;
  feedSymbol?: string;
};

export type InstrumentsCatalogMeta = {
  source: string;
  version: string;
  generatedAt: string;
};

export type InstrumentsCatalogResponse = {
  instruments: InstrumentRecord[];
  meta: InstrumentsCatalogMeta;
};

export type FetchHarborInstrumentsInput = {
  q?: string;
  limit?: number;
  assetClass?: string;
  instrumentType?: string;
  exchange?: string;
  status?: string;
};

type HarborInstrumentSearchItem = {
  symbol: string;
  assetClass: string;
  name: string;
  feedSymbol: string;
};

type HarborInstrumentsUniverseResponse = {
  data: {
    id: string;
    name: string;
    description: string;
    instrumentCount: number;
    instruments: HarborInstrumentSearchItem[];
  };
  meta: {
    asOf: string;
    sourceType: "PRIMARY" | "FALLBACK" | "STATIC" | "CACHED";
    cacheHit: boolean;
    lastFetchedAt?: string;
    dataClassification: "reference" | "derived" | "raw";
    apiVersion?: string;
  };
};

function normalizeUniverseAssetClass(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "EQUITY") return "EQUITY";
  if (normalized === "CRYPTO") return "CRYPTO";
  return "OTHER";
}

function toExchangeByAssetClass(assetClass: string) {
  if (assetClass === "CRYPTO") return "CRYPTO";
  if (assetClass === "EQUITY") return "UNKNOWN";
  return "UNKNOWN";
}

function toInstrumentRecord(item: HarborInstrumentSearchItem): InstrumentRecord {
  const assetClass = normalizeUniverseAssetClass(item.assetClass);
  return {
    symbol: item.symbol,
    name: item.name || item.symbol,
    exchange: toExchangeByAssetClass(assetClass),
    assetClass,
    feedSymbol: item.feedSymbol,
  };
}

const STREAMING_DEMO_UNIVERSE_PATH = "/v2/instruments/universes/streaming-demo";
const SUPPORTED_UNIVERSE_ASSET_CLASSES = new Set(["EQUITY", "CRYPTO"]);

export async function fetchHarborInstruments() {
  const response = await harborFetch<HarborInstrumentsUniverseResponse>(STREAMING_DEMO_UNIVERSE_PATH);

  const instruments = response.data.instruments
    .filter((item) => SUPPORTED_UNIVERSE_ASSET_CLASSES.has(item.assetClass.trim().toUpperCase()))
    .map((item) => toInstrumentRecord(item));

  return {
    instruments,
    meta: {
      source: `harbor-universe:${response.data.id}:${response.meta.sourceType.toLowerCase()}`,
      version: response.meta.apiVersion ?? "v2",
      generatedAt: response.meta.asOf ?? new Date().toISOString(),
    },
  } satisfies InstrumentsCatalogResponse;
}
