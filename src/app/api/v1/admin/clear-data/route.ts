import { withAuthedRoute } from "@/server/http/authed-route";
import { fail, ok } from "@/server/http/response";
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/server/auth/session";
import { clearInMemoryStores, getStorageMode } from "@/server/storage/storage-mode";

export const POST = withAuthedRoute(
  async () => {
    if (getStorageMode() !== "memory") {
      return fail("NOT_AVAILABLE", "Clear data is only available in memory mode.", 400);
    }

    clearInMemoryStores();

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
