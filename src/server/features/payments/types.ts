export type PaymentsDestinationAccount = {
  accountType: string;
  externalAccountId: string;
  label: string;
};

export type PaymentsProviderId = "mock" | "harbor";


export type PaymentInstructionsResult = {
  accounts: Array<{
    instructionId: string;
    bankName: string;
    accountHolderName: string;
    accountType: "checking" | "savings" | "brokerage" | "other";
    routingNumberLast4: string;
    accountNumberLast4: string;
    currency: string;
  }>;
  meta: {
    provider: PaymentsProviderId;
    source: string;
    generatedAt: string;
  };
};


export type PaymentAccountsResult = {
  data: Array<{
    paymentAccountId: string;
    status: "LINKING" | "LINKED" | "PENDING_VERIFICATION" | "BLOCKED" | "UNLINKED";
    currency: string;
    country: string;
    maskedIdentifier?: string;
    nickname?: string;
    createdAt: string;
    updatedAt?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
    details: {
      type: "BANK_ACCOUNT";
      accountType?: string;
      bankName?: string;
      bankAddress?: string;
      bankIdentifierType?: "ABA_ROUTING" | "IFSC" | "IBAN";
      bankIdentifier?: string;
    };
  }>;
  meta: {
    provider: PaymentsProviderId;
    source: string;
    generatedAt: string;
  };
};

export type DestinationAccountsResult = {
  accounts: PaymentsDestinationAccount[];
  meta: {
    clientId: string;
    count: number;
    source: "kv-store";
  };
};

export type SubmitDepositInput = {
  direction?: "DEPOSIT" | "WITHDRAW";
  sourcePaymentAccountId?: string;
  destinationAccountId: string;
  amountUsd: number;
};

export type GetPaymentAccountsInput = {
  clientId: string;
  type?: "BANK_ACCOUNT";
};

  export type CreatePaymentAccountInput = {
    data: {
      clientId: string;
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
  };

export type CreatePaymentAccountResult = {
  data: {
    paymentAccountId: string;
    status: "LINKING" | "LINKED" | "PENDING_VERIFICATION" | "BLOCKED" | "UNLINKED";
    currency: string;
    country: string;
    maskedIdentifier?: string;
    nickname?: string;
    createdAt: string;
    updatedAt?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
    details: {
      type: "BANK_ACCOUNT";
      accountType?: string;
      bankName?: string;
      bankAddress?: string;
      bankIdentifierType?: "ABA_ROUTING" | "IFSC" | "IBAN";
      bankIdentifier?: string;
    };
  };
  meta: {
    provider: PaymentsProviderId;
    source: string;
    generatedAt: string;
    requestId?: string;
  };
};

export type SubmitDepositResult = {
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
    provider: PaymentsProviderId;
    generatedAt: string;
  };
};
