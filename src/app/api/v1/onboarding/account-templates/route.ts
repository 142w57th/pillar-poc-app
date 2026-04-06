import { fail, ok } from "@/server/http/response";
import { getOnboardingAccountTemplates, OnboardingServiceError } from "@/server/features/onboarding/service";

export async function GET() {
  try {
    const payload = await getOnboardingAccountTemplates();
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof OnboardingServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
