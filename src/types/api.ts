export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type DashboardAccountPayload = {
  accountType: string;
  accountId: string;
  totalMarketValue: number;
  totalCostBasis: number;
  cashBalance: number;
  buyingPower: number;
  cashAvailableForWithdrawal: number;
  accountValue: number;
  currency: string;
  calculatedAt: string;
};

export type DashboardAccountSummaryPayload = {
  accountType: string;
  accountId: string;
};

export type DashboardAggregatedPayload = {
  totalMarketValue: number;
  totalCostBasis: number;
  cashBalance: number;
  buyingPower: number;
  cashAvailableForWithdrawal: number;
  accountValue: number;
  currency: string;
  calculatedAt: string | null;
};

export type BalancesPayload = {
  aggregated: DashboardAggregatedPayload;
  accounts: DashboardAccountPayload[];
  meta: {
    userId: string;
    accountCount: number;
    provider: "harbor";
    generatedAt: string;
  };
};

export type DashboardPayload = {
  aggregated: DashboardAggregatedPayload;
  accounts: DashboardAccountSummaryPayload[];
  meta: {
    userId: string;
    accountCount: number;
    provider: "harbor";
    generatedAt: string;
  };
};

export type DashboardAccountsPayload = {
  accounts: DashboardAccountPayload[];
  meta: {
    userId: string;
    accountCount: number;
    provider: "harbor";
    generatedAt: string;
  };
};

export type InstrumentPayload = {
  symbol: string;
  name: string;
  exchange: string;
  assetClass: string;
};

export type InstrumentsCatalogPayload = {
  instruments: InstrumentPayload[];
  meta: {
    count: number;
    provider: "harbor";
    source: string;
    generatedAt: string;
  };
};

export type PositionPayload = {
  symbol: string;
  assetClass: "Equity" | "Crypto" | "Event Contract";
  lastPrice: number;
  dayChangePercent: number;
  preMarketPrice: number;
  preMarketChangePercent: number;
  marketValue: number;
  pnlPercent: number;
  eventSide?: "YES" | "NO";
  eventYesPrice?: number;
  eventNoPrice?: number;
};

export type PositionsPayload = {
  positions: PositionPayload[];
  meta: {
    count: number;
    provider: "harbor";
    source: string;
    generatedAt: string;
  };
};

export type QuoteEventPricingPayload = {
  yesPrice: number;
  noPrice: number;
};

export type QuotePositionPayload = {
  invested: number;
  currentValue: number;
};

export type QuotePayload = {
  quote: {
    symbol: string;
    assetClass: "Equity" | "Crypto" | "Event Contract";
    price: number;
    dayChangePercent: number;
    position?: QuotePositionPayload;
    eventPricing?: QuoteEventPricingPayload;
  };
  meta: {
    provider: "harbor";
    source: string;
    generatedAt: string;
  };
};

export type OnboardingStatusPayload = {
  clientOnboarded: boolean;
  clientId: string | null;
  accounts: Array<{
    accountType: string;
    externalAccountId: string;
  }>;
};

export type CreateAccountRequestPayload = {
  userId: string;
  accountType: string;
  personalInfo?: {
    firstName: string;
    lastName: string;
    middleInitial?: string;
    suffix?: string;
    taxId: string;
    dateOfBirth: string;
    country: string;
    email: string;
    phone: string;
    legalAddress: string;
  };
  suitability: {
    employmentType: string;
    occupation?: string;
    businessType?: string;
    employer?: string;
    businessPhone?: string;
    businessAddress?: string;
    liquidNetWorth?: string;
    totalNetWorth?: string;
    investmentObjective: string;
    riskTolerance: string;
  };
};

export type CreateAccountResultPayload = {
  clientId: string;
  accountId: string;
  externalAccountId: string;
  accountType: string;
};

export type SubmitOrderRequestPayload = {
  userId: string;
  instrumentSymbol: string;
  assetClass: "Equity" | "Crypto" | "Event Contract";
  side: "BUY" | "SELL";
  amountUsd: number;
  pricePerUnit: number;
  eventSide?: "YES" | "NO";
};

export type SubmitOrderPayload = {
  order: {
    orderId: string;
    status: "accepted" | "rejected" | "pending";
    submittedAt: string;
    instrumentSymbol: string;
    assetClass: "Equity" | "Crypto" | "Event Contract";
    side: "BUY" | "SELL";
    amountUsd: number;
    pricePerUnit: number;
    eventSide?: "YES" | "NO";
    estimatedUnits?: number;
    estimatedMaxReturnUsd?: number;
    providerReference?: string;
  };
  meta: {
    provider: "mock" | "harbor";
    generatedAt: string;
  };
};

export type OrdersPayload = {
  orders: Array<{
    accountId: string;
    provider: "mock" | "harbor";
    orderId: string;
    status: "accepted" | "rejected" | "pending";
    submittedAt: string;
    instrumentSymbol: string;
    assetClass: "Equity" | "Crypto" | "Event Contract";
    side: "BUY" | "SELL";
    amountUsd: number;
    pricePerUnit: number;
    eventSide?: "YES" | "NO";
    estimatedUnits?: number;
    estimatedMaxReturnUsd?: number;
    providerReference?: string;
  }>;
  meta: {
    userId: string;
    count: number;
    provider: "mock" | "harbor";
    source: string;
    generatedAt: string;
  };
};

export type PaymentInstructionAccountPayload = {
  instructionId: string;
  bankName: string;
  accountHolderName: string;
  accountType: "checking" | "savings" | "brokerage" | "other";
  routingNumberLast4: string;
  accountNumberLast4: string;
  currency: string;
};

export type PaymentInstructionsPayload = {
  accounts: PaymentInstructionAccountPayload[];
  meta: {
    provider: "mock" | "harbor";
    source: string;
    generatedAt: string;
  };
};

export type DestinationAccountPayload = {
  accountType: string;
  externalAccountId: string;
  label: string;
};

export type DestinationAccountsPayload = {
  accounts: DestinationAccountPayload[];
  meta: {
    userId: string;
    count: number;
    source: "kv-store";
  };
};

export type SubmitDepositRequestPayload = {
  userId: string;
  sourceInstructionId?: string;
  destinationAccountId: string;
  amountUsd: number;
};

export type SubmitDepositPayload = {
  deposit: {
    depositId: string;
    status: "submitted" | "pending" | "failed";
    submittedAt: string;
    destinationAccountId: string;
    amountUsd: number;
    currency: "USD";
    providerReference?: string;
  };
  meta: {
    provider: "mock" | "harbor";
    generatedAt: string;
  };
};
