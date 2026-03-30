import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

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
  return harborFetch<HarborPaymentInstructionsResponse>(config.paymentInstructionsPath);
}

export async function submitHarborDeposit(input: HarborSubmitDepositRequest): Promise<HarborSubmitDepositResult> {
  const config = getHarborConfig();
  const response = await harborFetch<HarborSubmitDepositApiResponse>(config.depositsPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

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
