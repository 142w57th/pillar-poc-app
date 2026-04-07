import { listBrokerAccountsByUserId } from "@/server/storage/keyv-store";
import { getHarborProvider } from "@/server/integrations/harbor/provider";
import type {
  HarborCreatePaymentAccountResponse,
  HarborPaymentAccount,
} from "@/server/integrations/harbor/payments";
import type {
  CreatePaymentAccountInput,
  CreatePaymentAccountResult,
  DestinationAccountsResult,
  GetPaymentAccountsInput,
  PaymentAccountsResult,
  PaymentInstructionsResult,
  SubmitDepositInput,
  SubmitDepositResult,
} from "@/server/features/payments/types";

type PaymentsErrorCode =
  | "INVALID_DEPOSIT_INPUT"
  | "INVALID_PAYMENT_ACCOUNT_INPUT"
  | "PAYMENT_INSTRUCTIONS_FETCH_FAILED"
  | "PAYMENT_ACCOUNTS_FETCH_FAILED"
  | "PAYMENT_ACCOUNT_CREATE_FAILED"
  | "DEPOSIT_SUBMIT_FAILED"
  | "SERVER_CONFIG_ERROR";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PaymentsServiceError extends Error {
  code: PaymentsErrorCode;
  status: number;

  constructor(code: PaymentsErrorCode, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function toAccountLabel(accountType: string, externalAccountId: string) {
  const normalizedType = accountType
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
  return `${normalizedType} ••••${externalAccountId.slice(-4)}`;
}

function validateUserId(userId: string) {
  if (!userId || !UUID_RE.test(userId)) {
    throw new PaymentsServiceError("INVALID_DEPOSIT_INPUT", "Invalid userId format. Expected UUID.", 400);
  }
}

function validateClientId(clientId: string) {
  if (!clientId || !UUID_RE.test(clientId)) {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "Invalid clientId format. Expected UUID.", 400);
  }
}

function resolveProviderId() {
  return process.env.HARBOR_PROVIDER?.trim().toLowerCase() === "real" ? "harbor" : "mock";  
}

function formatAmountToUsdString(amountUsd: number) {
  return amountUsd.toFixed(2);
}

function requireNonEmptyString(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", `${fieldName} is required.`, 400);
  }
}

function normalizeMetadataForProvider(
  metadata?: Record<string, unknown>,
): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const entries = Object.entries(metadata);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(
    entries.map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value ?? null)]),
  );
}

function validateCreatePaymentAccountInput(input: CreatePaymentAccountInput) {
  const { data } = input;
  requireNonEmptyString(data.clientId, "data.clientId");
  validateClientId(data.clientId);
  requireNonEmptyString(data.currency, "data.currency");
  requireNonEmptyString(data.country, "data.country");
  requireNonEmptyString(data.details.accountHolderName, "data.details.accountHolderName");
  requireNonEmptyString(data.details.accountNumber, "data.details.accountNumber");
  requireNonEmptyString(data.details.bankName, "data.details.bankName");
  requireNonEmptyString(data.details.bankAddress, "data.details.bankAddress");
  requireNonEmptyString(data.details.bankIdentifier, "data.details.bankIdentifier");
}

function mapPaymentAccount(account: HarborPaymentAccount): PaymentAccountsResult["data"][number] {
  return {
    paymentAccountId: account.paymentAccountId,
    status: account.status,
    currency: account.currency,
    country: account.country,
    maskedIdentifier: account.maskedIdentifier,
    nickname: account.nickname,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    externalId: account.externalId,
    metadata: account.metadata,
    details: {
      type: account.details.type,
      accountType: account.details.accountType,
      bankName: account.details.bankName,
      bankAddress: account.details.bankAddress,
      bankIdentifierType: account.details.bankIdentifierType,
      bankIdentifier: account.details.bankIdentifier,
    },
  };
}

function mapCreatePaymentAccountResult(
  response: HarborCreatePaymentAccountResponse,
  provider: "mock" | "harbor",
): CreatePaymentAccountResult {
  return {
    data: mapPaymentAccount(response.data),
    meta: {
      provider,
      source: "harbor-provider",
      generatedAt: new Date().toISOString(),
      requestId: response.meta?.requestId,
    },
  };
}

