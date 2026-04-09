import { DashboardServiceError, getDashboardAccountBalances } from "@/server/features/dashboard/service";
import { fail, ok } from "@/server/http/response";

export async function GET() {
  try {
    const payload = await getDashboardAccountBalances();
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof DashboardServiceError) {
      console.error(`[dashboard/accounts] ${error.code} (${error.status}): ${error.message}`);
      return fail(error.code, error.message, error.status);
    }

    console.error("[dashboard/accounts] Unhandled error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
