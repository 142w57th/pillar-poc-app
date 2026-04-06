import { randomUUID } from "node:crypto";

import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

type HarborCreateAccountRequest = {
  data: {
    externalId: string;
    accountTemplateCode: string;
    investmentProfile: {
      objectives: Array<{
        objective: "INCOME" | "GROWTH" | "SPECULATION" | "TRADING";
      }>;
      riskTolerance: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
      timeHorizon?: {
        minYears: number;
        maxYears: number;
      };
    };
    sourceOfFunds?: {
      items: Array<{
        source:
          | "WAGE_INCOME"
          | "PENSION_RETIREMENT"
          | "FUNDS_FROM_ANOTHER_ACCOUNT"
          | "SAVINGS"
          | "SALE_OF_BUSINESS_OR_PROPERTY"
          | "INSURANCE_PAYOUT"
          | "GIFT_INHERITANCE"
          | "OTHER";
      }>;
    };
    dividendReinvestmentInstruction?:
      | "PAID_IN_CASH_AND_HELD_IN_ACCOUNT"
      | "SEND_MONTHLY_CHECK"
      | "SEND_ACH"
      | "REINVEST";
    attestations?: Array<{
      attestationType: "AGREEMENT";
      code: "DIGITAL_ASSETS_USER_AGREEMENT";
      accepted: true;
      signedAt: string;
      agreementName: string;
      documentHash: string;
      signedIpAddress: string;
      signedByPartyId: string;
      signedByRelation: "PRIMARY_OWNER";
    }>;
    relationships: Array<
      | {
          partyId: string;
          relation: "PRIMARY_OWNER";
          accountRole: "TRADING_HOLDER";
        }
      | {
          partyId: string;
          relation: "TAX_REPORTER";
        }
    >;
  };
};

type HarborCreateAccountResponse = {
  data?: {
    accountId?: string;
    externalId?: string;
    errors?: string[];
  };
  errors?: string[];
  meta?: Record<string, unknown>;
};

export type HarborCreateAccountInput = {
  partyId: string;
  accountTemplateCode: string;
  investmentObjective: string;
  investmentObjectives?: string[];
  riskTolerance: string;
  sourceOfFunds?: string;
  sourceOfFundsItems?: string[];
  timeHorizonMinYears?: string;
  timeHorizonMaxYears?: string;
  dividendReinvestmentInstruction?: string;
};

export type HarborCreateAccountResult = {
  accountId: string;
  externalId: string;
  errors: string[];
};

function mapInvestmentObjective(value: string): "INCOME" | "GROWTH" | "SPECULATION" | "TRADING" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "income") return "INCOME";
  if (normalized === "growth") return "GROWTH";
  if (normalized === "speculation") return "SPECULATION";
  if (normalized === "trading") return "TRADING";
  // "Capital Preservation" and unknown values map to safest objective.
  return "INCOME";
}

function mapRiskTolerance(value: string): "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "low") return "CONSERVATIVE";
  if (normalized === "high") return "AGGRESSIVE";
  return "MODERATE";
}

function mapSourceOfFunds(value?: string):
  | "WAGE_INCOME"
  | "PENSION_RETIREMENT"
  | "FUNDS_FROM_ANOTHER_ACCOUNT"
  | "SAVINGS"
  | "SALE_OF_BUSINESS_OR_PROPERTY"
  | "INSURANCE_PAYOUT"
  | "GIFT_INHERITANCE"
  | "OTHER" {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "wage income") return "WAGE_INCOME";
  if (normalized === "pension / retirement") return "PENSION_RETIREMENT";
  if (normalized === "funds from another account") return "FUNDS_FROM_ANOTHER_ACCOUNT";
  if (normalized === "savings") return "SAVINGS";
  if (normalized === "sale of business or property") return "SALE_OF_BUSINESS_OR_PROPERTY";
  if (normalized === "insurance payout") return "INSURANCE_PAYOUT";
  if (normalized === "gift / inheritance") return "GIFT_INHERITANCE";
  return "OTHER";
}


