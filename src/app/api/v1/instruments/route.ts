import { NextRequest } from "next/server";

import { getInstrumentsCatalog, InstrumentsServiceError } from "@/server/features/instruments/service";
import { fail, ok } from "@/server/http/response";
import { withAuthedRoute } from "@/server/http/authed-route";

export const GET = withAuthedRoute(
  async (request: NextRequest, user) => {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const limitParam = request.nextUrl.searchParams.get("limit");
    const parsedLimit = limitParam ? Number(limitParam) : undefined;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;

    const payload = await getInstrumentsCatalog(user.userId, {
      q: q || undefined,
      limit,
      assetClass: request.nextUrl.searchParams.get("assetClass") ?? undefined,
      instrumentType: request.nextUrl.searchParams.get("instrumentType") ?? undefined,
      exchange: request.nextUrl.searchParams.get("exchange") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });
    return ok(payload);
  },
  {
    onError: (error: unknown) => {
      if (error instanceof InstrumentsServiceError) {
        return fail(error.code, error.message, error.status);
      }
      return null;
    },
  },
);
