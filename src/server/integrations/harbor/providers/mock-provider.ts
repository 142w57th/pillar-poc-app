import mockBalances from "@/server/integrations/harbor/fixtures/balances.json";
import instrumentsFixture from "@/server/integrations/harbor/fixtures/instruments.json";
import ordersFixture from "@/server/integrations/harbor/fixtures/orders.json";
import positionsFixture from "@/server/integrations/harbor/fixtures/positions.json";
import quotesFixture from "@/server/integrations/harbor/fixtures/quotes.json";
import type {
  HarborBalanceData,
  HarborBalanceResponse,
  HarborPartyBalanceResponse,
} from "@/server/integrations/harbor/balances";
import type {
  InstrumentRecord,
  InstrumentsCatalogMeta,
  InstrumentsCatalogResponse,
} from "@/server/integrations/harbor/instruments";
import type {
  HarborOrderSnapshot,
  HarborOrdersResponse,
  TradeOrderSubmitRequest,
} from "@/server/integrations/harbor/orders";
import type {
  HarborCreatePaymentAccountInput,
  HarborCreatePaymentAccountResponse,
  HarborGetPaymentAccountsInput,
  HarborPaymentAccountsResponse,
  HarborPaymentInstructionsResponse,
  HarborSubmitDepositRequest,
} from "@/server/integrations/harbor/payments";
import type { PositionSnapshot, PositionsResponse } from "@/server/integrations/harbor/positions";
import type { QuoteSnapshot, QuoteResponse } from "@/server/integrations/harbor/quotes";
import type { HarborProvider } from "@/server/integrations/harbor/provider";

type HarborBalanceFixture = {
  meta: Record<string, unknown>;
  accounts: Record<string, HarborBalanceData>;
};

type InstrumentsFixture = {
  instruments: InstrumentRecord[];
  meta: InstrumentsCatalogMeta;
};

type PositionsFixture = {
  positions: PositionSnapshot[];
  meta: { source: string; generatedAt: string };
};

type OrdersFixture = {
  orders: HarborOrderSnapshot[];
  meta: { source: string; generatedAt: string };
};

type QuotesFixture = {
  quotes: Record<string, QuoteSnapshot>;
  meta: { source: string; generatedAt: string };
};

const BALANCES_FIXTURE = mockBalances as HarborBalanceFixture;
const INSTRUMENTS_FIXTURE = instrumentsFixture as InstrumentsFixture;
const ORDERS_FIXTURE = ordersFixture as OrdersFixture;
const POSITIONS_FIXTURE = positionsFixture as PositionsFixture;
const QUOTES_FIXTURE = quotesFixture as QuotesFixture;
const PAYMENT_INSTRUCTIONS_FIXTURE: HarborPaymentInstructionsResponse = {
  accounts: [
    {
      instructionId: "pi-chase-checking",
      bankName: "Chase Bank",
      accountHolderName: "Qapital Trading LLC",
      accountType: "checking",
      routingNumberLast4: "1100",
      accountNumberLast4: "9876",
      currency: "USD",
    },
    {
      instructionId: "pi-bofa-savings",
      bankName: "Bank of America",
      accountHolderName: "Qapital Settlement Account",
      accountType: "savings",
      routingNumberLast4: "4401",
      accountNumberLast4: "2468",
      currency: "USD",
    },
  ],
  meta: {
    source: "mock-fixture",
    generatedAt: new Date().toISOString(),
  },
};
const PAYMENT_ACCOUNTS_FIXTURE: HarborPaymentAccountsResponse = {
  data: [
    {
      paymentAccountId: "pa-chase-checking",
      status: "LINKED",
      currency: "USD",
      country: "USA",
      maskedIdentifier: "****9876",
      nickname: "Primary bank",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      externalId: "mock-pa-001",
      metadata: {
        source: "mock-fixture",
      },
      details: {
        type: "BANK_ACCOUNT",
        accountType: "checking",
        bankName: "Chase Bank",
        bankAddress: "270 Park Ave, New York, NY",
        bankIdentifierType: "ABA_ROUTING",
        bankIdentifier: "021000021",
      },
    },
  ],
};

function getBalanceFromFixture(accountId: string): HarborBalanceResponse {
  const balance = BALANCES_FIXTURE.accounts[accountId];
  if (!balance) {
    throw new Error(`Mock Harbor balance is missing for accountId ${accountId}.`);
  }

  return {
    data: balance,
    meta: BALANCES_FIXTURE.meta,
  };
}

