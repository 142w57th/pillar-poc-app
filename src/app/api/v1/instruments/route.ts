import { getInstrumentsCatalog, InstrumentsServiceError } from "@/server/features/instruments/service";
import { fail, ok } from "@/server/http/response";

export async function GET() {
  try {
    const payload = await getInstrumentsCatalog();
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof InstrumentsServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
