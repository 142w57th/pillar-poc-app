import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

export type HarborProviderId = "mock" | "harbor";

export type PaymentInstructionAccountType = "checking" | "savings" | "brokerage" | "other";

export type HarborPaymentInstructionAccount = {
  instructionId: string;
  bankName: string;
  accountHolderName: string;
  accountType: PaymentInstructionAccountType;
  routingNumberLast4: string;
  accountNumberLast4: string;
  currency: string;
};

export type HarborPaymentInstructionsResponse = {
  accounts: HarborPaymentInstructionAccount[];
  meta: {
    source: string;
    generatedAt: string;
  };
};
export type PaymentAccountType = "CHECKING" | "SAVINGS";
export type PaymentAccountStatus = "LINKING" | "LINKED" | "PENDING_VERIFICATION" | "BLOCKED" | "UNLINKED";
export type PaymentAccountIdentifierType = "ABA_ROUTING" | "IBAN" | "IFSC";

export type HarborPaymentAccount = {
  paymentAccountId: string;
  status:PaymentAccountStatus;
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
    bankIdentifierType?:PaymentAccountIdentifierType
    bankIdentifier?: string;
  };
};

export type HarborPaymentAccountsResponse = {
  data: HarborPaymentAccount[];
  meta?: Record<string, unknown>;
};

export type HarborCreatePaymentAccountResponse = {
  data: HarborPaymentAccount;
  meta: {
   requestId: string;
  };
};
export type HarborCreatePaymentAccountInput = {
  clientId: string;
  nickname?: string;
  accountHolderName: string;
  accountNumber: string;
  accountType: PaymentAccountType;
  bankName: string;
  bankAddress: string;
  bankIdentifier: string;
  currency?: string;
  country?: string;
  externalId?: string;
  metadata?: Record<string, string>;
};

export type HarborGetPaymentAccountsInput = {
  clientId: string;
  type?: "BANK_ACCOUNT";
};

export type HarborCreatePaymentAccountRequest = {
  data: {
    clientId: string;
    currency: string;
    country: string;
    maskedIdentifier?: string;
    nickname?: string;
    externalId?: string;
    metadata?: Record<string, string>;
    details: {
      type: "BANK_ACCOUNT";
      accountType: PaymentAccountType;
      bankName: string;
      bankAddress: string;
      bankIdentifierType: PaymentAccountIdentifierType;
      bankIdentifier: string;
      accountHolderName: string;
      accountNumber: string;
    };
  };
  meta: Record<string, never>;
};
export type HarborSubmitDepositRequest = {
  data: {
    transferType: "WIRE";
    orchestrationMode: "PARTNER_PROCESSOR";
    description: string;
    comment: string;
    sourceAccount: {
      id: string;
      type: "CLIENT";
    };
    destinationAccount: {
      id: string;
      type: "CLIENT";
    };
    externalId: string;
    metadata: {
      additionalProp1: Record<string, unknown>;
    };
    sourceCurrency: string;
    sourceAmount: string;
  };
  meta: {
    additionalProp1: Record<string, unknown>;
  };
};

export type HarborSubmitDepositResult = {
  provider: "mock" | "harbor";
  depositId: string;
  status: "submitted" | "pending" | "failed";
  submittedAt: string;
  providerReference?: string;
};

type HarborSubmitDepositApiResponse = {
  data?: {
    id?: string;
    status?: string;
    externalId?: string;
  };
};

export async function fetchHarborPaymentInstructions() {
  const config = getHarborConfig();
  return harborFetch<HarborPaymentInstructionsResponse>(
    config.paymentInstructionsPath,
  );
}

export async function fetchHarborPaymentAccounts(input: HarborGetPaymentAccountsInput) {
  const config = getHarborConfig();
  const params = new URLSearchParams({ clientId: input.clientId });
  if (input.type) {
    params.set("type", input.type);
  }
  const path = `${config.paymentAccountsPath}?${params.toString()}`;
  const response = await harborFetch<HarborPaymentAccountsResponse>(path);

  return {
    data: response.data ?? [],
    meta: response.meta,
  } satisfies HarborPaymentAccountsResponse;
}

export async function createHarborPaymentAccount(input: HarborCreatePaymentAccountInput): Promise<HarborCreatePaymentAccountResponse> {
  const config = getHarborConfig();
  const requestBody = buildHarborCreatePaymentAccountRequest(input);
  const response = await harborFetch<HarborCreatePaymentAccountResponse>(config.paymentAccountsPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.data) {
    throw new Error("Payment account create API returned no data.");
  }

  return response;
}

export function buildHarborCreatePaymentAccountRequest(
  input: HarborCreatePaymentAccountInput,
): HarborCreatePaymentAccountRequest {
  return {
    data: {
      clientId: input.clientId,
      currency: input.currency ?? "USD",
      country: input.country ?? "USA",
      maskedIdentifier: undefined,
      nickname: input.nickname,
      externalId: input.externalId,
      metadata: input.metadata,
      details: {
        type: "BANK_ACCOUNT",
        accountType: input.accountType,
        bankName: input.bankName,
        bankAddress: input.bankAddress,
        bankIdentifierType: "ABA_ROUTING",
        bankIdentifier: input.bankIdentifier,
        accountHolderName: input.accountHolderName,
        accountNumber: input.accountNumber,
      },
    },
    meta: {},
  };
}

export async function submitHarborDeposit(
  input: HarborSubmitDepositRequest,
): Promise<HarborSubmitDepositResult> {
  const config = getHarborConfig();
  const response = await harborFetch<HarborSubmitDepositApiResponse>(
    config.depositsPath,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  const normalizedStatus = response.data?.status?.toLowerCase();
  const status: HarborSubmitDepositResult["status"] =
    normalizedStatus === "failed"
      ? "failed"
      : normalizedStatus === "pending"
        ? "pending"
        : "submitted";

  return {
    provider: "harbor",
    depositId: response.data?.id ?? input.data.externalId,
    status,
    submittedAt: new Date().toISOString(),
    providerReference: response.data?.externalId ?? input.data.externalId,
  };
}
