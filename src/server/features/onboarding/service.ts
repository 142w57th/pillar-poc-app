import { randomUUID } from "node:crypto";

import {
  getCurrentClient,
  createClientForUserId,
  listBrokerAccountsByUserId,
  upsertBrokerAccountForUserId,
} from "@/server/storage/keyv-store";
import { getHarborProvider } from "@/server/integrations/harbor/provider";
import type {
  OnboardingStatusResult,
  OnboardingAccountTemplatesResult,
  CreateAccountRequest,
  CreateAccountResult,
} from "@/server/features/onboarding/types";

type OnboardingErrorCode =
  | "MISSING_ACCOUNT_TYPE"
  | "INVALID_ACCOUNT_TYPE"
  | "ACCOUNT_ALREADY_EXISTS"
  | "CLIENT_NOT_ONBOARDED"
  | "MISSING_SUITABILITY"
  | "MISSING_PERSONAL_INFO"
  | "ACCOUNT_TEMPLATES_FETCH_FAILED"
  | "PARTY_CREATE_FAILED"
  | "ACCOUNT_CREATE_FAILED"
  | "SERVER_CONFIG_ERROR"
  | "SERVER_ERROR";

const VALID_ACCOUNT_TYPES = [
  "equity",
  "crypto",
  "event-contract",
  "EVENT_CONTRACTS_STANDARD",
  "DIGITAL_ASSETS_STANDARD",
  "RETAIL_SELF_DIRECTED_STANDARD",
  "ADVISOR_MANAGED_TRUST_STANDARD",
] as const;

export class OnboardingServiceError extends Error {
  code: OnboardingErrorCode;
  status: number;

