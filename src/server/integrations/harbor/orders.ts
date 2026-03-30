import { harborFetch } from "@/server/integrations/harbor/client";
import { getHarborConfig } from "@/server/integrations/harbor/config";

export type TradeAssetClass = "Equity" | "Crypto" | "Event Contract";
export type TradeSide = "BUY" | "SELL";
export type EventSide = "YES" | "NO";
export type HarborProviderId = "mock" | "harbor";

export type TradeOrderSubmitRequest = {
  userId: string;
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
  status: "accepted" | "rejected" | "pending";
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
      quantity: {
        quantity: string;
      };
    };
  };
};

function mapAssetClassToHarbor(assetClass: TradeAssetClass): HarborAssetClass {
  if (assetClass === "Equity") return "EQUITY";
  if (assetClass === "Crypto") return "CRYPTO";
  throw new Error(`Asset class "${assetClass}" is not supported by Harbor /trading/v1/orders.`);
}

function toQuantity(amountUsd: number, pricePerUnit: number) {
  const quantity = amountUsd / pricePerUnit;
  return quantity.toFixed(8);
}

function toHarborMarketOrderRequest(input: TradeOrderSubmitRequest): HarborCreateMarketOrderRequest {
  return {
    data: {
      accountId: input.accountId,
      assetIdentifierType: "SYMBOL",
      assetIdentifier: input.instrumentSymbol,
      externalId: input.externalId,
      orderType: "MARKET",
      side: input.side,
      assetClass: mapAssetClassToHarbor(input.assetClass),
      amount: {
        quantity: {
          quantity: toQuantity(input.amountUsd, input.pricePerUnit),
        },
      },
    },
  };
}

function normalizeStatus(value: unknown): TradeOrderSubmitResult["status"] {
  if (typeof value !== "string") return "pending";

  const normalized = value.trim().toLowerCase();
  if (normalized === "accepted" || normalized === "submitted" || normalized === "received") return "accepted";
  if (normalized === "rejected" || normalized === "failed" || normalized === "cancelled") return "rejected";
  return "pending";
}

function normalizeHarborOrderResult(
  input: TradeOrderSubmitRequest,
  response: Record<string, unknown>,
): TradeOrderSubmitResult {
  const maybeData =
    response.data && typeof response.data === "object" ? (response.data as Record<string, unknown>) : response;

  const orderIdCandidate =
    maybeData.orderId ?? maybeData.id ?? maybeData.order_id ?? maybeData.executionId ?? maybeData.externalId;
  const statusCandidate = maybeData.status ?? maybeData.orderStatus;
  const submittedAtCandidate =
    maybeData.submittedAt ?? maybeData.createdAt ?? maybeData.updatedAt ?? maybeData.timestamp;
  const providerReferenceCandidate = maybeData.providerReference ?? maybeData.reference ?? maybeData.externalId;

  return {
    provider: "harbor",
    orderId: typeof orderIdCandidate === "string" && orderIdCandidate ? orderIdCandidate : input.externalId ?? "n/a",
    status: normalizeStatus(statusCandidate),
    submittedAt:
      typeof submittedAtCandidate === "string" && submittedAtCandidate
        ? submittedAtCandidate
        : new Date().toISOString(),
    providerReference:
      typeof providerReferenceCandidate === "string" && providerReferenceCandidate
        ? providerReferenceCandidate
        : undefined,
    estimatedUnits: Number((input.amountUsd / input.pricePerUnit).toFixed(8)),
    estimatedMaxReturnUsd:
      input.assetClass === "Event Contract" ? Number((input.amountUsd / input.pricePerUnit).toFixed(2)) : undefined,
  };
}

export async function submitHarborOrder(input: TradeOrderSubmitRequest) {
  const config = getHarborConfig();
  const requestBody = toHarborMarketOrderRequest(input);
  const response = await harborFetch<Record<string, unknown>>(config.ordersPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  return normalizeHarborOrderResult(input, response);
}

export async function fetchHarborOrders(partyId: string) {
  const config = getHarborConfig();
  const encodedPartyId = encodeURIComponent(partyId);
  const path = `${config.partyOrdersPath}/${encodedPartyId}/orders`;
  return harborFetch<HarborOrdersResponse>(path);
}
