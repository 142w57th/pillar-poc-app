import type { HarborBalanceResponse, HarborPartyBalanceResponse } from "@/server/integrations/harbor/balances";
import type { InstrumentsCatalogResponse } from "@/server/integrations/harbor/instruments";
import type {
  HarborOrdersResponse,
  TradeOrderSubmitRequest,
  TradeOrderSubmitResult,
} from "@/server/integrations/harbor/orders";
import type {
  HarborPaymentInstructionsResponse,
  HarborSubmitDepositRequest,
  HarborSubmitDepositResult,
} from "@/server/integrations/harbor/payments";
import type { PositionsResponse } from "@/server/integrations/harbor/positions";
import type { QuoteResponse } from "@/server/integrations/harbor/quotes";
import { createLoggedHarborProvider } from "./providers/logged-provider";
import { createMockHarborProvider } from "./providers/mock-provider";
import { createRealHarborProvider } from "./providers/real-provider";

export type HarborProviderMode = "mock" | "real";

export type HarborProvider = {
  fetchBalanceByAccountId(accountId: string): Promise<HarborBalanceResponse>;
  fetchBalanceByPartyId(partyId: string): Promise<HarborPartyBalanceResponse>;
  fetchInstruments(): Promise<InstrumentsCatalogResponse>;
  submitOrder(input: TradeOrderSubmitRequest): Promise<TradeOrderSubmitResult>;
  fetchOrders(partyId: string): Promise<HarborOrdersResponse>;
  fetchPaymentInstructions(): Promise<HarborPaymentInstructionsResponse>;
  submitDeposit(input: HarborSubmitDepositRequest): Promise<HarborSubmitDepositResult>;
  fetchPositions(partyId: string): Promise<PositionsResponse>;
  fetchQuote(symbol: string): Promise<QuoteResponse>;
};

function resolveHarborProviderMode(): HarborProviderMode {
  const rawMode = process.env.HARBOR_PROVIDER?.trim().toLowerCase();

  if (!rawMode) {
    return "mock";
  }

  if (rawMode === "mock" || rawMode === "real") {
    return rawMode;
  }

  throw new Error(`Invalid HARBOR_PROVIDER value "${rawMode}". Expected "mock" or "real".`);
}

export function getHarborProvider(): HarborProvider {
  const mode = resolveHarborProviderMode();
  if (mode === "real") {
    return createRealHarborProvider();
  }
  return createLoggedHarborProvider(createMockHarborProvider());
}
