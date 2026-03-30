import { NextRequest } from "next/server";

import { getOrders, submitOrder, OrdersServiceError } from "@/server/features/orders/service";
import type { SubmitOrderInput } from "@/server/features/orders/types";
import { fail, ok } from "@/server/http/response";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

function parseSubmitOrderPayload(body: unknown): SubmitOrderInput {
  if (!body || typeof body !== "object") {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "Request body must be a JSON object.", 400);
  }

  const payload = body as Record<string, unknown>;

  return {
    userId: String(payload.userId ?? ""),
    instrumentSymbol: String(payload.instrumentSymbol ?? ""),
    assetClass: payload.assetClass as SubmitOrderInput["assetClass"],
    side: payload.side as SubmitOrderInput["side"],
    amountUsd: toNumber(payload.amountUsd),
    pricePerUnit: toNumber(payload.pricePerUnit),
    eventSide: payload.eventSide as SubmitOrderInput["eventSide"],
  };
}

function parseUserId(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") ?? request.headers.get("x-user-id") ?? "";
  if (!userId) {
    throw new OrdersServiceError(
      "INVALID_ORDER_INPUT",
      "Missing userId. Provide ?userId=<uuid> or x-user-id header.",
      400,
    );
  }

  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = parseUserId(request);
    const payload = await getOrders(userId);
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof OrdersServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const input = parseSubmitOrderPayload(body);
    const payload = await submitOrder(input);
    return ok(payload, 201);
  } catch (error: unknown) {
    if (error instanceof OrdersServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
