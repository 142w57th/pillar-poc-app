import { randomUUID } from "node:crypto";

import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

type HarborCreatePartyRequest = {
  data: {
    partyType: "INDIVIDUAL";
    status?: "DRAFT" | "SUBMITTED";
    externalId: string;
    personalInformation: {
      firstName?: string | null;
      middleName?: string | null;
      lastName: string;
      suffix?: string | null;
      dateOfBirth: string;
      countryOfLegalResidence: string;
      profile?: {
        workInformation?: {
          employmentType:
            | "EMPLOYED"
            | "SELF_EMPLOYED"
            | "RETIRED"
            | "STUDENT"
            | "NOT_EMPLOYED"
            | null;
          occupation: string | null;
          typeOfBusiness: string | null;
          occupationCategory: "COMPUTER_PROGRAMMER_ADMINISTRATOR_SOFTWARE_ENGINEER_IT_SOFTWARE_TECHNOLOGY_COMPANY";
        };
        employerInformation?: {
          employer: string | null;
          address: {
            line1: string;
            city: string;
            countryCode: string;
            region?: string;
            postalCode?: string;
          } | null;
          phoneNumber: {
            countryCode: string;
            phoneNumber: string;
          } | null;
        };
        financialInformation?: {
          annualIncome: number;
          liquidNetWorth: number;
          totalNetWorth: number;
          marginalTaxRate: number;
        };
      };
    };
    identificationInformation: {
      identifications: Array<{
        type: "SSN";
        value: string;
        roles: ["TAX_REPORTING"];
      }>;
    };
    contactPoints: Array<
      | {
          type: "EMAIL";
          roles: string[];
          emailAddress: string;
        }
      | {
          type: "PHONE";
          roles: string[];
          phone: {
            countryCode: string;
            phoneNumber: string;
          };
        }
      | {
          type: "ADDRESS";
          roles: string[];
          address: {
            line1: string;
            city: string;
            countryCode: string;
          };
        }
    >;
  };
};

type HarborCreatePartyResponse = {
  data?: {
    externalId?: string;
    clientId?: string;
    partyId?: string;
    errors?: string[];
  };
  errors?: string[];
  meta?: Record<string, unknown>;
};

export type HarborCreatePartyInput = {
  externalId?: string;
  personalInformation: {
    firstName: string;
    middleInitial?: string;
    lastName: string;
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
    employmentType?: string;
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
    marginalTaxRate?: string;
  };
};

export type HarborCreatePartyResult = {
  externalId: string;
  clientId: string;
  errors: string[];
};

function normalizeCountryCode(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  if (normalized.length === 2) return normalized;

  const map: Record<string, string> = {
    "UNITED STATES": "US",
    USA: "US",
    CANADA: "CA",
    "UNITED KINGDOM": "GB",
    AUSTRALIA: "AU",
  };

  return map[normalized] ?? "US";
}

function mapEmploymentType(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "employed") return "EMPLOYED" as const;
  if (normalized === "self-employed" || normalized === "self employed")
    return "SELF_EMPLOYED" as const;
  if (normalized === "retired") return "RETIRED" as const;
  if (normalized === "student") return "STUDENT" as const;
  if (normalized === "unemployed" || normalized === "not employed")
    return "NOT_EMPLOYED" as const;
  return null;
}

function mapBusinessType(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "technology") return "INFORMATION";
  if (normalized === "finance") return "FINANCE_AND_INSURANCE";
  if (normalized === "healthcare") return "HEALTH_CARE_AND_SOCIAL_ASSISTANCE";
  if (normalized === "education") return "EDUCATIONAL_SERVICES";
  if (normalized === "other") return "OTHER_SERVICES";
  return null;
}

function normalizeMoney(value?: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function normalizeMarginalTaxRate(value?: string): number {
  if (!value) return 0;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function normalizePhoneParts(
  rawPhone: string | undefined,
  fallbackCountryCode: string,
) {
  const digits = (rawPhone ?? "").replace(/\D/g, "");
  return {
    countryCode: fallbackCountryCode.trim(),
    phoneNumber: digits.slice(0, 10),
  };
}

function normalizeRegion(
  rawRegion: string | undefined,
  countryCode: string,
): string | undefined {
  const value = rawRegion?.trim();
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(upper)) {
    return upper.slice(0, 12);
  }
  if (/^[A-Z0-9]{1,3}$/.test(upper)) {
    return `${countryCode}-${upper}`.slice(0, 12);
  }
  return undefined;
}

function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  // Practical API-level validation (not RFC exhaustive).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requireNonEmpty(
  value: string | undefined | null,
  fieldName: string,
): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new Error(`Party create failed: ${fieldName} is required.`);
  }
  return normalized;
}

