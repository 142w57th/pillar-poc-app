import { NextRequest } from "next/server";

import { DashboardServiceError, getDashboardAccountBalanceByType } from "@/server/features/dashboard/service";
import { fail, ok } from "@/server/http/response";

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

function parseAccountType(request: NextRequest) {
  const accountType = request.nextUrl.searchParams.get("accountType") ?? "";
  if (!accountType.trim()) {
    throw new DashboardServiceError(
      "INVALID_ACCOUNT_TYPE",
      "Missing accountType. Provide ?accountType=<account-type>.",
      400,
    );
  }

  return accountType;
}

export async function GET(request: NextRequest) {
  try {
    const userId = parseUserId(request);
    const accountType = parseAccountType(request);
    const payload = await getDashboardAccountBalanceByType(userId, accountType);
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof DashboardServiceError) {
      console.error(`[dashboard/accounts/by-type] ${error.code} (${error.status}): ${error.message}`);
      return fail(error.code, error.message, error.status);
    }

    console.error("[dashboard/accounts/by-type] Unhandled error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
