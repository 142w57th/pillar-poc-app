import { getHarborProvider } from "@/server/integrations/harbor/provider";
import { QuoteResult } from "@/server/features/quotes/types";

type QuotesErrorCode = "QUOTE_NOT_FOUND" | "QUOTES_FETCH_FAILED" | "SERVER_CONFIG_ERROR";

export class QuotesServiceError extends Error {
  code: QuotesErrorCode;
  status: number;

  constructor(code: QuotesErrorCode, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function getQuote(symbol: string): Promise<QuoteResult> {
  if (!symbol) {
    throw new QuotesServiceError("QUOTE_NOT_FOUND", "Symbol is required.", 400);
  }

  const harborProvider = getHarborProvider();

  try {
    const response = await harborProvider.fetchQuote(symbol);

    return {
      quote: response.quote,
      meta: {
        provider: "harbor",
        source: response.meta.source,
        generatedAt: response.meta.generatedAt,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected quotes integration error.";

    if (message.toLowerCase().includes("not found")) {
      throw new QuotesServiceError("QUOTE_NOT_FOUND", message, 404);
    }

    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new QuotesServiceError("SERVER_CONFIG_ERROR", message, 500);
    }

    throw new QuotesServiceError("QUOTES_FETCH_FAILED", message, 502);
  }
}
