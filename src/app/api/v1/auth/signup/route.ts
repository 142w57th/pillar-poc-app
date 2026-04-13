import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { createSessionToken, AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/server/auth/session";
import { createUser, findUserByEmail } from "@/server/auth/user-repository";
import { fail, ok } from "@/server/http/response";

type SignupPayload = {
  email?: string;
  password?: string;
};

class SignupValidationError extends Error {}

function validateSignupPayload(payload: SignupPayload) {
  const email = String(payload.email ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");
  if (!email || !email.includes("@")) {
    throw new SignupValidationError("A valid email is required.");
  }
  if (password.length < 8) {
    throw new SignupValidationError("Password must be at least 8 characters.");
  }
  return { email, password };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupPayload;
    const { email, password } = validateSignupPayload(body);
    const existing = await findUserByEmail(email);
    if (existing) {
      return fail("EMAIL_ALREADY_EXISTS", "An account with this email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ email, passwordHash, status: "ACTIVE" });

    const response = ok({
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    }, 201);
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      status: user.status,
    });
    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error: unknown) {
    if (error instanceof SignupValidationError) {
      return fail("SIGNUP_FAILED", error.message, 400);
    }

    console.error("[auth/signup] Unhandled error:", error);
    return fail("INTERNAL_SERVER_ERROR", "Unable to sign up.", 500);
  }
}