export async function getPaymentInstructions(): Promise<PaymentInstructionsResult> {
  const harborProvider = getHarborProvider();

  try {
    const response = await harborProvider.fetchPaymentInstructions();
    return {
      accounts: response.accounts,
      meta: {
        provider: resolveProviderId(),
        source: response.meta.source,
        generatedAt: response.meta.generatedAt,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected payment instructions integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new PaymentsServiceError("SERVER_CONFIG_ERROR", message, 500);
    }
    throw new PaymentsServiceError("PAYMENT_INSTRUCTIONS_FETCH_FAILED", message, 502);
  }
}

export async function getPaymentAccounts(input: GetPaymentAccountsInput): Promise<PaymentAccountsResult> {
  const harborProvider = getHarborProvider();

  try {
    validateClientId(input.clientId);
    const response = await harborProvider.fetchPaymentAccounts({
      clientId: input.clientId,
      type: input.type,
    });
    const provider = resolveProviderId();
    return {
      data: (response.data ?? []).map(mapPaymentAccount),
      meta: {
        provider,
        source: "harbor-provider",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected payment accounts integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new PaymentsServiceError("SERVER_CONFIG_ERROR", message, 500);
    }
    throw new PaymentsServiceError("PAYMENT_ACCOUNTS_FETCH_FAILED", message, 502);
  }
}

export async function createPaymentAccount(input: CreatePaymentAccountInput): Promise<CreatePaymentAccountResult> {
  const harborProvider = getHarborProvider();

  try {
    validateCreatePaymentAccountInput(input);
    const response = await harborProvider.createPaymentAccount({
      clientId: input.data.clientId,
      nickname: input.data.nickname,
      accountHolderName: input.data.details.accountHolderName,
      accountNumber: input.data.details.accountNumber,
      accountType: input.data.details.accountType,
      bankName: input.data.details.bankName,
      bankAddress: input.data.details.bankAddress,
      bankIdentifier: input.data.details.bankIdentifier,
      currency: input.data.currency,
      country: input.data.country,
      externalId: input.data.externalId,
      metadata: normalizeMetadataForProvider(input.data.metadata),
    });
    return mapCreatePaymentAccountResult(response, resolveProviderId());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected payment account integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new PaymentsServiceError("SERVER_CONFIG_ERROR", message, 500);
    }
    throw new PaymentsServiceError("PAYMENT_ACCOUNT_CREATE_FAILED", message, 502);
  }
}
export async function getDestinationAccounts(userId: string): Promise<DestinationAccountsResult> {
  validateUserId(userId);
  const linkedAccounts = await listBrokerAccountsByUserId(userId);

  const accounts = linkedAccounts.map((account) => ({
    accountType: account.accountType,
    externalAccountId: account.externalAccountId,
    label: toAccountLabel(account.accountType, account.externalAccountId),
  }));

  return {
    accounts,
    meta: {
      userId,
      count: accounts.length,
      source: "kv-store",
    },
  };
}

export async function submitDeposit(input: SubmitDepositInput): Promise<SubmitDepositResult> {
  validateUserId(input.userId);

  if (!input.destinationAccountId) {
    throw new PaymentsServiceError("INVALID_DEPOSIT_INPUT", "destinationAccountId is required.", 400);
  }

  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    throw new PaymentsServiceError("INVALID_DEPOSIT_INPUT", "amountUsd must be a positive number.", 400);
  }

  const linkedAccounts = await listBrokerAccountsByUserId(input.userId);
  const destinationExists = linkedAccounts.some((account) => account.externalAccountId === input.destinationAccountId);
  if (!destinationExists) {
    throw new PaymentsServiceError(
      "INVALID_DEPOSIT_INPUT",
      "destinationAccountId must match one of the linked internal destination accounts.",
      400,
    );
  }

  const harborProvider = getHarborProvider();

  try {
    const paymentInstructions = await harborProvider.fetchPaymentInstructions();
    const fallbackSourceInstructionId = paymentInstructions.accounts[0]?.instructionId ?? "";
    const sourceInstructionId = input.sourceInstructionId || fallbackSourceInstructionId;

    if (!sourceInstructionId) {
      throw new PaymentsServiceError(
        "INVALID_DEPOSIT_INPUT",
        "No source payment instruction account is available for this deposit.",
        400,
      );
    }

    const depositResult = await harborProvider.submitDeposit({
      data: {
        transferType: "WIRE",
        orchestrationMode: "PARTNER_PROCESSOR",
        description: "Deposit via app",
        comment: "Submitted from deposit flow",
        sourceAccount: {
          id: sourceInstructionId,
          type: "CLIENT",
        },
        destinationAccount: {
          id: input.destinationAccountId,
          type: "CLIENT",
        },
        externalId: `deposit-${input.userId.slice(0, 8)}-${Date.now()}`,
        metadata: {
          additionalProp1: {},
        },
        sourceCurrency: "USD",
        sourceAmount: formatAmountToUsdString(input.amountUsd),
      },
      meta: {
        additionalProp1: {},
      },
    });

    return {
      deposit: {
        depositId: depositResult.depositId,
        status: depositResult.status,
        submittedAt: depositResult.submittedAt,
        destinationAccountId: input.destinationAccountId,
        amountUsd: input.amountUsd,
        currency: "USD",
        providerReference: depositResult.providerReference,
      },
      meta: {
        provider: depositResult.provider,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    if (error instanceof PaymentsServiceError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unexpected deposit integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new PaymentsServiceError("SERVER_CONFIG_ERROR", message, 500);
    }
    throw new PaymentsServiceError("DEPOSIT_SUBMIT_FAILED", message, 502);
  }
}
