import { randomUUID } from "node:crypto";

import { emitApiLog } from "@/server/api-log/event-bus";
import { getHarborAccessToken } from "@/server/integrations/harbor/auth";
import { getHarborConfig } from "@/server/integrations/harbor/config";

function parseRequestBody(init?: RequestInit): unknown {
  if (!init?.body) return undefined;
  if (typeof init.body === "string") {
    try {
      return JSON.parse(init.body);
    } catch {
      return init.body;
    }
  }
  return undefined;
}

export async function harborFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getHarborConfig();
  const token = await getHarborAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, config.requestTimeoutMs);

  const resolvedPath = path.startsWith("/") ? path : `/${path}`;
  const method = ((init?.method as string) ?? "GET").toUpperCase();
  const requestBody = parseRequestBody(init);
  const start = performance.now();

  try {
    const response = await fetch(`${config.baseUrl}${resolvedPath}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `${token.tokenType} ${token.accessToken}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const cloned = response.clone();
    let responseBody: unknown;
    try {
      responseBody = await cloned.json();
    } catch {
      responseBody = undefined;
    }

    const durationMs = Math.round(performance.now() - start);

    emitApiLog({
      id: randomUUID(),
      timestamp: Date.now(),
      method: method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
      path: resolvedPath,
      status: response.status,
      durationMs,
      requestBody,
      responseBody,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Harbor API request failed with ${response.status}: ${body}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
