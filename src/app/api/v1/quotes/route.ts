import { NextRequest } from "next/server";

import { getQuote, QuotesServiceError } from "@/server/features/quotes/service";
import { withAuthedRoute } from "@/server/http/authed-route";
import { fail, ok } from "@/server/http/response";

export const GET = withAuthedRoute(
  async (request: NextRequest) => {
    const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
    const includeExtendedHoursRaw = request.nextUrl.searchParams.get("includeExtendedHours");
    const includeExtendedHours = includeExtendedHoursRaw === "true";
    const payload = await getQuote(symbol, {
      assetClass: request.nextUrl.searchParams.get("assetClass") ?? undefined,
      includeExtendedHours,
    });
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof QuotesServiceError) {
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
  },
);
