export type InstrumentItem = {
  symbol: string;
  name: string;
  exchange: string;
  assetClass: string;
  feedSymbol?: string;
};

export type InstrumentsResult = {
  instruments: InstrumentItem[];
  meta: {
    count: number;
    provider: "harbor";
    source: string;
    generatedAt: string;
  };
};