  constructor(code: OnboardingErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function resolveAccountTemplateCode(accountType: string): string {
  const normalized = accountType.trim().toUpperCase();
  if (
    normalized === "EVENT_CONTRACTS_STANDARD" ||
    normalized === "DIGITAL_ASSETS_STANDARD" ||
    normalized === "RETAIL_SELF_DIRECTED_STANDARD" ||
    normalized === "ADVISOR_MANAGED_TRUST_STANDARD"
  ) {
    return normalized;
  }

  if (normalized === "EVENT-CONTRACT") return "EVENT_CONTRACTS_STANDARD";
  if (normalized === "CRYPTO") return "DIGITAL_ASSETS_STANDARD";
  if (normalized === "EQUITY") return "RETAIL_SELF_DIRECTED_STANDARD";

  throw new OnboardingServiceError(
    "INVALID_ACCOUNT_TYPE",
    `No Harbor account template mapping exists for accountType "${accountType}".`,
    400,
  );
}

export async function getOnboardingStatus(): Promise<OnboardingStatusResult> {
  const client = await getCurrentClient();
  const accounts = client ? await listBrokerAccountsByUserId(client.userId) : [];

  return {
    clientOnboarded: client !== null,
    clientId: client?.id ?? null,
    accounts,
  };
}

export async function getOnboardingAccountTemplates(): Promise<OnboardingAccountTemplatesResult> {
  const harborProvider = getHarborProvider();

  try {
    const response = await harborProvider.fetchAccountTemplates();
    const source = typeof response.meta.source === "string" ? response.meta.source : "harbor-provider";
    const generatedAt =
      typeof response.meta.generatedAt === "string" ? response.meta.generatedAt : new Date().toISOString();

    return {
      accountTemplates: response.data.accountTemplates.map((template) => ({
        accountTemplateCode: template.accountTemplateCode,
        offeringCode: template.offeringCode,
      })),
      meta: {
        provider: "harbor",
        source,
        generatedAt,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected account templates integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new OnboardingServiceError("SERVER_CONFIG_ERROR", message, 500);
    }
    throw new OnboardingServiceError("ACCOUNT_TEMPLATES_FETCH_FAILED", message, 502);
  }
}

export async function createAccount(request: CreateAccountRequest): Promise<CreateAccountResult> {
  if (!request.accountType) {
    throw new OnboardingServiceError("MISSING_ACCOUNT_TYPE", "accountType is required.");
  }

  if (!VALID_ACCOUNT_TYPES.includes(request.accountType as (typeof VALID_ACCOUNT_TYPES)[number])) {
    throw new OnboardingServiceError(
      "INVALID_ACCOUNT_TYPE",
      `Invalid accountType "${request.accountType}". Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
    );
  }

  const primaryInvestmentObjective =
    request.suitability?.investmentObjective?.trim() ||
    request.suitability?.investmentObjectives?.[0]?.trim() ||
    "";

  if (!primaryInvestmentObjective || !request.suitability?.riskTolerance) {
    throw new OnboardingServiceError(
      "MISSING_SUITABILITY",
      "Suitability fields (investmentObjectives/investmentObjective, riskTolerance) are required.",
    );
  }

  const existingClient = await getCurrentClient();
  const userIdForClient = existingClient?.userId ?? randomUUID();

  if (!existingClient && !request.personalInfo) {
    throw new OnboardingServiceError(
      "CLIENT_NOT_ONBOARDED",
      "personalInfo is required for first-time client onboarding.",
    );
  }

  const existingAccounts = existingClient ? await listBrokerAccountsByUserId(userIdForClient) : [];
  const alreadyHasAccount = existingAccounts.some((a) => a.accountType === request.accountType);
  if (alreadyHasAccount) {
    throw new OnboardingServiceError(
      "ACCOUNT_ALREADY_EXISTS",
      `An account of type "${request.accountType}" already exists for this user.`,
      409,
    );
  }

  const harborProvider = getHarborProvider();
  let client = existingClient;

  if (!client) {
    if (!request.personalInfo) {
      throw new OnboardingServiceError(
        "MISSING_PERSONAL_INFO",
        "personalInfo is required for first-time client onboarding.",
      );
    }

    if (!request.suitability?.employmentType) {
      throw new OnboardingServiceError(
        "MISSING_SUITABILITY",
        "employmentType is required for first-time party onboarding.",
      );
    }

    try {
      const party = await harborProvider.createParty({
        externalId: randomUUID(),
        personalInformation: {
          firstName: request.personalInfo.firstName,
          middleInitial: request.personalInfo.middleInitial,
          lastName: request.personalInfo.lastName,
          suffix: request.personalInfo.suffix,
          taxId: request.personalInfo.taxId,
          dateOfBirth: request.personalInfo.dateOfBirth,
          country: request.personalInfo.country,
          email: request.personalInfo.email,
          phone: request.personalInfo.phone,
          legalAddress: request.personalInfo.legalAddress,
        },
        suitability: {
          employmentType: request.suitability.employmentType,
          occupation: request.suitability.occupation,
          businessType: request.suitability.businessType,
          employer: request.suitability.employer,
          businessPhone: request.suitability.businessPhone,
          businessPhoneCountryCode: request.suitability.businessPhoneCountryCode,
          businessPhoneNumber: request.suitability.businessPhoneNumber,
          businessAddress: request.suitability.businessAddress,
          businessRegion: request.suitability.businessRegion,
          businessPostalCode: request.suitability.businessPostalCode,
          annualIncome: request.suitability.annualIncome,
          liquidNetWorth: request.suitability.liquidNetWorth,
          totalNetWorth: request.suitability.totalNetWorth,
        },
      });
      client = await createClientForUserId(userIdForClient, party.partyId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected party create integration error.";
      if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
        throw new OnboardingServiceError("SERVER_CONFIG_ERROR", message, 500);
      }
      throw new OnboardingServiceError("PARTY_CREATE_FAILED", message, 502);
    }
  }

  const accountTemplateCode = resolveAccountTemplateCode(request.accountType);
  let createdHarborAccountId: string;
  try {
    const createdAccount = await harborProvider.createAccount({
      partyId: client.id,
      accountTemplateCode,
      investmentObjective: primaryInvestmentObjective,
      investmentObjectives: request.suitability.investmentObjectives,
      riskTolerance: request.suitability.riskTolerance,
      sourceOfFunds: request.suitability.sourceOfFunds,
      sourceOfFundsItems: request.suitability.sourceOfFundsItems,
      timeHorizonMinYears: request.suitability.timeHorizonMinYears,
      timeHorizonMaxYears: request.suitability.timeHorizonMaxYears,
      dividendReinvestmentInstruction: request.suitability.dividendReinvestmentInstruction,
    });
    createdHarborAccountId = createdAccount.accountId;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected account create integration error.";
    throw new OnboardingServiceError("ACCOUNT_CREATE_FAILED", message, 502);
  }

  await upsertBrokerAccountForUserId(userIdForClient, request.accountType, createdHarborAccountId);

  const updatedAccounts = await listBrokerAccountsByUserId(userIdForClient);
  const created = updatedAccounts.find((a) => a.accountType === request.accountType);

  return {
    clientId: client.id,
    accountId: created?.externalAccountId ?? createdHarborAccountId,
    externalAccountId: created?.externalAccountId ?? createdHarborAccountId,
    accountType: request.accountType,
  };
}
