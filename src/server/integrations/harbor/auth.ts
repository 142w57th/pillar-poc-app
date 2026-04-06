import { randomUUID } from "node:crypto";

import { emitApiLog } from "@/server/api-log/event-bus";
import { getHarborConfig } from "@/server/integrations/harbor/config";
import { getOAuthToken, upsertOAuthToken } from "@/server/storage/kv-store";

type HarborTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

const PROVIDER = "harbor";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

function tokenIsFresh(expiresAt: Date) {
  return expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS > Date.now();
}

async function getCachedToken() {
  const record = await getOAuthToken(PROVIDER);

  if (!record) {
    return null;
  }

  const expiresAt = new Date(record.expiresAt);

  if (!tokenIsFresh(expiresAt)) {
    return null;
  }

  return {
    accessToken: record.accessToken,
    tokenType: record.tokenType,
  };
}

async function persistToken(token: HarborTokenResponse) {
  const expiresAt = new Date(Date.now() + token.expires_in * 1_000);
  await upsertOAuthToken({
    provider: PROVIDER,
    accessToken: token.access_token,
    tokenType: token.token_type,
    expiresAt: expiresAt.toISOString(),
    scope: token.scope ?? null,
  });
}

function maskToken(token: string): string {
  if (token.length <= 12) return "***";
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

async function requestNewToken() {
  const config = getHarborConfig();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
  });
  if (config.authScope) {
    body.set("scope", config.authScope);
  }
  const basicAuth = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");
  const start = performance.now();
  const authPath = new URL(config.authUrl).pathname;

  const response = await fetch(config.authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    const durationMs = Math.round(performance.now() - start);
    emitApiLog({
      id: randomUUID(),
      timestamp: Date.now(),
      method: "POST",
      path: authPath,
      description: "Authenticate with OAuth 2.0 client credentials",
      status: response.status,
      durationMs,
      requestBody: { grant_type: "client_credentials" },
    });
    throw new Error(`Harbor auth request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as HarborTokenResponse;
  const durationMs = Math.round(performance.now() - start);

  emitApiLog({
    id: randomUUID(),
    timestamp: Date.now(),
    method: "POST",
    path: authPath,
    description: "Authenticate with OAuth 2.0 client credentials",
    status: response.status,
    durationMs,
    requestBody: { grant_type: "client_credentials" },
    responseBody: {
      access_token: maskToken(payload.access_token),
      token_type: payload.token_type,
      expires_in: payload.expires_in,
    },
  });

  if (!payload.access_token || !payload.token_type || !payload.expires_in) {
    throw new Error("Harbor auth response is missing required token fields.");
  }

  await persistToken(payload);
  return payload;
}

export async function getHarborAccessToken() {
  const cached = await getCachedToken();

  if (cached) {
    return cached;
  }

  const fresh = await requestNewToken();
  return {
    accessToken: fresh.access_token,
    tokenType: fresh.token_type,
  };
}
