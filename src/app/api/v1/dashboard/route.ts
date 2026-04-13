import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";
import { DashboardServiceError, getDashboardSnapshot } from "@/server/features/dashboard/service";

export const GET = withAuthedRoute(
  async (_request: NextRequest, user) => {
    const payload = await getDashboardSnapshot(user.userId);
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof DashboardServiceError) {
        console.error(`[dashboard] ${error.code} (${error.status}): ${error.message}`);
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
    logLabel: "dashboard",
  },
);
