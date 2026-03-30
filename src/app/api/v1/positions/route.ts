import { NextRequest } from "next/server";

import { getPositions, PositionsServiceError } from "@/server/features/positions/service";
import { fail, ok } from "@/server/http/response";

function parseUserId(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") ?? "";

  if (!userId) {
    throw new PositionsServiceError(
      "SERVER_CONFIG_ERROR",
      "Missing userId. Provide ?userId=<uuid>.",
      400,
    );
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(userId)) {
    throw new PositionsServiceError("SERVER_CONFIG_ERROR", "Invalid userId format. Expected UUID.", 400);
  }

  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = parseUserId(request);
    const payload = await getPositions(userId);
    return ok(payload);
  } catch (error: unknown) {
    if (error instanceof PositionsServiceError) {
      return fail(error.code, error.message, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
}
