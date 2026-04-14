import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";
import { parseEnumValue, toFiniteNumber } from "@/server/http/parsers";
import {
  PaymentsServiceError,
  submitDeposit,
} from "@/server/features/payments/service";
import type { SubmitDepositInput } from "@/server/features/payments/types";

function parseSubmitDepositPayload(body: unknown): SubmitDepositInput {
  if (!body || typeof body !== "object") {
    throw new PaymentsServiceError("INVALID_DEPOSIT_INPUT", "Request body must be a JSON object.", 400);
  }

  const payload = body as Record<string, unknown>;
  const sourcePaymentAccountIdRaw =
    payload.sourcePaymentAccountId !== undefined ? payload.sourcePaymentAccountId : payload.sourceInstructionId;
  const direction = parseEnumValue(
    payload.direction !== undefined ? String(payload.direction).toUpperCase() : undefined,
    ["DEPOSIT", "WITHDRAW"] as const,
  );
  if (payload.direction !== undefined && !direction) {
    throw new PaymentsServiceError("INVALID_DEPOSIT_INPUT", "direction must be DEPOSIT or WITHDRAW.", 400);
  }

  return {
    direction,
    sourcePaymentAccountId: sourcePaymentAccountIdRaw !== undefined ? String(sourcePaymentAccountIdRaw) : undefined,
    destinationAccountId: String(payload.destinationAccountId ?? ""),
    amountUsd: toFiniteNumber(payload.amountUsd),
  };
}

export const POST = withAuthedRoute(
  async (request: NextRequest, user) => {
    const body = (await request.json()) as unknown;
    const input = parseSubmitDepositPayload(body);
    const payload = await submitDeposit(user.userId, input);
    return ok(payload, 201);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof PaymentsServiceError) {
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
  },
);
