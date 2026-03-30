import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import {
  getDestinationAccounts,
  PaymentsServiceError,
} from "@/server/features/payments/service";

function parseUserId(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") ?? request.headers.get("x-user-id") ?? "";
  if (!userId) {
    throw new PaymentsServiceError(
      "INVALID_DEPOSIT_INPUT",
      "Missing userId. Provide ?userId=<uuid> or x-user-id header.",
      400,
    );
  }
  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = parseUserId(request);
    const payload = await getDestinationAccounts(userId);
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof PaymentsServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
