import { randomUUID } from "node:crypto";

import { emitApiLog } from "@/server/api-log/event-bus";
import type { HttpMethod } from "@/server/api-log/types";
import type { TradeOrderSubmitRequest } from "@/server/integrations/harbor/orders";
import type { HarborSubmitDepositRequest } from "@/server/integrations/harbor/payments";
import type { HarborProvider } from "@/server/integrations/harbor/provider";

type EndpointMapping = {
  method: HttpMethod;
  path: string | ((...args: unknown[]) => string);
  description?: string;
};

const ENDPOINT_MAP: Record<string, EndpointMapping> = {
  fetchBalanceByAccountId: {
    method: "GET",
    path: (accountId: unknown) => `/v2/accounts/${accountId}/balances`,
    description: "Fetch account balance",
  },
  fetchBalanceByPartyId: {
    method: "GET",
    path: (partyId: unknown) => `/v2/parties/${partyId}/balances`,
    description: "Fetch party-level balance",
  },
  fetchInstruments: {
    method: "GET",
    path: "/instruments",
    description: "Fetch instruments catalog",
  },
  submitOrder: {
    method: "POST",
    path: "/v1/orders",
    description: "Submit trade order",
  },
  fetchOrders: {
    method: "GET",
    path: (partyId: unknown) => `/v2/parties/${partyId}/orders`,
    description: "Fetch party orders",
  },
  fetchPaymentInstructions: {
    method: "GET",
    path: "/braavos/v1/payments/payment-instructions",
    description: "Fetch payment instructions",
  },
  submitDeposit: {
    method: "POST",
    path: "/v1/payments/payment-instructions",
    description: "Submit deposit",
  },
  fetchPositions: {
    method: "GET",
    path: (partyId: unknown) => `/v2/parties/${partyId}/positions`,
    description: "Fetch party positions",
  },
  fetchQuote: {
    method: "GET",
    path: (symbol: unknown) => `/quotes?symbol=${symbol}`,
    description: "Fetch instrument quote",
  },
};

function randomDelay(): Promise<number> {
  const ms = Math.floor(Math.random() * 250) + 100;
  return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
}

function resolveRequestBody(methodName: string, args: unknown[]): unknown {
  if (methodName === "submitOrder") return args[0];
  if (methodName === "submitDeposit") return args[0];
  return undefined;
}

function resolvePath(mapping: EndpointMapping, args: unknown[]): string {
  if (typeof mapping.path === "function") {
    return mapping.path(...args);
  }
  return mapping.path;
}

let hasEmittedAuthForSession = false;

async function emitMockAuthEvent() {
  if (hasEmittedAuthForSession) return;
  hasEmittedAuthForSession = true;

  const delay = await randomDelay();
  emitApiLog({
    id: randomUUID(),
    timestamp: Date.now(),
    method: "POST",
    path: "/v1/auth/token",
    description: "Authenticate with OAuth 2.0 client credentials",
    status: 200,
    durationMs: delay,
    requestBody: { grant_type: "client_credentials" },
    responseBody: {
      access_token: "eyJhbGci0iJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIi...mock-signature",
      token_type: "Bearer",
      expires_in: 3600,
    },
  });
}

export function createLoggedHarborProvider(inner: HarborProvider): HarborProvider {
  return {
    async fetchBalanceByAccountId(accountId: string) {
      await emitMockAuthEvent();
      return loggedCall("fetchBalanceByAccountId", [accountId], () =>
        inner.fetchBalanceByAccountId(accountId),
      );
    },

    async fetchBalanceByPartyId(partyId: string) {
      await emitMockAuthEvent();
      return loggedCall("fetchBalanceByPartyId", [partyId], () =>
        inner.fetchBalanceByPartyId(partyId),
      );
    },

    async fetchInstruments() {
      await emitMockAuthEvent();
      return loggedCall("fetchInstruments", [], () => inner.fetchInstruments());
    },

    async submitOrder(input: TradeOrderSubmitRequest) {
      await emitMockAuthEvent();
      return loggedCall("submitOrder", [input], () => inner.submitOrder(input));
    },

    async fetchOrders(partyId: string) {
      await emitMockAuthEvent();
      return loggedCall("fetchOrders", [partyId], () => inner.fetchOrders(partyId));
    },

    async fetchPaymentInstructions() {
      await emitMockAuthEvent();
      return loggedCall("fetchPaymentInstructions", [], () => inner.fetchPaymentInstructions());
    },

    async submitDeposit(input: HarborSubmitDepositRequest) {
      await emitMockAuthEvent();
      return loggedCall("submitDeposit", [input], () => inner.submitDeposit(input));
    },

    async fetchPositions(partyId: string) {
      await emitMockAuthEvent();
      return loggedCall("fetchPositions", [partyId], () => inner.fetchPositions(partyId));
    },

    async fetchQuote(symbol: string) {
      await emitMockAuthEvent();
      return loggedCall("fetchQuote", [symbol], () => inner.fetchQuote(symbol));
    },
  };
}

async function loggedCall<T>(
  methodName: string,
  args: unknown[],
  execute: () => Promise<T>,
): Promise<T> {
  const mapping = ENDPOINT_MAP[methodName];
  if (!mapping) return execute();

  const delay = await randomDelay();
  const start = performance.now();
  const result = await execute();
  const actualDuration = Math.round(performance.now() - start);

  emitApiLog({
    id: randomUUID(),
    timestamp: Date.now(),
    method: mapping.method,
    path: resolvePath(mapping, args),
    description: mapping.description,
    status: 200,
    durationMs: delay + actualDuration,
    requestBody: resolveRequestBody(methodName, args),
    responseBody: result,
  });

  return result;
}
