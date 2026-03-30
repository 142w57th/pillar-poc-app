import { fail, ok } from "@/server/http/response";
import {
  getPaymentInstructions,
  PaymentsServiceError,
} from "@/server/features/payments/service";

export async function GET() {
  try {
    const payload = await getPaymentInstructions();
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof PaymentsServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
