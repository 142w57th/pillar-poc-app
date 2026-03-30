import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { createAccount, OnboardingServiceError } from "@/server/features/onboarding/service";
import type { CreateAccountRequest } from "@/server/features/onboarding/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAccountRequest;
    const payload = await createAccount(body);
    return ok(payload, 201);
  } catch (error: unknown) {
    if (error instanceof OnboardingServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
