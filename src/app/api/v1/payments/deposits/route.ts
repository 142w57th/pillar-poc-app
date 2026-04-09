import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import {
  PaymentsServiceError,
  submitDeposit,
} from "@/server/features/payments/service";
import type { SubmitDepositInput } from "@/server/features/payments/types";

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

function parseSubmitDepositPayload(body: unknown): SubmitDepositInput {
  if (!body || typeof body !== "object") {
    throw new PaymentsServiceError("INVALID_DEPOSIT_INPUT", "Request body must be a JSON object.", 400);
  }

  const payload = body as Record<string, unknown>;
  const sourcePaymentAccountIdRaw =
    payload.sourcePaymentAccountId !== undefined ? payload.sourcePaymentAccountId : payload.sourceInstructionId;

  return {
    direction: payload.direction !== undefined ? String(payload.direction).toUpperCase() as "DEPOSIT" | "WITHDRAW" : undefined,
    sourcePaymentAccountId: sourcePaymentAccountIdRaw !== undefined ? String(sourcePaymentAccountIdRaw) : undefined,
    destinationAccountId: String(payload.destinationAccountId ?? ""),
    amountUsd: toNumber(payload.amountUsd),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const input = parseSubmitDepositPayload(body);
    const payload = await submitDeposit(input);
    return ok(payload, 201);
  } catch (error: unknown) {
    if (error instanceof PaymentsServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
