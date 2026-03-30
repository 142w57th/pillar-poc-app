import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

export type InstrumentRecord = {
  symbol: string;
  name: string;
  exchange: string;
  assetClass: string;
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

export async function fetchHarborInstruments() {
  const config = getHarborConfig();
  return harborFetch<InstrumentsCatalogResponse>(config.instrumentsPath);
}
