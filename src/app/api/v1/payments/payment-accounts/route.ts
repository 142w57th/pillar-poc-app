import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";
import {
  createPaymentAccount,
  getPaymentAccounts,
  PaymentsServiceError,
} from "@/server/features/payments/service";
import type { CreatePaymentAccountInput } from "@/server/features/payments/types";
import { getCurrentClient } from "@/server/storage/keyv-store";

function readRequiredString(payload: Record<string, unknown>, key: string) {
  const value = String(payload[key] ?? "").trim();
  if (!value) {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", `${key} is required.`, 400);
  }
  return value;
}

function parseCreatePaymentAccountPayload(body: unknown, clientId: string): CreatePaymentAccountInput {
  if (!body || typeof body !== "object") {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "Request body must be a JSON object.", 400);
  }

  const payload = body as Record<string, unknown>;
  if (!payload.data || typeof payload.data !== "object") {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "data must be a JSON object.", 400);
  }

  const data = (payload.data ?? {}) as Record<string, unknown>;
  if (!data.details || typeof data.details !== "object") {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "data.details must be a JSON object.", 400);
  }

  const details = (data.details ?? {}) as Record<string, unknown>;
  const detailType = String(details.type ?? "").toUpperCase();
  if (detailType !== "BANK_ACCOUNT") {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "details.type must be BANK_ACCOUNT.", 400);
  }
  const bankName = String(details.bankName ?? "").trim();

  return {
    data: {
      clientId,
      currency: readRequiredString(data, "currency").toUpperCase(),
      country: readRequiredString(data, "country").toUpperCase(),
      maskedIdentifier: data.maskedIdentifier !== undefined ? String(data.maskedIdentifier) : undefined,
      nickname: data.nickname !== undefined ? String(data.nickname) : undefined,
      externalId: data.externalId !== undefined ? String(data.externalId) : undefined,
      metadata: data.metadata && typeof data.metadata === "object" ? (data.metadata as Record<string, unknown>) : undefined,
      details: {
        type: "BANK_ACCOUNT",
        bankName: bankName || undefined,
      },
    },
  };
}

function parseGetPaymentAccountsQuery(request: NextRequest) {
  const typeRaw = request.nextUrl.searchParams.get("type");
  const type = typeRaw ? typeRaw.toUpperCase() : undefined;

  if (type && type !== "BANK_ACCOUNT") {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "type must be BANK_ACCOUNT when provided.", 400);
  }

  return { type: type as "BANK_ACCOUNT" | undefined } as const;
}

export const GET = withAuthedRoute(
  async (request: NextRequest, user) => {
    const client = await getCurrentClient(user.userId);
    if (!client) {
      throw new PaymentsServiceError("NO_LINKED_ACCOUNTS", "No linked client found. Complete onboarding first.", 404);
    }
    const query = parseGetPaymentAccountsQuery(request);
    const payload = await getPaymentAccounts({ clientId: client.id, type: query.type });
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof PaymentsServiceError) {
        console.error(`[payment-accounts] ${error.code} (${error.status}): ${error.message}`);
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
    logLabel: "payment-accounts GET",
  },
);

export const POST = withAuthedRoute(
  async (request: NextRequest, user) => {
    const body = (await request.json()) as unknown;
    const client = await getCurrentClient(user.userId);
    if (!client) {
      throw new PaymentsServiceError("NO_LINKED_ACCOUNTS", "No linked client found. Complete onboarding first.", 404);
    }
    const input = parseCreatePaymentAccountPayload(body, client.id);
    const payload = await createPaymentAccount(input);
    return ok(payload, 201);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof PaymentsServiceError) {
        console.error(`[payment-accounts] ${error.code} (${error.status}): ${error.message}`);
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
    logLabel: "payment-accounts POST",
  },
);
