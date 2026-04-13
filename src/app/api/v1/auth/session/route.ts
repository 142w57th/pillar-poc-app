import { NextRequest } from "next/server";

import { withAuthedRoute } from "@/server/http/authed-route";
import { ok } from "@/server/http/response";

export const GET = withAuthedRoute(async (_request: NextRequest, user) =>
  ok({
    user: {
      id: user.userId,
      email: user.email,
      status: user.status,
    },
  }),
);
