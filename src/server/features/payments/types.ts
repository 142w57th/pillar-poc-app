import type { HarborProviderId, HarborPaymentInstructionAccount } from "@/server/integrations/harbor/payments";

export type PaymentsDestinationAccount = {
  accountType: string;
  externalAccountId: string;
  label: string;
};

export type PaymentInstructionsResult = {
  accounts: HarborPaymentInstructionAccount[];
  meta: {
    provider: HarborProviderId;
    source: string;
    generatedAt: string;
  };
};

export type DestinationAccountsResult = {
  accounts: PaymentsDestinationAccount[];
  meta: {
    userId: string;
    count: number;
    source: "kv-store";
  };
};

export type SubmitDepositInput = {
  userId: string;
  sourceInstructionId?: string;
  destinationAccountId: string;
  amountUsd: number;
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
    provider: HarborProviderId;
    generatedAt: string;
  };
};
