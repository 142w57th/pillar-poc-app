import { getHarborProvider } from "@/server/integrations/harbor/provider";
import { getPartyIdByUserId } from "@/server/features/dashboard/repository";
import { PositionsResult } from "@/server/features/positions/types";

type PositionsErrorCode = "POSITIONS_FETCH_FAILED" | "SERVER_CONFIG_ERROR";

export class PositionsServiceError extends Error {
  code: PositionsErrorCode;
  status: number;

  constructor(code: PositionsErrorCode, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function getPositions(userId: string): Promise<PositionsResult> {
  const harborProvider = getHarborProvider();

  try {
    const partyId = await getPartyIdByUserId(userId);
    if (!partyId) {
      throw new PositionsServiceError("SERVER_CONFIG_ERROR", `No party id found for user ${userId}.`, 500);
    }
    const response = await harborProvider.fetchPositions(partyId);

    return {
      positions: response.positions,
      meta: {
        count: response.positions.length,
        provider: "harbor",
        source: response.meta.source,
        generatedAt: response.meta.generatedAt,
      },
    };
  } catch (error: unknown) {
    if (error instanceof PositionsServiceError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unexpected positions integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new PositionsServiceError("SERVER_CONFIG_ERROR", message, 500);
    }

    throw new PositionsServiceError("POSITIONS_FETCH_FAILED", message, 502);
  }
}
