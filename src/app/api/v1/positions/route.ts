import { NextRequest } from "next/server";

import { getPositions, PositionsServiceError } from "@/server/features/positions/service";
import { fail, ok } from "@/server/http/response";

export async function GET(request: NextRequest) {
  try {
    const scopeRaw = request.nextUrl.searchParams.get("scope")?.trim().toLowerCase();
    const scope = scopeRaw === "account" ? "account" : "party";
    const payload = await getPositions({
      assetClass: request.nextUrl.searchParams.get("assetClass") ?? undefined,
      symbol: request.nextUrl.searchParams.get("symbol") ?? undefined,
      scope,
    });
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof PositionsServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
