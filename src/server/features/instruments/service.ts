import { getHarborProvider } from "@/server/integrations/harbor/provider";
import type { InstrumentsResult } from "@/server/features/instruments/types";
import { listLinkedBrokerAccounts } from "@/server/features/dashboard/repository";
import { toCanonicalAssetClassCode, type CanonicalAssetClassCode } from "@/lib/account-asset-class";

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

type GetInstrumentsCatalogInput = {
  q?: string;
  limit?: number;
  assetClass?: string;
  instrumentType?: string;
  exchange?: string;
  status?: string;
};

type SupportedAssetClass = CanonicalAssetClassCode;

function normalizeLimit(limit?: number) {
  return Math.min(Math.max(limit ?? 10, 10), 250);
}

function normalizeAssetClass(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "EQUITY") return "EQUITY";
  if (normalized === "CRYPTO") return "CRYPTO";
  return normalized;
}

function filterInstruments(
  instruments: InstrumentsResult["instruments"],
  allowedAssetClasses: Set<SupportedAssetClass>,
  input?: GetInstrumentsCatalogInput,
) {
  const query = input?.q?.trim().toLowerCase() ?? "";
  const normalizedAssetClass = input?.assetClass ? normalizeAssetClass(input.assetClass) : "";
  const normalizedExchange = input?.exchange?.trim().toLowerCase() ?? "";
  const normalizedLimit = normalizeLimit(input?.limit);

  return instruments
    .filter((instrument) => {
      if (!allowedAssetClasses.has(instrument.assetClass as SupportedAssetClass)) {
        return false;
      }

      if (query) {
        const matchesQuery =
          instrument.symbol.toLowerCase().includes(query) ||
          instrument.name.toLowerCase().includes(query) ||
          instrument.feedSymbol?.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      if (normalizedAssetClass && instrument.assetClass !== normalizedAssetClass) {
        return false;
      }

      if (normalizedExchange && instrument.exchange.toLowerCase() !== normalizedExchange) {
        return false;
      }

      return true;
    })
    .slice(0, normalizedLimit);
}

function accountTypeToAssetClass(accountType: string): SupportedAssetClass | null {
  return toCanonicalAssetClassCode(accountType);
}

async function resolveAllowedAssetClasses(userId: string): Promise<Set<SupportedAssetClass>> {
  const linkedAccounts = await listLinkedBrokerAccounts(userId);
  const allowed = new Set<SupportedAssetClass>();

  for (const account of linkedAccounts) {
    const assetClass = accountTypeToAssetClass(account.accountType);
    if (assetClass) {
      allowed.add(assetClass);
    }
  }

  return allowed;
}

export async function getInstrumentsCatalog(userId: string, input?: GetInstrumentsCatalogInput): Promise<InstrumentsResult> {
  const harborProvider = getHarborProvider();

  try {
    const [response, allowedAssetClasses] = await Promise.all([
      harborProvider.fetchInstruments(),
      resolveAllowedAssetClasses(userId),
    ]);
    const filteredInstruments =
      allowedAssetClasses.size === 0 ? [] : filterInstruments(response.instruments, allowedAssetClasses, input);

    return {
      instruments: filteredInstruments,
      meta: {
        count: filteredInstruments.length,
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
