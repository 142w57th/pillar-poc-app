import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

export type TradeAssetClass = "Equity" | "Crypto"
export type TradeSide = "BUY" | "SELL";
export type EventSide = "YES" | "NO";
export type HarborProviderId = "mock" | "harbor";

export type TradeOrderSubmitRequest = {
  clientId: string;
  accountId: string;
  instrumentSymbol: string;
  assetClass: TradeAssetClass;
  side: TradeSide;
  amountUsd: number;
  pricePerUnit: number;
  eventSide?: EventSide;
  externalId?: string;
};

export type TradeOrderSubmitResult = {
  provider: HarborProviderId;
  orderId: string;
  status: "ACCEPTED" | "REJECTED" | "PENDING";
  submittedAt: string;
  providerReference?: string;
  estimatedUnits?: number;
  estimatedMaxReturnUsd?: number;
};

export type HarborOrderSnapshot = {
  accountId: string;
  provider: HarborProviderId;
  orderId: string;
  status: "accepted" | "rejected" | "pending";
  submittedAt: string;
  instrumentSymbol: string;
  assetClass: TradeAssetClass;
  side: TradeSide;
  amountUsd: number;
  pricePerUnit: number;
  eventSide?: EventSide;
  estimatedUnits?: number;
  estimatedMaxReturnUsd?: number;
  providerReference?: string;
};

export type HarborOrdersResponse = {
  orders: HarborOrderSnapshot[];
  meta: {
    source: string;
    generatedAt: string;
  };
};

export type HarborFetchOrdersInput = {
  accountId: string;
  from: string;
  to: string;
  assetClass?: "EQUITY" | "OPTION" | "FIXED_INCOME" | "MUTUAL_FUND" | "CRYPTO" | "FUTURE" | "FOREX";
  status?: "NEW" | "PENDING" | "PARTIALLY_FILLED" | "FILLED" | "EXPIRED" | "REJECTED" | "PENDING_CANCEL" | "CANCELED";
  page?: number;
  limit?: number;
};

type HarborOrderHistoryRecord = {
  orderId: string;
  externalId?: string | null;
  status?: string;
  accountId: string;
  assetIdentifier?: string;
  assetClass?: string;
  side?: TradeSide;
  notionalAmount?: string | null;
  quantity?: string | null;
  limitPrice?: string | null;
  filledAveragePrice?: string | null;
  fillGrossAmount?: string | null;
  enteredAt?: string;
  updatedAt?: string;
};

type HarborOrderHistoryApiResponse = {
  data?: {
    orders?: HarborOrderHistoryRecord[];
  };
  meta?: Record<string, unknown>;
};

type HarborAssetClass = "EQUITY" | "CRYPTO";

type HarborCreateMarketOrderRequest = {
  data: {
    accountId: string;
    assetIdentifierType: "SYMBOL";
    assetIdentifier: string;
    externalId?: string;
    orderType: "MARKET";
    side: TradeSide;
    assetClass: HarborAssetClass;
    amount: {
      notionalAmount: string;
    };
  };
  meta: Record<string, never>;
};

function mapAssetClassToHarbor(assetClass: TradeAssetClass): HarborAssetClass {
  if (assetClass === "Equity") return "EQUITY";
  if (assetClass === "Crypto") return "CRYPTO";
  throw new Error(
    `Asset class "${assetClass}" is not supported by Harbor /trading/v1/orders.`,
  );
}

function toNotionalAmount(amountUsd: number) {
  return amountUsd.toFixed(2);
}

