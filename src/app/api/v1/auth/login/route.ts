import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { createSessionToken, AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/server/auth/session";
import { findUserByEmail } from "@/server/auth/user-repository";
import { fail, ok } from "@/server/http/response";

type LoginPayload = {
  email?: string;
  password?: string;
};

class LoginValidationError extends Error {}

function validateLoginPayload(payload: LoginPayload) {
  const email = String(payload.email ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");
  if (!email || !password) {
    throw new LoginValidationError("email and password are required.");
  }
  return { email, password };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginPayload;
    const { email, password } = validateLoginPayload(body);
    const user = await findUserByEmail(email);
    if (!user) {
      return fail("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }
    if (user.status !== "ACTIVE") {
      return fail("USER_DISABLED", "This user is not active.", 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return fail("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    const response = ok({
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    });
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      status: user.status,
    });
    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error: unknown) {
    if (error instanceof LoginValidationError) {
      return fail("LOGIN_FAILED", error.message, 400);
    }

    console.error("[auth/login] Unhandled error:", error);
    return fail("INTERNAL_SERVER_ERROR", "Unable to log in.", 500);
  }
}
