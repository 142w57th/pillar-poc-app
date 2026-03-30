import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { DashboardServiceError, getBalancesSnapshot } from "@/server/features/dashboard/service";

function parseUserId(request: NextRequest) {
  const userIdFromQuery = request.nextUrl.searchParams.get("userId");
  const userIdFromHeader = request.headers.get("x-user-id");
  const userId = userIdFromQuery ?? userIdFromHeader ?? "";

  if (!userId) {
    throw new DashboardServiceError(
      "SERVER_CONFIG_ERROR",
      "Missing userId. Provide ?userId=<uuid> or x-user-id header.",
      400,
    );
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(userId)) {
    throw new DashboardServiceError("SERVER_CONFIG_ERROR", "Invalid userId format. Expected UUID.", 400);
  }

  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = parseUserId(request);
    const payload = await getBalancesSnapshot(userId);
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof DashboardServiceError) {
      console.error(`[balances] ${error.code} (${error.status}): ${error.message}`);
      return fail(error.code, error.message, error.status);
    }

    console.error("[balances] Unhandled error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
