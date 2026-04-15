import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";
import { DashboardServiceError, getBalancesSnapshot } from "@/server/features/dashboard/service";

export const GET = withAuthedRoute(
  async (request: NextRequest, user) => {
    const scopeRaw = request.nextUrl.searchParams.get("scope")?.trim().toLowerCase();
    const scope = scopeRaw === "account" ? "account" : "party";
    const payload = await getBalancesSnapshot(user.userId, {
      assetClass: request.nextUrl.searchParams.get("assetClass") ?? undefined,
      scope,
    });
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof DashboardServiceError) {
        console.error(`[balances] ${error.code} (${error.status}): ${error.message}`);
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
    logLabel: "balances",
  },
);
