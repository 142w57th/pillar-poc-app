import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { getOnboardingStatus, OnboardingServiceError } from "@/server/features/onboarding/service";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") ?? request.headers.get("x-user-id");
    const payload = await getOnboardingStatus(userId);
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof OnboardingServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
