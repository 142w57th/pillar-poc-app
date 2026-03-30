import { getHarborProvider } from "@/server/integrations/harbor/provider";
import { InstrumentsResult } from "@/server/features/instruments/types";

type InstrumentsErrorCode = "INSTRUMENTS_FETCH_FAILED" | "SERVER_CONFIG_ERROR";

export class InstrumentsServiceError extends Error {
  code: InstrumentsErrorCode;
  status: number;

  constructor(code: InstrumentsErrorCode, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function getInstrumentsCatalog(): Promise<InstrumentsResult> {
  const harborProvider = getHarborProvider();

  try {
    const response = await harborProvider.fetchInstruments();

    return {
      instruments: response.instruments,
      meta: {
        count: response.instruments.length,
        provider: "harbor",
        source: response.meta.source,
        generatedAt: response.meta.generatedAt,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected instruments integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new InstrumentsServiceError("SERVER_CONFIG_ERROR", message, 500);
    }

    throw new InstrumentsServiceError("INSTRUMENTS_FETCH_FAILED", message, 502);
  }
}
