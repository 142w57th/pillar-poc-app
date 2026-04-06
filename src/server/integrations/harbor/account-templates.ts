import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

export type HarborAccountTemplate = {
  accountTemplateCode: string;
  offeringCode?: string;
  defaults?: {
    profile?: {
      primaryUseCase?: string;
      serviceModel?: string;
    };
    entitlements?: Record<string, unknown>;
  };
};

export type HarborAccountTemplatesResponse = {
  data: {
    accountTemplates: HarborAccountTemplate[];
  };
  meta: Record<string, unknown>;
};

export async function fetchHarborAccountTemplates() {
  const config = getHarborConfig();
  const response = await harborFetch<HarborAccountTemplatesResponse>(config.accountTemplatesPath);
  return response;
}
