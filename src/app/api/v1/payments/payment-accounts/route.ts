import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import {
  createPaymentAccount,
  getPaymentAccounts,
  PaymentsServiceError,
} from "@/server/features/payments/service";
import type { CreatePaymentAccountInput } from "@/server/features/payments/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BANK_IDENTIFIER_TYPES = new Set(["ABA_ROUTING", "IFSC", "IBAN"] as const);

function readRequiredString(payload: Record<string, unknown>, key: string) {
  const value = String(payload[key] ?? "").trim();
  if (!value) {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", `${key} is required.`, 400);
  }
  return value;
}

function parseCreatePaymentAccountPayload(body: unknown): CreatePaymentAccountInput {
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
  const accountTypeRaw = String(details.accountType ?? "").toUpperCase();
  const bankIdentifierTypeRaw = String(details.bankIdentifierType ?? "ABA_ROUTING").toUpperCase();
  const clientId = readRequiredString(data, "clientId");

  if (!UUID_RE.test(clientId)) {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "clientId must be a valid UUID.", 400);
  }
  if (detailType !== "BANK_ACCOUNT") {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "details.type must be BANK_ACCOUNT.", 400);
  }
  if (accountTypeRaw !== "CHECKING" && accountTypeRaw !== "SAVINGS") {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "accountType must be CHECKING or SAVINGS.", 400);
  }
  if (!BANK_IDENTIFIER_TYPES.has(bankIdentifierTypeRaw as "ABA_ROUTING" | "IFSC" | "IBAN")) {
    throw new PaymentsServiceError(
      "INVALID_PAYMENT_ACCOUNT_INPUT",
      "bankIdentifierType must be ABA_ROUTING, IFSC, or IBAN.",
      400,
    );
  }

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
        accountHolderName: readRequiredString(details, "accountHolderName"),
        accountNumber: readRequiredString(details, "accountNumber"),
        accountType: accountTypeRaw,
        bankName: readRequiredString(details, "bankName"),
        bankAddress: readRequiredString(details, "bankAddress"),
        bankIdentifierType: bankIdentifierTypeRaw as "ABA_ROUTING" | "IFSC" | "IBAN",
        bankIdentifier: readRequiredString(details, "bankIdentifier"),
      },
    },
  };
}

function parseGetPaymentAccountsQuery(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId") ?? "";
  const typeRaw = request.nextUrl.searchParams.get("type");
  const type = typeRaw ? typeRaw.toUpperCase() : undefined;

  if (!clientId) {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "Missing clientId query parameter.", 400);
  }
  if (!UUID_RE.test(clientId)) {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "Invalid clientId format. Expected UUID.", 400);
  }
  if (type && type !== "BANK_ACCOUNT") {
    throw new PaymentsServiceError("INVALID_PAYMENT_ACCOUNT_INPUT", "type must be BANK_ACCOUNT when provided.", 400);
  }

  return { clientId, type: type as "BANK_ACCOUNT" | undefined } as const;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getPaymentAccounts(parseGetPaymentAccountsQuery(request));
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof PaymentsServiceError) {
      console.error(`[payment-accounts] ${error.code} (${error.status}): ${error.message}`);
      return fail(error.code, error.message, error.status);
    }

    console.error("[payment-accounts] Unhandled GET error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const payload = await createPaymentAccount(parseCreatePaymentAccountPayload(body));
    return ok(payload, 201);
  } catch (error: unknown) {
    if (error instanceof PaymentsServiceError) {
      console.error(`[payment-accounts] ${error.code} (${error.status}): ${error.message}`);
      return fail(error.code, error.message, error.status);
    }

    console.error("[payment-accounts] Unhandled POST error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
