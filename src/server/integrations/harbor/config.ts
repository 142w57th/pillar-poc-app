export type HarborConfig = {
  baseUrl: string;
  authUrl: string;
  clientId: string;
  clientSecret: string;
  balancesPath: string;
  partyBalancesPath: string;
  instrumentsPath: string;
  ordersPath: string;
  partyOrdersPath: string;
  positionsPath: string;
  quotesPath: string;
  paymentInstructionsPath: string;
  paymentAccountsPath: string;
  depositsPath: string;
  authScope: string | null;
  requestTimeoutMs: number;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getHarborConfig(): HarborConfig {
  const timeoutValue = process.env.HARBOR_REQUEST_TIMEOUT_MS;
  const parsedTimeout = timeoutValue ? Number(timeoutValue) : 15_000;

  if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
    throw new Error("HARBOR_REQUEST_TIMEOUT_MS must be a positive number.");
  }

  return {
    baseUrl: requireEnv("HARBOR_API_BASE_URL").replace(/\/+$/, ""),
    authUrl: requireEnv("HARBOR_AUTH_URL"),
    clientId: requireEnv("HARBOR_CLIENT_ID"),
    clientSecret: requireEnv("HARBOR_CLIENT_SECRET"),
    balancesPath: process.env.HARBOR_BALANCES_PATH || "/v2/financials/accounts/{accountId}/balances",
    partyBalancesPath: process.env.HARBOR_PARTY_BALANCES_PATH || "/v2/financials/parties",
    instrumentsPath: process.env.HARBOR_INSTRUMENTS_PATH || "/instruments",
    ordersPath: process.env.HARBOR_ORDERS_PATH || "/trading/v1/orders",
    partyOrdersPath: process.env.HARBOR_PARTY_ORDERS_PATH || "/v2/trading/parties",
    positionsPath: process.env.HARBOR_POSITIONS_PATH || "/v2/financials/parties",
    quotesPath: process.env.HARBOR_QUOTES_PATH || "/quotes",
    paymentInstructionsPath: process.env.HARBOR_PAYMENT_INSTRUCTIONS_PATH || "/braavos/v1/payments/payment-instructions",
    paymentAccountsPath: process.env.HARBOR_PAYMENT_ACCOUNTS_PATH || "/v1/payments/payment-accounts",
    depositsPath: process.env.HARBOR_DEPOSITS_PATH || "/v1/payments/payment-instructions",
    authScope: process.env.HARBOR_AUTH_SCOPE || null,
    requestTimeoutMs: parsedTimeout,
  };
}
