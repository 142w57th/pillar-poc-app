import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { getOnboardingStatus, OnboardingServiceError } from "@/server/features/onboarding/service";

export async function GET(request: NextRequest) {
  void request;
  try {
    const payload = await getOnboardingStatus();
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof OnboardingServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