export function buildHarborCreatePartyRequest(
  input: HarborCreatePartyInput,
): HarborCreatePartyRequest {
  const externalId = input.externalId?.trim() || randomUUID();
  if (/\s/.test(externalId)) {
    throw new Error(
      "Party create failed: externalId must not contain whitespace.",
    );
  }

  const legalAddressLine1 = requireNonEmpty(
    input.personalInformation.legalAddress.line1,
    "legalAddress.line1",
  );
  const legalAddressCity = requireNonEmpty(
    input.personalInformation.legalAddress.city,
    "legalAddress.city",
  );
  const lastName = requireNonEmpty(
    input.personalInformation.lastName,
    "personalInformation.lastName",
  );
  const dateOfBirth = requireNonEmpty(
    input.personalInformation.dateOfBirth,
    "personalInformation.dateOfBirth",
  );
  const taxId = requireNonEmpty(
    input.personalInformation.taxId,
    "personalInformation.taxId",
  );

  const countryCode = normalizeCountryCode(
    input.personalInformation.legalAddress.countryCode ||
      input.personalInformation.country,
  );
  const legalCountryOfResidence = requireNonEmpty(
    countryCode,
    "personalInformation.countryOfLegalResidence",
  );
  const employerPhone = input.suitability.businessPhoneNumber
    ? {
        countryCode: (
          input.suitability.businessPhoneCountryCode ||
          input.personalInformation.phone.countryCode
        ).trim(),
        phoneNumber: input.suitability.businessPhoneNumber
          .replace(/\D/g, "")
          .slice(0, 10),
      }
    : normalizePhoneParts(
        input.suitability.businessPhone,
        input.personalInformation.phone.countryCode,
      );
  const emailAddress = normalizeEmail(input.personalInformation.email);
  if (!isValidEmail(emailAddress)) {
    throw new Error(
      "Party create failed: personalInformation.email must be a valid email address.",
    );
  }
  const employerRegion = normalizeRegion(
    input.suitability.businessRegion,
    countryCode,
  );
  const employerPostalCode =
    input.suitability.businessPostalCode?.trim().slice(0, 20) || undefined;
  const employerAddressLine = input.suitability.businessAddress?.trim() || null;
  const employerAddress = employerAddressLine
    ? {
        line1: employerAddressLine,
        city: legalAddressCity,
        countryCode: legalCountryOfResidence,
        region: employerRegion,
        postalCode: employerPostalCode,
      }
    : null;

  return {
    data: {
      partyType: "INDIVIDUAL",
      status: "SUBMITTED",
      externalId,
      personalInformation: {
        firstName: input.personalInformation.firstName?.trim() || null,
        middleName: input.personalInformation.middleInitial?.trim() || null,
        lastName,
        suffix: input.personalInformation.suffix?.trim() || null,
        dateOfBirth,
        countryOfLegalResidence: legalCountryOfResidence,
        profile: {
          workInformation: {
            employmentType: mapEmploymentType(input.suitability.employmentType),
            occupation: input.suitability.occupation?.trim() || null,
            typeOfBusiness: mapBusinessType(input.suitability.businessType),
            occupationCategory: "COMPUTER_PROGRAMMER_ADMINISTRATOR_SOFTWARE_ENGINEER_IT_SOFTWARE_TECHNOLOGY_COMPANY",
          },
          employerInformation: {
            employer: input.suitability.employer?.trim() || null,
            address: employerAddress,
            phoneNumber: employerPhone.phoneNumber
              ? {
                  countryCode: employerPhone.countryCode,
                  phoneNumber: employerPhone.phoneNumber,
                }
              : null,
          },
          financialInformation: {
            annualIncome: normalizeMoney(input.suitability.annualIncome),
            liquidNetWorth: normalizeMoney(input.suitability.liquidNetWorth),
            totalNetWorth: normalizeMoney(input.suitability.totalNetWorth),
            marginalTaxRate: normalizeMarginalTaxRate(
              input.suitability.marginalTaxRate,
            ),
          },
        },
      },

      identificationInformation: {
        identifications: [
          {
            type: "SSN",
            value: taxId,
            roles: ["TAX_REPORTING"],
          },
        ],
      },
      contactPoints: [
        {
          type: "EMAIL",
          roles: ["PRIMARY"],
          emailAddress,
        },
        {
          type: "PHONE",
          roles: ["PRIMARY"],
          phone: {
            countryCode: requireNonEmpty(
              input.personalInformation.phone.countryCode,
              "personalInformation.phone.countryCode",
            ),
            phoneNumber: requireNonEmpty(
              input.personalInformation.phone.phoneNumber,
              "personalInformation.phone.phoneNumber",
            ),
          },
        },
        {
          type: "ADDRESS",
          roles: ["PRIMARY"],
          address: {
            line1: legalAddressLine1,
            city: legalAddressCity,
            countryCode: legalCountryOfResidence,
          },
        },
      ],
    },
  };
}

export async function createHarborParty(
  input: HarborCreatePartyInput,
): Promise<HarborCreatePartyResult> {
  const config = getHarborConfig();
  const body = buildHarborCreatePartyRequest(input);
  const idempotencyKey = randomUUID();

  const response = await harborFetch<HarborCreatePartyResponse>(
    config.partiesPath,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(body),
    },
  );

  const createdClientId = response.data?.clientId ?? response.data?.partyId;

  if (!createdClientId) {
    const providerErrors = response.data?.errors?.length
      ? response.data.errors
      : response.errors?.length
        ? response.errors
        : ["Party create API returned no clientId."];
    throw new Error(`Party create failed: ${providerErrors.join("; ")}`);
  }

  return {
    externalId: response.data?.externalId ?? input.externalId ?? "",
    clientId: createdClientId,
    errors: response.data?.errors ?? [],
  };
}
