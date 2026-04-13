import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";
import { getOnboardingAccountTemplates, OnboardingServiceError } from "@/server/features/onboarding/service";

export const GET = withAuthedRoute(
  async () => {
    const payload = await getOnboardingAccountTemplates();
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof OnboardingServiceError) {
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
  },
);
