import { listBrokerAccountsByUserId } from "@/server/storage/kv-store";
import { getHarborProvider } from "@/server/integrations/harbor/provider";
import type {
  DestinationAccountsResult,
  PaymentInstructionsResult,
  SubmitDepositInput,
  SubmitDepositResult,
} from "@/server/features/payments/types";

type PaymentsErrorCode =
  | "INVALID_DEPOSIT_INPUT"
  | "PAYMENT_INSTRUCTIONS_FETCH_FAILED"
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

function resolveProviderId() {
  return process.env.HARBOR_PROVIDER?.trim().toLowerCase() === "real" ? "harbor" : "mock";
}

function formatAmountToUsdString(amountUsd: number) {
  return amountUsd.toFixed(2);
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
