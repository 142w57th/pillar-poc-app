import type { HarborCreatePartyInput, HarborCreatePartyResult } from "@/server/integrations/harbor/parties";

function assertRequired(value: string | undefined, field: string) {
  if (!value || value.trim() === "") {
    throw new Error(`Mock Harbor party create validation failed: ${field} is required.`);
  }
}

export async function createMockHarborParty(input: HarborCreatePartyInput): Promise<HarborCreatePartyResult> {
  assertRequired(input.personalInformation.lastName, "personalInformation.lastName");
  assertRequired(input.personalInformation.dateOfBirth, "personalInformation.dateOfBirth");
  assertRequired(input.personalInformation.email, "personalInformation.email");
  assertRequired(input.personalInformation.phone.countryCode, "personalInformation.phone.countryCode");
  assertRequired(input.personalInformation.phone.phoneNumber, "personalInformation.phone.phoneNumber");

  return {
    externalId: input.externalId ?? `mock-party-${Date.now()}`,
    partyId: crypto.randomUUID(),
    errors: [],
  };
}
