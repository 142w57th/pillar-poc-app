import { fetchHarborBalanceByAccountId, fetchHarborBalanceByPartyId } from "@/server/integrations/harbor/balances";
import { fetchHarborAccountTemplates } from "@/server/integrations/harbor/account-templates";
import { createHarborAccount } from "@/server/integrations/harbor/accounts";
import { fetchHarborInstruments } from "@/server/integrations/harbor/instruments";
import { fetchHarborOrders, submitHarborOrder } from "@/server/integrations/harbor/orders";
import { createHarborParty } from "@/server/integrations/harbor/parties";
import {
  createHarborPaymentAccount,
  fetchHarborPaymentAccounts,
  fetchHarborPaymentInstructions,
  submitHarborDeposit,
} from "@/server/integrations/harbor/payments";
import { fetchHarborPositions } from "@/server/integrations/harbor/positions";
import { fetchHarborQuote } from "@/server/integrations/harbor/quotes";
import type { TradeOrderSubmitRequest } from "@/server/integrations/harbor/orders";
import type {
  HarborCreatePaymentAccountInput,
  HarborGetPaymentAccountsInput,
  HarborSubmitDepositRequest,
} from "@/server/integrations/harbor/payments";
import type { HarborProvider } from "@/server/integrations/harbor/provider";

export function createRealHarborProvider(): HarborProvider {
  return {
    createParty(input) {
      return createHarborParty(input);
    },

    createAccount(input) {
      return createHarborAccount(input);
    },

    fetchAccountTemplates() {
      return fetchHarborAccountTemplates();
    },

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

    fetchPaymentAccounts(input: HarborGetPaymentAccountsInput) {
      return fetchHarborPaymentAccounts(input);
    },

    createPaymentAccount(input: HarborCreatePaymentAccountInput) {
      return createHarborPaymentAccount(input);
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
