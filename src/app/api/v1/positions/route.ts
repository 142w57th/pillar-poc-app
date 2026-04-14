import { NextRequest } from "next/server";

import { getPositions, PositionsServiceError } from "@/server/features/positions/service";
import { withAuthedRoute } from "@/server/http/authed-route";
import { fail, ok } from "@/server/http/response";

export const GET = withAuthedRoute(
  async (request: NextRequest, user) => {
    const scopeRaw = request.nextUrl.searchParams.get("scope")?.trim().toLowerCase();
    const scope = scopeRaw === "account" ? "account" : "party";
    const payload = await getPositions(user.userId, {
      assetClass: request.nextUrl.searchParams.get("assetClass") ?? undefined,
      symbol: request.nextUrl.searchParams.get("symbol") ?? undefined,
      scope,
    });
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof PositionsServiceError) {
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
  },
);
