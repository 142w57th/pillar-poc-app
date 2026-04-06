import { randomUUID } from "node:crypto";

import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

type HarborCreatePartyRequest = {
  data: {
    partyType: "INDIVIDUAL";
    externalId?: string;
    personalInformation: {
      firstName?: string;
      middleName?: string;
      lastName: string;
      suffix?: string;
      dateOfBirth: string;
      countryOfLegalResidence: string;
      profile?: {
        workInformation?: {
          employmentType: "EMPLOYED" | "SELF_EMPLOYED" | "RETIRED" | "STUDENT" | "NOT_EMPLOYED" | null;
          occupation: string | null;
          typeOfBusiness: string | null;
        };
        employerInformation?: {
          employer: string | null;
          businessAddress: {
            line1: string;
            city: string;
            region: string;
            postalCode: string;
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
  };
};

export type HarborCreatePartyResult = {
  externalId: string;
  partyId: string;
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
  if (normalized === "self-employed" || normalized === "self employed") return "SELF_EMPLOYED" as const;
  if (normalized === "retired") return "RETIRED" as const;
  if (normalized === "student") return "STUDENT" as const;
  if (normalized === "unemployed" || normalized === "not employed") return "NOT_EMPLOYED" as const;
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

function normalizePhoneParts(rawPhone: string | undefined, fallbackCountryCode: string) {
  const digits = (rawPhone ?? "").replace(/\D/g, "");
  return {
    countryCode: fallbackCountryCode,
    phoneNumber: digits.slice(0, 10),
  };
}

function normalizeRegion(rawRegion: string | undefined, countryCode: string): string | null {
  const value = rawRegion?.trim();
  if (!value) return null;
  const upper = value.toUpperCase();
  if (/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(upper)) {
    return upper.slice(0, 6);
  }
  if (/^[A-Z0-9]{1,3}$/.test(upper)) {
    return `${countryCode}-${upper}`.slice(0, 6);
  }
  return null;
}

export function buildHarborCreatePartyRequest(input: HarborCreatePartyInput): HarborCreatePartyRequest {
  const countryCode = normalizeCountryCode(
    input.personalInformation.legalAddress.countryCode || input.personalInformation.country,
  );
  const employerPhone = input.suitability.businessPhoneNumber
    ? {
        countryCode: (input.suitability.businessPhoneCountryCode || input.personalInformation.phone.countryCode).trim(),
        phoneNumber: input.suitability.businessPhoneNumber.replace(/\D/g, "").slice(0, 10),
      }
    : normalizePhoneParts(
        input.suitability.businessPhone,
        input.personalInformation.phone.countryCode,
      );
  const employerRegion = normalizeRegion(input.suitability.businessRegion, countryCode);
  const employerPostalCode = input.suitability.businessPostalCode?.trim().slice(0, 10) || null;
  const employerAddressLine = input.suitability.businessAddress?.trim() || null;
  const employerBusinessAddress =
    employerAddressLine && employerRegion && employerPostalCode
      ? {
          line1: employerAddressLine,
          city: input.personalInformation.legalAddress.city,
          region: employerRegion,
          postalCode: employerPostalCode,
        }
      : null;

  return {
    data: {
      partyType: "INDIVIDUAL",
      externalId: input.externalId,
      personalInformation: {
        firstName: input.personalInformation.firstName || undefined,
        middleName: input.personalInformation.middleInitial || undefined,
        lastName: input.personalInformation.lastName,
        suffix: input.personalInformation.suffix || undefined,
        dateOfBirth: input.personalInformation.dateOfBirth,
        countryOfLegalResidence: countryCode,
        profile: {
          workInformation: {
            employmentType: mapEmploymentType(input.suitability.employmentType),
            occupation: input.suitability.occupation?.trim() || null,
            typeOfBusiness: mapBusinessType(input.suitability.businessType),
          },
          employerInformation: {
            employer: input.suitability.employer?.trim() || null,
            businessAddress: employerBusinessAddress,
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
          },
        },
      },
    
      identificationInformation: {
        identifications: [
          {
            type: "SSN",
            value: input.personalInformation.taxId,
            roles: ["TAX_REPORTING"],
          },
        ],
      },
      contactPoints: [
        {
          type: "EMAIL",
          roles: ["PRIMARY"],
          emailAddress: input.personalInformation.email,
        },
        {
          type: "PHONE",
          roles: ["PRIMARY"],
          phone: {
            countryCode: input.personalInformation.phone.countryCode,
            phoneNumber: input.personalInformation.phone.phoneNumber,
          },
        },
        {
          type: "ADDRESS",
          roles: ["PRIMARY"],
          address: {
            line1: input.personalInformation.legalAddress.line1,
            city: input.personalInformation.legalAddress.city,
            countryCode,
          },
        },
      ],
    },
  };
}

export async function createHarborParty(input: HarborCreatePartyInput): Promise<HarborCreatePartyResult> {
  const config = getHarborConfig();
  const body = buildHarborCreatePartyRequest(input);
  const idempotencyKey = randomUUID();

  const response = await harborFetch<HarborCreatePartyResponse>(config.partiesPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.data?.partyId) {
    const providerErrors = response.data?.errors?.length
      ? response.data.errors
      : response.errors?.length
        ? response.errors
        : ["Party create API returned no partyId."];
    throw new Error(`Party create failed: ${providerErrors.join("; ")}`);
  }

  return {
    externalId: response.data.externalId ?? input.externalId ?? "",
    partyId: response.data.partyId,
    errors: response.data.errors ?? [],
  };
}
