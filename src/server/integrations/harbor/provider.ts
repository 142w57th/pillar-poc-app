import type { HarborBalanceResponse, HarborPartyBalanceResponse } from "@/server/integrations/harbor/balances";
import type { HarborAccountTemplatesResponse } from "@/server/integrations/harbor/account-templates";
import type { HarborCreateAccountInput, HarborCreateAccountResult } from "@/server/integrations/harbor/accounts";
import type {
  FetchHarborInstrumentsInput,
  InstrumentsCatalogResponse,
} from "@/server/integrations/harbor/instruments";
import type { FetchHarborQuoteOptions } from "@/server/integrations/harbor/quotes";
import type { HarborCreatePartyInput, HarborCreatePartyResult } from "@/server/integrations/harbor/parties";
import type {
  HarborFetchOrdersInput,
  HarborOrdersResponse,
  TradeOrderSubmitRequest,
  TradeOrderSubmitResult,
} from "@/server/integrations/harbor/orders";
import type {
  HarborCreatePaymentAccountInput,
  HarborCreatePaymentAccountResponse,
  HarborGetPaymentAccountsInput,
  HarborPaymentAccountsResponse,
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
  createParty(input: HarborCreatePartyInput): Promise<HarborCreatePartyResult>;
  createAccount(input: HarborCreateAccountInput): Promise<HarborCreateAccountResult>;
  fetchAccountTemplates(): Promise<HarborAccountTemplatesResponse>;
  fetchBalanceByAccountId(accountId: string): Promise<HarborBalanceResponse>;
  fetchBalanceByPartyId(partyId: string): Promise<HarborPartyBalanceResponse>;
  fetchInstruments(input?: FetchHarborInstrumentsInput): Promise<InstrumentsCatalogResponse>;
  submitOrder(input: TradeOrderSubmitRequest): Promise<TradeOrderSubmitResult>;
  fetchOrders(input: HarborFetchOrdersInput): Promise<HarborOrdersResponse>;
  fetchPaymentInstructions(): Promise<HarborPaymentInstructionsResponse>;
  fetchPaymentAccounts(input: HarborGetPaymentAccountsInput): Promise<HarborPaymentAccountsResponse>;
  createPaymentAccount(input: HarborCreatePaymentAccountInput): Promise<HarborCreatePaymentAccountResponse>;
  submitDeposit(input: HarborSubmitDepositRequest): Promise<HarborSubmitDepositResult>;
  fetchPositions(accountId: string): Promise<PositionsResponse>;
  fetchPositionsByParty(partyId: string): Promise<PositionsResponse>;
  fetchQuote(symbol: string, options?: FetchHarborQuoteOptions): Promise<QuoteResponse>;
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
