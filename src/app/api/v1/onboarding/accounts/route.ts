import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";
import { createAccount, OnboardingServiceError } from "@/server/features/onboarding/service";
import type { CreateAccountRequest } from "@/server/features/onboarding/types";

export const POST = withAuthedRoute(
  async (request: NextRequest, user) => {
    const body = (await request.json()) as CreateAccountRequest;
    const payload = await createAccount(user.userId, body);
    return ok(payload, 201);
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
