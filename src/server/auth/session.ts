import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), "src/server/.env"), override: false });

export const AUTH_COOKIE_NAME = "pillar_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
let authSecret: string | null = null;
let secureCookieSetting: boolean | null = null;

type SessionPayload = {
  userId: string;
  sessionId: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  exp: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAuthSecret() {
  if (!authSecret) {
    const secret = process.env.APP_AUTH_SECRET?.trim();
    if (!secret) {
      throw new Error("APP_AUTH_SECRET is required for login sessions.");
    }
    authSecret = secret;
  }
  return authSecret;
}

function shouldUseSecureCookies() {
  if (secureCookieSetting === null) {
    secureCookieSetting = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase() === "true";
  }
  return secureCookieSetting;
}

function signPayload(serializedPayload: string) {
  return createHmac("sha256", getAuthSecret()).update(serializedPayload).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp" | "sessionId"> & { sessionId?: string }) {
  const fullPayload: SessionPayload = {
    ...payload,
    sessionId: payload.sessionId ?? randomUUID(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const serializedPayload = JSON.stringify(fullPayload);
  const encodedPayload = toBase64Url(serializedPayload);
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseSessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const sigBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;
    if (!parsed.userId || !parsed.email || !parsed.status || !parsed.exp) {
      return null;
    }
    if (!parsed.sessionId) {
      parsed.sessionId = parsed.userId;
    }
    if (parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
