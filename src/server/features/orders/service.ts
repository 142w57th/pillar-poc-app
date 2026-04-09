import { getHarborProvider } from "@/server/integrations/harbor/provider";
import { OrdersListResult, SubmitOrderInput, SubmitOrderResult } from "@/server/features/orders/types";
import {
  getCurrentClient,
  listBrokerAccountsByClientId,
} from "@/server/storage/keyv-store";
import { toCanonicalAssetClassCode } from "@/lib/account-asset-class";

type OrdersErrorCode =
  | "INVALID_ORDER_INPUT"
  | "NO_LINKED_ACCOUNTS"
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

function validateSubmitOrderInput(input: SubmitOrderInput) {
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
}

async function resolveCurrentClientOrThrow() {
  const client = await getCurrentClient();
  if (!client) {
    throw new OrdersServiceError("NO_LINKED_ACCOUNTS", "No linked client found. Complete onboarding first.", 404);
  }
  return client;
}

async function resolveAccountIdForOrder(clientId: string, assetClass: SubmitOrderInput["assetClass"]) {
  const linkedAccounts = await listBrokerAccountsByClientId(clientId);
  if (linkedAccounts.length === 0) {
    throw new OrdersServiceError("NO_LINKED_ACCOUNTS", "No linked broker account found. Complete onboarding first.", 404);
  }

  const normalizedAssetClass = toCanonicalAssetClassCode(assetClass);
  const matchingAccount = linkedAccounts.find((account) => {
    if (!normalizedAssetClass) {
      return false;
    }
    return toCanonicalAssetClassCode(account.accountType) === normalizedAssetClass;
  });

  if (!matchingAccount) {
    throw new OrdersServiceError(
      "INVALID_ORDER_INPUT",
      `No linked account found for asset class "${assetClass}".`,
      400,
    );
  }

  return matchingAccount.externalAccountId;
}

export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  validateSubmitOrderInput(input);

  const harborProvider = getHarborProvider();
  const client = await resolveCurrentClientOrThrow();
  const accountId = await resolveAccountIdForOrder(client.id, input.assetClass);
  const externalId = `app-order-${Date.now()}`;
  let orderResult: Awaited<ReturnType<typeof harborProvider.submitOrder>>;

  try {
    orderResult = await harborProvider.submitOrder({
      clientId: client.id,
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

export async function getOrders(): Promise<OrdersListResult> {
  try {
    const harborProvider = getHarborProvider();
    const client = await resolveCurrentClientOrThrow();
    const linkedAccounts = await listBrokerAccountsByClientId(client.id);
    if (linkedAccounts.length === 0) {
      throw new OrdersServiceError("NO_LINKED_ACCOUNTS", "No linked broker account found. Complete onboarding first.", 404);
    }

    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);

    const orderResponses = await Promise.all(
      linkedAccounts.map((account) =>
        harborProvider.fetchOrders({
          accountId: account.externalAccountId,
          from: from.toISOString(),
          to: to.toISOString(),
          page: 1,
          limit: 25,
        }),
      ),
    );

    const orders = orderResponses
      .flatMap((response) => response.orders)
      .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));

    return {
      orders,
      meta: {
        clientId: client.id,
        count: orders.length,
        provider: "harbor",
        source: "harbor-orders-api",
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
