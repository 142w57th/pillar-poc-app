import { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, parseSessionToken } from "@/server/auth/session";

export class AuthError extends Error {
  code = "UNAUTHORIZED";
  status = 401;
}

export type RequestUser = {
  userId: string;
  sessionId: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
};

export function requireUser(request: NextRequest): RequestUser {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    throw new AuthError("Authentication required.");
  }

  const session = parseSessionToken(token);
  if (!session) {
    throw new AuthError("Session is missing or expired.");
  }

  if (session.status !== "ACTIVE") {
    throw new AuthError("User account is not active.");
  }

  return {
    userId: session.userId,
    sessionId: session.sessionId,
    email: session.email,
    status: session.status,
  };
}
