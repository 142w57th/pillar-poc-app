import { fetchHarborBalanceByAccountId, fetchHarborBalanceByPartyId } from "@/server/integrations/harbor/balances";
import { fetchHarborInstruments } from "@/server/integrations/harbor/instruments";
import { fetchHarborOrders, submitHarborOrder } from "@/server/integrations/harbor/orders";
import { fetchHarborPaymentInstructions, submitHarborDeposit } from "@/server/integrations/harbor/payments";
import { fetchHarborPositions } from "@/server/integrations/harbor/positions";
import { fetchHarborQuote } from "@/server/integrations/harbor/quotes";
import type { TradeOrderSubmitRequest } from "@/server/integrations/harbor/orders";
import type { HarborSubmitDepositRequest } from "@/server/integrations/harbor/payments";
import type { HarborProvider } from "@/server/integrations/harbor/provider";

export function createRealHarborProvider(): HarborProvider {
  return {
    fetchBalanceByAccountId(accountId: string) {
      return fetchHarborBalanceByAccountId(accountId);
    },

    fetchBalanceByPartyId(partyId: string) {
      return fetchHarborBalanceByPartyId(partyId);
    },

    fetchInstruments() {
      return fetchHarborInstruments();
    },

    submitOrder(input: TradeOrderSubmitRequest) {
      return submitHarborOrder(input);
    },

    fetchOrders(partyId: string) {
      return fetchHarborOrders(partyId);
    },

    fetchPaymentInstructions() {
      return fetchHarborPaymentInstructions();
    },

    submitDeposit(input: HarborSubmitDepositRequest) {
      return submitHarborDeposit(input);
    },

    fetchPositions(partyId: string) {
      return fetchHarborPositions(partyId);
    },

    fetchQuote(symbol: string) {
      return fetchHarborQuote(symbol);
    },
  };
}