function normalizeYears(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

function mapDividendInstruction(
  value?: string,
):
  | "PAID_IN_CASH_AND_HELD_IN_ACCOUNT"
  | "SEND_MONTHLY_CHECK"
  | "SEND_ACH"
  | "REINVEST"
  | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "cash in account") return "PAID_IN_CASH_AND_HELD_IN_ACCOUNT";
  if (normalized === "monthly check") return "SEND_MONTHLY_CHECK";
  if (normalized === "ach") return "SEND_ACH";
  return "REINVEST";
}

export function buildHarborCreateAccountRequest(input: HarborCreateAccountInput): HarborCreateAccountRequest {
  const minYears = normalizeYears(input.timeHorizonMinYears);
  const maxYears = normalizeYears(input.timeHorizonMaxYears);
  const dividendReinvestmentInstruction = mapDividendInstruction(input.dividendReinvestmentInstruction);
  const sourceSelections = Array.from(
    new Set(
      [input.sourceOfFunds, ...(input.sourceOfFundsItems ?? [])]
        .map((item) => item?.trim() ?? "")
        .filter(Boolean),
    ),
  );
  const sourceOfFunds =
    sourceSelections.length > 0
      ? {
          items: sourceSelections.map((item) => ({
            source: mapSourceOfFunds(item),
          })),
        }
      : undefined;
  const objectiveSelections = Array.from(
    new Set(
      [input.investmentObjective, ...(input.investmentObjectives ?? [])]
        .map((item) => item?.trim() ?? "")
        .filter(Boolean),
    ),
  );
  const normalizedObjectives = (objectiveSelections.length > 0 ? objectiveSelections : ["INCOME"]).map((item) =>
    mapInvestmentObjective(item),
  );
  const isDigitalAssetsTemplate = input.accountTemplateCode === "DIGITAL_ASSETS_STANDARD";
  const digitalAssetsAttestations: HarborCreateAccountRequest["data"]["attestations"] = isDigitalAssetsTemplate
    ? [
        {
          attestationType: "AGREEMENT",
          code: "DIGITAL_ASSETS_USER_AGREEMENT",
          accepted: true,
          signedAt: new Date().toISOString(),
          agreementName: "Digital Assets User Agreement",
          documentHash: "0".repeat(64),
          signedIpAddress: "127.0.0.1",
          signedByPartyId: input.partyId,
          signedByRelation: "PRIMARY_OWNER",
        },
      ]
    : undefined;

  return {
    data: {
      externalId: randomUUID(),
      accountTemplateCode: input.accountTemplateCode,
      investmentProfile: {
        objectives: normalizedObjectives.map((objective) => ({
          objective,
        })),
        riskTolerance: mapRiskTolerance(input.riskTolerance),
        ...(typeof minYears === "number" && typeof maxYears === "number"
          ? { timeHorizon: { minYears, maxYears } }
          : {}),
      },
      ...(sourceOfFunds ? { sourceOfFunds } : {}),
      ...(dividendReinvestmentInstruction ? { dividendReinvestmentInstruction } : {}),
      ...(digitalAssetsAttestations ? { attestations: digitalAssetsAttestations } : {}),
      relationships: [
        {
          partyId: input.partyId,
          relation: "PRIMARY_OWNER",
          accountRole: "TRADING_HOLDER",
        },
        {
          partyId: input.partyId,
          relation: "TAX_REPORTER",
        },
      ],
    },
  };
}

export async function createHarborAccount(input: HarborCreateAccountInput): Promise<HarborCreateAccountResult> {
  const config = getHarborConfig();
  const body = buildHarborCreateAccountRequest(input);
  const idempotencyKey = randomUUID();

  const response = await harborFetch<HarborCreateAccountResponse>(config.accountsPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.data?.accountId) {
    const providerErrors = response.data?.errors?.length
      ? response.data.errors
      : response.errors?.length
        ? response.errors
        : ["Account create API returned no accountId."];
    throw new Error(`Account create failed: ${providerErrors.join("; ")}`);
  }

  return {
    accountId: response.data.accountId,
    externalId: response.data.externalId ?? body.data.externalId,
    errors: response.data.errors ?? [],
  };
}
