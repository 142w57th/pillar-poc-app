import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";
import {
  getDestinationAccounts,
  PaymentsServiceError,
} from "@/server/features/payments/service";

export const GET = withAuthedRoute(
  async (_request: NextRequest, user) => {
    const payload = await getDestinationAccounts(user.userId);
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof PaymentsServiceError) {
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
  },
);
