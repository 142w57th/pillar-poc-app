import { NextRequest } from "next/server";

import { fail, ok } from "@/server/http/response";
import {
  getDestinationAccounts,
  PaymentsServiceError,
} from "@/server/features/payments/service";

export async function GET(request: NextRequest) {
  void request;
  try {
    const payload = await getDestinationAccounts();
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof PaymentsServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