function toAssetIdentifier(input: TradeOrderSubmitRequest) {
  if (input.assetClass === "Crypto") {
    return input.instrumentSymbol.replace(/\//g, "-").toUpperCase();
  }
  return input.instrumentSymbol.toUpperCase();
}

function toHarborMarketOrderRequest(
  input: TradeOrderSubmitRequest,
): HarborCreateMarketOrderRequest {
  return {
    data: {
      accountId: input.accountId,
      assetIdentifierType: "SYMBOL",
      assetIdentifier: toAssetIdentifier(input),
      externalId: input.externalId,
      orderType: "MARKET",
      side: input.side,
      assetClass: mapAssetClassToHarbor(input.assetClass),
      amount: {
        notionalAmount: toNotionalAmount(input.amountUsd),
      },
    },
    meta: {},
  };
}

function normalizeStatus(value: unknown): TradeOrderSubmitResult["status"] {
  if (typeof value !== "string") return "PENDING";

  const normalized = value.trim().toUpperCase();
  if (
    normalized === "FILLED" ||
    normalized === "ACCEPTED" ||
    normalized === "SUBMITTED" ||
    normalized === "RECEIVED"
  ) {
    return "ACCEPTED";
  }
  if (
    normalized === "REJECTED" ||
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "CANCELED" ||
    normalized === "EXPIRED"
  ) {
    return "REJECTED";
  } 
  return "PENDING";
}

function normalizeHistoryStatus(value: unknown): HarborOrderSnapshot["status"] {
  if (typeof value !== "string") return "pending";
  const normalized = value.trim().toUpperCase();
  if (normalized === "REJECTED" || normalized === "EXPIRED" || normalized === "CANCELED") return "rejected";
  if (normalized === "NEW" || normalized === "PENDING" || normalized === "PARTIALLY_FILLED") return "pending";
  return "accepted";
}

function parseOrderAmountUsd(record: HarborOrderHistoryRecord) {
  if (typeof record.notionalAmount === "string") {
    const parsed = Number(record.notionalAmount);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof record.fillGrossAmount === "string") {
    const parsed = Number(record.fillGrossAmount);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseOrderPrice(record: HarborOrderHistoryRecord) {
  const candidates = [record.filledAveragePrice, record.limitPrice];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function mapHistoryAssetClass(value: string | undefined): TradeAssetClass | null {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "EQUITY") return "Equity";
  if (normalized === "CRYPTO") return "Crypto";
  return null;
}

function normalizeHarborOrderResult(
  input: TradeOrderSubmitRequest,
  response: Record<string, unknown>,
): TradeOrderSubmitResult {
  const maybeData =
    response.data && typeof response.data === "object"
      ? (response.data as Record<string, unknown>)
      : response;

  const orderIdCandidate =
    maybeData.orderId ??
    maybeData.id ??
    maybeData.order_id ??
    maybeData.executionId ??
    maybeData.externalId;
  const statusCandidate = maybeData.status ?? maybeData.orderStatus;
  const submittedAtCandidate =
    maybeData.submittedAt ??
    maybeData.createdAt ??
    maybeData.updatedAt ??
    maybeData.timestamp;
  const providerReferenceCandidate =
    maybeData.providerReference ?? maybeData.reference ?? maybeData.externalId;

  return {
    provider: "harbor",
    orderId:
      typeof orderIdCandidate === "string" && orderIdCandidate
        ? orderIdCandidate
        : (input.externalId ?? "n/a"),
    status: normalizeStatus(statusCandidate),
    submittedAt:
      typeof submittedAtCandidate === "string" && submittedAtCandidate
        ? submittedAtCandidate
        : new Date().toISOString(),
    providerReference:
      typeof providerReferenceCandidate === "string" &&
      providerReferenceCandidate
        ? providerReferenceCandidate
        : undefined,
    estimatedUnits: Number((input.amountUsd / input.pricePerUnit).toFixed(8)),
  };
}

export async function submitHarborOrder(input: TradeOrderSubmitRequest) {
  const config = getHarborConfig();
  const requestBody = toHarborMarketOrderRequest(input);
  const response = await harborFetch<Record<string, unknown>>(
    config.ordersPath,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  return normalizeHarborOrderResult(input, response);
}

export async function fetchHarborOrders(partyId: string) {
  void partyId;
  throw new Error("Deprecated signature. Use fetchHarborOrdersByAccount instead.");
}

export async function fetchHarborOrdersByAccount(input: HarborFetchOrdersInput): Promise<HarborOrdersResponse> {
  const config = getHarborConfig();
  const params = new URLSearchParams();
  params.set("accountId", input.accountId);
  params.set("from", input.from);
  params.set("to", input.to);
  if (input.assetClass) params.set("assetClass", input.assetClass);
  if (input.status) params.set("status", input.status);
  params.set("page", String(input.page ?? 1));
  params.set("limit", String(input.limit ?? 25));

  const path = `${config.ordersPath}?${params.toString()}`;
  const response = await harborFetch<HarborOrderHistoryApiResponse>(path);
  const sourceOrders = response.data?.orders ?? [];

  const orders = sourceOrders
    .map((record): HarborOrderSnapshot | null => {
      const assetClass = mapHistoryAssetClass(record.assetClass);
      if (!assetClass) return null;

      return {
        accountId: record.accountId,
        provider: "harbor",
        orderId: record.orderId,
        status: normalizeHistoryStatus(record.status),
        submittedAt: record.enteredAt ?? record.updatedAt ?? new Date().toISOString(),
        instrumentSymbol: record.assetIdentifier ?? "UNKNOWN",
        assetClass,
        side: record.side ?? "BUY",
        amountUsd: parseOrderAmountUsd(record),
        pricePerUnit: parseOrderPrice(record),
        providerReference: record.externalId ?? undefined,
      };
    })
    .filter((order): order is HarborOrderSnapshot => order !== null);

  return {
    orders,
    meta: {
      source: "harbor-orders-api",
      generatedAt: new Date().toISOString(),
    },
  };
}
