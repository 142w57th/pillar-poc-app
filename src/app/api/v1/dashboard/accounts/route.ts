import { NextRequest } from "next/server";

import { DashboardServiceError, getDashboardAccountBalances } from "@/server/features/dashboard/service";
import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";

export const GET = withAuthedRoute(
  async (_request: NextRequest, user) => {
    const payload = await getDashboardAccountBalances(user.userId);
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof DashboardServiceError) {
        console.error(`[dashboard/accounts] ${error.code} (${error.status}): ${error.message}`);
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
    logLabel: "dashboard/accounts",
  },
);
