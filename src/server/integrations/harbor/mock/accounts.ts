import type { HarborCreateAccountInput, HarborCreateAccountResult } from "@/server/integrations/harbor/accounts";

const SUPPORTED_TEMPLATES = new Set([
  "DIGITAL_ASSETS_STANDARD",
  "RETAIL_SELF_DIRECTED_STANDARD",
]);

function assertRequired(value: string | undefined, field: string) {
  if (!value || value.trim() === "") {
    throw new Error(`Mock Harbor account create validation failed: ${field} is required.`);
  }
}

export async function createMockHarborAccount(input: HarborCreateAccountInput): Promise<HarborCreateAccountResult> {
  assertRequired(input.partyId, "partyId");
  assertRequired(input.accountTemplateCode, "accountTemplateCode");

  if (!SUPPORTED_TEMPLATES.has(input.accountTemplateCode)) {
    throw new Error(
      `Mock Harbor account create validation failed: unsupported accountTemplateCode "${input.accountTemplateCode}".`,
    );
  }

  return {
    accountId: crypto.randomUUID(),
    externalId: `mock-acct-${Date.now()}`,
    errors: [],
  };
}