function getPartyBalanceFromFixture(partyId: string): HarborPartyBalanceResponse {
  const balances = Object.values(BALANCES_FIXTURE.accounts);
  const calculatedAt =
    balances
      .map((item) => item.calculatedAt)
      .filter(Boolean)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? new Date().toISOString();
  const currency = balances[0]?.currency ?? "USD";

  const sums = balances.reduce(
    (acc, balance) => ({
      totalMarketValue: acc.totalMarketValue + Number(balance.totalMarketValue || 0),
      totalCostBasis: acc.totalCostBasis + Number(balance.totalCostBasis || 0),
      cashBalance: acc.cashBalance + Number(balance.cashBalance || 0),
      buyingPower: acc.buyingPower + Number(balance.buyingPower || 0),
      cashAvailableForWithdrawal: acc.cashAvailableForWithdrawal + Number(balance.cashAvailableForWithdrawal || 0),
      accountValue: acc.accountValue + Number(balance.accountValue || 0),
    }),
    {
      totalMarketValue: 0,
      totalCostBasis: 0,
      cashBalance: 0,
      buyingPower: 0,
      cashAvailableForWithdrawal: 0,
      accountValue: 0,
    },
  );

  return {
    data: {
      partyId,
      totalMarketValue: sums.totalMarketValue.toFixed(2),
      totalCostBasis: sums.totalCostBasis.toFixed(2),
      cashBalance: sums.cashBalance.toFixed(2),
      buyingPower: sums.buyingPower.toFixed(2),
      currency,
      cashAvailableForWithdrawal: sums.cashAvailableForWithdrawal.toFixed(2),
      accountValue: sums.accountValue.toFixed(2),
      calculatedAt,
    },
    meta: BALANCES_FIXTURE.meta,
  };
}

function round(value: number, digits = 4) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function createMockPaymentAccount(input: HarborCreatePaymentAccountInput): HarborCreatePaymentAccountResponse {
  return {
    data: {
      paymentAccountId: `pa-mock-${crypto.randomUUID()}`,
      status: "LINKED" as const,
      currency: "USD" as const,
      country: "USA" as const,
      maskedIdentifier: "****1234" as const,
      nickname: input.bankName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      externalId: `mock-${Date.now()}` as const,
      metadata: {
        source: "mock-provider" as const,
      },
      details: {
        type: "BANK_ACCOUNT" as const,
        accountType: input.accountType,
        bankName: input.bankName ,
        bankAddress: input.bankAddress ,
        bankIdentifierType: "ABA_ROUTING",
        bankIdentifier: input.bankIdentifier ,
      },
    },
    meta: {
      requestId: `mock-${crypto.randomUUID()}`,
    },
  };
}

export function createMockHarborProvider(): HarborProvider {
  return {
    fetchBalanceByAccountId(accountId: string) {
      return Promise.resolve(getBalanceFromFixture(accountId));
    },

    fetchBalanceByPartyId(partyId: string) {
      return Promise.resolve(getPartyBalanceFromFixture(partyId));
    },

    fetchInstruments() {
      return Promise.resolve({
        instruments: INSTRUMENTS_FIXTURE.instruments,
        meta: INSTRUMENTS_FIXTURE.meta,
      } satisfies InstrumentsCatalogResponse);
    },

    submitOrder(input: TradeOrderSubmitRequest) {
      const estimatedUnits = input.amountUsd / input.pricePerUnit;

      return Promise.resolve({
        provider: "mock" as const,
        orderId: `mock-${crypto.randomUUID()}`,
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
        providerReference: "mock-order-engine",
        estimatedUnits: round(estimatedUnits),
        estimatedMaxReturnUsd:
          input.assetClass === "Event Contract" ? round(estimatedUnits * 1, 2) : undefined,
      });
    },

    fetchOrders() {
      return Promise.resolve({
        orders: ORDERS_FIXTURE.orders,
        meta: {
          ...ORDERS_FIXTURE.meta,
          generatedAt: new Date().toISOString(),
        },
      } satisfies HarborOrdersResponse);
    },

    fetchPaymentInstructions() {
      return Promise.resolve({
        ...PAYMENT_INSTRUCTIONS_FIXTURE,
        meta: {
          ...PAYMENT_INSTRUCTIONS_FIXTURE.meta,
          generatedAt: new Date().toISOString(),
        },
      });
    },
    fetchPaymentAccounts(input: HarborGetPaymentAccountsInput) {
      void input;
      return Promise.resolve({
        ...PAYMENT_ACCOUNTS_FIXTURE,
      });
    },
    createPaymentAccount(input: HarborCreatePaymentAccountInput) {
      return Promise.resolve(createMockPaymentAccount(input));
    },

    submitDeposit(input: HarborSubmitDepositRequest) {
      return Promise.resolve({
        provider: "mock" as const,
        depositId: `mock-deposit-${crypto.randomUUID()}`,
        status: "submitted" as const,
        submittedAt: new Date().toISOString(),
        providerReference: `mock-destination-${input.data.destinationAccount.id}`,
      });
    },

    fetchPositions() {
      return Promise.resolve({
        positions: POSITIONS_FIXTURE.positions,
        meta: POSITIONS_FIXTURE.meta,
      } satisfies PositionsResponse);
    },

    fetchQuote(symbol: string) {
      const normalizedSymbol = symbol.toUpperCase();
      const quote = QUOTES_FIXTURE.quotes[normalizedSymbol];

      if (!quote) {
        throw new Error(`Mock quote not found for symbol "${normalizedSymbol}".`);
      }

      return Promise.resolve({
        quote,
        meta: QUOTES_FIXTURE.meta,
      } satisfies QuoteResponse);
    },
  };
}
