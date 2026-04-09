import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { DashboardServiceError, getBalancesSnapshot } from "@/server/features/dashboard/service";

export async function GET(request: NextRequest) {
  try {
    const scopeRaw = request.nextUrl.searchParams.get("scope")?.trim().toLowerCase();
    const scope = scopeRaw === "account" ? "account" : "party";
    const payload = await getBalancesSnapshot({
      assetClass: request.nextUrl.searchParams.get("assetClass") ?? undefined,
      scope,
    });
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
