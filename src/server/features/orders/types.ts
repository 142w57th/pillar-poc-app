import type { TradeAssetClass, TradeSide, EventSide, HarborProviderId } from "@/server/integrations/harbor/orders";

export type SubmitOrderInput = {
  userId: string;
  instrumentSymbol: string;
  assetClass: TradeAssetClass;
  side: TradeSide;
  amountUsd: number;
  pricePerUnit: number;
  eventSide?: EventSide;
};

export type SubmitOrderResult = {
  order: {
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
  meta: {
    provider: HarborProviderId;
    generatedAt: string;
  };
};

export type OrdersListResult = {
  orders: Array<{
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
  }>;
  meta: {
    userId: string;
    count: number;
    provider: HarborProviderId;
    source: string;
    generatedAt: string;
  };
};
