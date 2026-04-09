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
    clientId: string;
    accountCount: number;
    provider: "harbor";
    generatedAt: string;
  };
};

export type DashboardPayload = {
  aggregated: DashboardAggregatedPayload;
  accounts: DashboardAccountPayload[];
  meta: {
    clientId: string;
    accountCount: number;
    provider: "harbor";
    generatedAt: string;
  };
};

export type DashboardAccountsPayload = {
  accounts: DashboardAccountPayload[];
  meta: {
    clientId: string;
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
  feedSymbol?: string;
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
  assetClass: "Equity" | "Crypto";
  lastPrice: number;
  dayChangePercent: number;
  preMarketPrice: number;
  preMarketChangePercent: number;
  marketValue: number;
  investedValue: number;
  pnlPercent: number;
  pnlAmount: number;
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
    marketSession:
      | "OPEN"
      | "CLOSED"
      | "PRE_MARKET"
      | "AFTER_HOURS"
      | "HALTED"
      | "EARLY_CLOSE"
      | "UNKNOWN";
    afterHoursPrice: number | null;
    preMarketPrice: number | null;
    updatedAt: string;
    instrumentName?: string;
    exchange?: string;
    instrumentType?: string;
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

export type OnboardingAccountTemplatesPayload = {
  accountTemplates: Array<{
    accountTemplateCode: string;
    offeringCode?: string;
  }>;
  meta: {
    provider: "harbor";
    source: string;
    generatedAt: string;
  };
};

export type CreateAccountRequestPayload = {
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
    phone: {
      countryCode: string;
      phoneNumber: string;
    };
    legalAddress: {
      line1: string;
      city: string;
      countryCode: string;
    };
  };
  suitability: {
    employmentType: string;
    occupation?: string;
    businessType?: string;
    employer?: string;
    businessPhone?: string;
    businessPhoneCountryCode?: string;
    businessPhoneNumber?: string;
    businessAddress?: string;
    businessRegion?: string;
    businessPostalCode?: string;
    annualIncome?: string;
    liquidNetWorth?: string;
    totalNetWorth?: string;
    sourceOfFunds?: string;
    sourceOfFundsItems?: string[];
    timeHorizonMinYears?: string;
    timeHorizonMaxYears?: string;
    dividendReinvestmentInstruction?: string;
    investmentObjective: string;
    investmentObjectives?: string[];
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
    clientId: string;
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
export type PaymentAccountStatus =
  | "LINKING"
  | "LINKED"
  | "PENDING_VERIFICATION"
  | "BLOCKED"
  | "UNLINKED";

export type PaymentBankIdentifierType = "ABA_ROUTING" | "IBAN" | "IFSC";

export type PaymentAccountDetailsPayload = {
  type: "BANK_ACCOUNT";
  accountType?: string;
  bankName?: string;
  bankAddress?: string;
  bankIdentifierType?: PaymentBankIdentifierType;
  bankIdentifier?: string;
};

export type PaymentAccountPayload = {
  paymentAccountId: string;
  status: PaymentAccountStatus;
  currency: string;
  country: string;
  maskedIdentifier?: string;
  nickname?: string;
  createdAt: string;
  updatedAt?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
  details: PaymentAccountDetailsPayload;
};

export type PaymentAccountsPayload = {
  data: PaymentAccountPayload[];
  meta: {
    provider: "mock" | "harbor";
    source: string;
    generatedAt: string;
  };
};

export type CreatePaymentAccountRequestPayload = {
  data: {
    currency: string;
    country: string;
    maskedIdentifier?: string;
    nickname?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
    details: {
      type: "BANK_ACCOUNT";
      bankName?: string;
    };
  };
  meta?: Record<string, unknown>;
};

export type CreatePaymentAccountPayload = {
  data: PaymentAccountPayload;
  meta: {
    provider: "mock" | "harbor";
    source: string;
    generatedAt: string;
    requestId?: string;
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
    clientId: string;
    count: number;
    source: "kv-store";
  };
};

export type SubmitDepositRequestPayload = {
  direction?: "DEPOSIT" | "WITHDRAW";
  sourcePaymentAccountId?: string;
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
