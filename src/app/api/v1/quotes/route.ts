import { NextRequest } from "next/server";

import { getQuote, QuotesServiceError } from "@/server/features/quotes/service";
import { fail, ok } from "@/server/http/response";

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
    const includeExtendedHoursRaw = request.nextUrl.searchParams.get("includeExtendedHours");
    const includeExtendedHours = includeExtendedHoursRaw === "true";
    const payload = await getQuote(symbol, {
      assetClass: request.nextUrl.searchParams.get("assetClass") ?? undefined,
      includeExtendedHours,
    });
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof QuotesServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
