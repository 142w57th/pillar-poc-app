import { NextRequest } from "next/server";

import { clearApiLogBufferByIdentity } from "@/server/api-log/event-bus";
import { AUTH_COOKIE_NAME, getSessionCookieOptions, parseSessionToken } from "@/server/auth/session";
import { ok } from "@/server/http/response";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? parseSessionToken(token) : null;
  if (session?.userId && session.sessionId) {
    clearApiLogBufferByIdentity(session.userId, session.sessionId);
  }

  const response = ok({ loggedOut: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
