import { randomUUID } from "node:crypto";

import {
  getClientByUserId,
  createClientForUserId,
  listBrokerAccountsByUserId,
  upsertBrokerAccountForUserId,
} from "@/server/storage/kv-store";
import type {
  OnboardingStatusResult,
  CreateAccountRequest,
  CreateAccountResult,
} from "@/server/features/onboarding/types";

type OnboardingErrorCode =
  | "MISSING_USER_ID"
  | "INVALID_USER_ID"
  | "MISSING_ACCOUNT_TYPE"
  | "INVALID_ACCOUNT_TYPE"
  | "ACCOUNT_ALREADY_EXISTS"
  | "CLIENT_NOT_ONBOARDED"
  | "MISSING_SUITABILITY"
  | "SERVER_ERROR";

const VALID_ACCOUNT_TYPES = ["equity", "crypto", "event-contract"] as const;

export class OnboardingServiceError extends Error {
  code: OnboardingErrorCode;
  status: number;

  constructor(code: OnboardingErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUserId(userId: string | null | undefined): string {
  if (!userId) {
    throw new OnboardingServiceError("MISSING_USER_ID", "userId is required.", 400);
  }
  if (!UUID_RE.test(userId)) {
    throw new OnboardingServiceError("INVALID_USER_ID", "userId must be a valid UUID.", 400);
  }
  return userId;
}

export async function getOnboardingStatus(rawUserId: string | null | undefined): Promise<OnboardingStatusResult> {
  const userId = validateUserId(rawUserId);

  const client = await getClientByUserId(userId);
  const accounts = await listBrokerAccountsByUserId(userId);

  return {
    clientOnboarded: client !== null,
    clientId: client?.id ?? null,
    accounts,
  };
}

export async function createAccount(request: CreateAccountRequest): Promise<CreateAccountResult> {
  const userId = validateUserId(request.userId);

  if (!request.accountType) {
    throw new OnboardingServiceError("MISSING_ACCOUNT_TYPE", "accountType is required.");
  }

  if (!VALID_ACCOUNT_TYPES.includes(request.accountType as (typeof VALID_ACCOUNT_TYPES)[number])) {
    throw new OnboardingServiceError(
      "INVALID_ACCOUNT_TYPE",
      `Invalid accountType "${request.accountType}". Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
    );
  }

  if (!request.suitability?.investmentObjective || !request.suitability?.riskTolerance || !request.suitability?.employmentType) {
    throw new OnboardingServiceError("MISSING_SUITABILITY", "Suitability fields (employmentType, investmentObjective, riskTolerance) are required.");
  }

  const existingClient = await getClientByUserId(userId);

  if (!existingClient && !request.personalInfo) {
    throw new OnboardingServiceError(
      "CLIENT_NOT_ONBOARDED",
      "personalInfo is required for first-time client onboarding.",
    );
  }

  const existingAccounts = await listBrokerAccountsByUserId(userId);
  const alreadyHasAccount = existingAccounts.some((a) => a.accountType === request.accountType);
  if (alreadyHasAccount) {
    throw new OnboardingServiceError(
      "ACCOUNT_ALREADY_EXISTS",
      `An account of type "${request.accountType}" already exists for this user.`,
      409,
    );
  }

  const client = existingClient ?? await createClientForUserId(userId);

  const externalAccountId = randomUUID();
  await upsertBrokerAccountForUserId(userId, request.accountType, externalAccountId);

  const updatedAccounts = await listBrokerAccountsByUserId(userId);
  const created = updatedAccounts.find((a) => a.accountType === request.accountType);

  return {
    clientId: client.id,
    accountId: created?.externalAccountId ?? externalAccountId,
    externalAccountId: created?.externalAccountId ?? externalAccountId,
    accountType: request.accountType,
  };
}
