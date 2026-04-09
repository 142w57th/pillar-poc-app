import { fail, ok } from "@/server/http/response";
import { DashboardServiceError, getDashboardSnapshot } from "@/server/features/dashboard/service";

export async function GET() {
  try {
    const payload = await getDashboardSnapshot();
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof DashboardServiceError) {
      console.error(`[dashboard] ${error.code} (${error.status}): ${error.message}`);
      return fail(error.code, error.message, error.status);
    }

    console.error("[dashboard] Unhandled error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
