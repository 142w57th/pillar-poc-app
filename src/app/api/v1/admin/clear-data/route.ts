import { NextRequest } from "next/server";

import { withAuthedRoute } from "@/server/http/authed-route";
import { fail, ok } from "@/server/http/response";
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/server/auth/session";
import { getStorageMode } from "@/server/storage/storage-mode";
import { clearUserData } from "@/server/storage/keyv-store";

export const POST = withAuthedRoute(
  async (_request: NextRequest, user) => {
    if (getStorageMode() !== "memory") {
      return fail("NOT_AVAILABLE", "Clear data is only available in memory mode.", 400);
    }

    await clearUserData(user.userId);

    const response = ok({ cleared: true });
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      ...getSessionCookieOptions(),
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  },
  { logLabel: "admin/clear-data" },
);
