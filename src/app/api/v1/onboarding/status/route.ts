import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";
import { getOnboardingStatus, OnboardingServiceError } from "@/server/features/onboarding/service";

export const GET = withAuthedRoute(
  async (_request: NextRequest, user) => {
    const payload = await getOnboardingStatus(user.userId);
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
