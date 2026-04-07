import { getHarborProvider } from "@/server/integrations/harbor/provider";
import { OrdersListResult, SubmitOrderInput, SubmitOrderResult } from "@/server/features/orders/types";
import { appendOrderForUser, listBrokerAccountsByUserId, listOrdersByUserId } from "@/server/storage/keyv-store";

type OrdersErrorCode =
  | "INVALID_ORDER_INPUT"
  | "TRADES_SUBMIT_FAILED"
  | "ORDERS_FETCH_FAILED"
  | "SERVER_CONFIG_ERROR";

export class OrdersServiceError extends Error {
  code: OrdersErrorCode;
  status: number;

  constructor(code: OrdersErrorCode, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function isValidUuid(value: string) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value);
}

function validateSubmitOrderInput(input: SubmitOrderInput) {
  if (!input.userId || !isValidUuid(input.userId)) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "Invalid userId format. Expected UUID.", 400);
  }

  if (!input.instrumentSymbol) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "instrumentSymbol is required.", 400);
  }

  if (input.side !== "BUY" && input.side !== "SELL") {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "side must be BUY or SELL.", 400);
  }

  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "amountUsd must be a positive number.", 400);
  }

  if (!Number.isFinite(input.pricePerUnit) || input.pricePerUnit <= 0) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "pricePerUnit must be a positive number.", 400);
  }

  if (input.assetClass === "Event Contract" && !input.eventSide) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "eventSide is required for Event Contract orders.", 400);
  }

  if (input.assetClass !== "Event Contract" && input.eventSide) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "eventSide is only valid for Event Contract orders.", 400);
  }
}

function validateUserId(userId: string) {
  if (!userId || !isValidUuid(userId)) {
    throw new OrdersServiceError("INVALID_ORDER_INPUT", "Invalid userId format. Expected UUID.", 400);
  }
}

function normalizeAccountType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function accountTypeForAssetClass(assetClass: SubmitOrderInput["assetClass"]) {
  if (assetClass === "Equity") return "equity";
  if (assetClass === "Crypto") return "crypto";
  return "event-contract";
}

async function resolveAccountIdForOrder(userId: string, assetClass: SubmitOrderInput["assetClass"]) {
  const requiredAccountType = accountTypeForAssetClass(assetClass);
  const linkedAccounts = await listBrokerAccountsByUserId(userId);
  const matchingAccount = linkedAccounts.find(
    (account) => normalizeAccountType(account.accountType) === requiredAccountType,
  );

  if (!matchingAccount) {
    throw new OrdersServiceError(
      "INVALID_ORDER_INPUT",
      `No linked account found for asset class "${assetClass}". Expected account type "${requiredAccountType}".`,
      400,
    );
  }

  return matchingAccount.externalAccountId;
}

export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  validateSubmitOrderInput(input);

  const harborProvider = getHarborProvider();
  const accountId = await resolveAccountIdForOrder(input.userId, input.assetClass);
  const externalId = `app-order-${Date.now()}`;
  let orderResult: Awaited<ReturnType<typeof harborProvider.submitOrder>>;

  try {
    orderResult = await harborProvider.submitOrder({
      userId: input.userId,
      accountId,
      instrumentSymbol: input.instrumentSymbol,
      assetClass: input.assetClass,
      side: input.side,
      amountUsd: input.amountUsd,
      pricePerUnit: input.pricePerUnit,
      eventSide: input.eventSide,
      externalId,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected trades integration error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new OrdersServiceError("SERVER_CONFIG_ERROR", message, 500);
    }

    throw new OrdersServiceError("TRADES_SUBMIT_FAILED", message, 502);
  }

  try {
    await appendOrderForUser({
      userId: input.userId,
      accountId,
      provider: orderResult.provider,
      orderId: orderResult.orderId,
      status: orderResult.status,
      submittedAt: orderResult.submittedAt,
      instrumentSymbol: input.instrumentSymbol,
      assetClass: input.assetClass,
      side: input.side,
      amountUsd: input.amountUsd,
      pricePerUnit: input.pricePerUnit,
      eventSide: input.eventSide,
      estimatedUnits: orderResult.estimatedUnits,
      estimatedMaxReturnUsd: orderResult.estimatedMaxReturnUsd,
      providerReference: orderResult.providerReference,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to persist order.";
    throw new OrdersServiceError("SERVER_CONFIG_ERROR", message, 500);
  }

  return {
    order: {
      orderId: orderResult.orderId,
      status: orderResult.status,
      submittedAt: orderResult.submittedAt,
      instrumentSymbol: input.instrumentSymbol,
      assetClass: input.assetClass,
      side: input.side,
      amountUsd: input.amountUsd,
      pricePerUnit: input.pricePerUnit,
      eventSide: input.eventSide,
      estimatedUnits: orderResult.estimatedUnits,
      estimatedMaxReturnUsd: orderResult.estimatedMaxReturnUsd,
      providerReference: orderResult.providerReference,
    },
    meta: {
      provider: orderResult.provider,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function getOrders(userId: string): Promise<OrdersListResult> {
  validateUserId(userId);

  try {
    const orders = await listOrdersByUserId(userId);

    return {
      orders,
      meta: {
        userId,
        count: orders.length,
        provider: "mock",
        source: "kv-store",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    if (error instanceof OrdersServiceError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unexpected orders fetch error.";
    if (message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")) {
      throw new OrdersServiceError("SERVER_CONFIG_ERROR", message, 500);
    }

    throw new OrdersServiceError("ORDERS_FETCH_FAILED", message, 502);
  }
}
