import { NextRequest } from "next/server";

import { getOrders, submitOrder, OrdersServiceError } from "@/server/features/orders/service";
import type { SubmitOrderInput } from "@/server/features/orders/types";
import { withAuthedRoute } from "@/server/http/authed-route";
import { parseEnumValue, toFiniteNumber } from "@/server/http/parsers";
import { fail, ok } from "@/server/http/response";

function parseSubmitOrderPayload(body: unknown): SubmitOrderInput {
  if (!body || typeof body !== "object") {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "Request body must be a JSON object.", 400);
  }

  const payload = body as Record<string, unknown>;
  const assetClass = parseEnumValue(payload.assetClass, ["Equity", "Crypto"] as const);
  if (!assetClass) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "assetClass must be Equity or Crypto.", 400);
  }

  const side = parseEnumValue(payload.side, ["BUY", "SELL"] as const);
  if (!side) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "side must be BUY or SELL.", 400);
  }

  const eventSide = parseEnumValue(payload.eventSide, ["YES", "NO"] as const);
  if (payload.eventSide !== undefined && !eventSide) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "eventSide must be YES or NO when provided.", 400);
  }

  return {
    instrumentSymbol: String(payload.instrumentSymbol ?? ""),
    assetClass,
    side,
    amountUsd: toFiniteNumber(payload.amountUsd),
    pricePerUnit: toFiniteNumber(payload.pricePerUnit),
    eventSide,
  };
}

export const GET = withAuthedRoute(
  async (_request: NextRequest, user) => {
    const payload = await getOrders(user.userId);
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof OrdersServiceError) {
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
  },
);

export const POST = withAuthedRoute(
  async (request: NextRequest, user) => {
    const body = (await request.json()) as unknown;
    const input = parseSubmitOrderPayload(body);
    const payload = await submitOrder(user.userId, input);
    return ok(payload, 201);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof OrdersServiceError) {
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
  },
);
