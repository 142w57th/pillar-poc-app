"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import { toCanonicalAssetClassLabel } from "@/lib/account-asset-class";
import { ApiResponse, DashboardPayload, OrdersPayload, PositionsPayload, QuotePayload } from "@/types/api";

const ACCOUNT_TYPE_TAG_STYLES: Record<string, string> = {
  Equity: "tag-equity",
  Crypto: "tag-crypto",
  "Event Contract": "tag-event-contract",
};

function getAccountTypeTagClass(accountType: string) {
  return ACCOUNT_TYPE_TAG_STYLES[accountType] ?? "tag-default";
}

const ALL_ASSET_CLASS_OPTION = "ALL"; 
const ACCOUNT_ONBOARDING_ASSET_CLASSES = ["Equity", "Crypto"] as const;
const ASSET_CLASS_CHIP_LABELS: Record<(typeof ACCOUNT_ONBOARDING_ASSET_CLASSES)[number], string> = {
  Equity: "Equity",
  Crypto: "Crypto",
};

function getAssetClassChipLabel(assetClass: string) {
  return ASSET_CLASS_CHIP_LABELS[assetClass as keyof typeof ASSET_CLASS_CHIP_LABELS] ?? assetClass;
}

function getAssetClassFilterLabel(option: string) {
  if (option === ALL_ASSET_CLASS_OPTION) {
    return option;
  }

  return getAssetClassChipLabel(option);
}

type HoldingPresentation = {
  title: string;
  leftPrimaryText: string;
  moveWindowLabel: string;
  dayChangePercent: number;
  leftSecondaryText?: string;
  performanceLabel: string;
};

type DashboardSectionKey = "portfolio" | "holdings" | "orders";

function formatAccountTypeLabel(value: string) {
  const normalizedLabel = toCanonicalAssetClassLabel(value);
  if (normalizedLabel) return normalizedLabel;

  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCurrency(value: number) {
  const absoluteValue = formatCurrency(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${absoluteValue}`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDateTime(value: string) {
  const parsedValue = Date.parse(value);
  if (!Number.isFinite(parsedValue)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedValue);
}

function getOrderStatusClassName(status: string) {
  if (status === "accepted") {
    return "text-positive";
  }
  if (status === "rejected") {
    return "text-negative";
  }
  return "text-app-secondary";
}

function toCryptoPairLabel(symbol: string) {
  if (symbol.includes("/")) {
    return symbol;
  }

  if (symbol.endsWith("USD") && symbol.length > 3) {
    const baseAsset = symbol.slice(0, -3);
    return `${baseAsset}/USD`;
  }

  return symbol;
}

function toQuoteAssetClassParam(value: string) {
  if (value === "Crypto") return "CRYPTO";
  return "EQUITY";
}

function toHoldingPresentation(
  holding: PositionsPayload["positions"][number],
  liveQuote?: QuotePayload["quote"],
): HoldingPresentation {
  const livePrice = liveQuote?.price ?? holding.lastPrice;
  const liveDayChangePercent = liveQuote?.dayChangePercent ?? holding.dayChangePercent;

  if (holding.assetClass === "Crypto") {
    return {
      title: toCryptoPairLabel(holding.symbol),
      leftPrimaryText: formatCurrency(livePrice),
      moveWindowLabel: "24H",
      dayChangePercent: liveDayChangePercent,
      performanceLabel: "P&L",
    };
  }


  return {
    title: holding.symbol,
    leftPrimaryText: formatCurrency(livePrice),
    moveWindowLabel: "1D",
    dayChangePercent: liveDayChangePercent,
    performanceLabel: "P&L",
  };
}

function SectionSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="border-app bg-surface-2 mt-3 flex items-center justify-center gap-2 rounded-xl border px-4 py-8">
      <span className="border-app-secondary/40 border-t-app-secondary inline-block h-4 w-4 animate-spin rounded-full border-2" />
      <span className="text-app-secondary text-sm">{label}</span>
    </div>
  );
}

export default function Home() {
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<string[]>([ALL_ASSET_CLASS_OPTION]);
  const [isBalanceBreakdownOpen, setIsBalanceBreakdownOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<DashboardSectionKey, boolean>>({
    portfolio: true,
    holdings: false,
    orders: false,
  });

  const isPortfolioOpen = openSections.portfolio;
  const isHoldingsOpen = openSections.holdings;
  const isOrdersOpen = openSections.orders;
  const shouldFetchDashboard = isPortfolioOpen;
  const shouldFetchPositions = isHoldingsOpen;
  const shouldFetchOrders = isOrdersOpen;

  const handleSectionToggle = (section: DashboardSectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const { data: dashboardData, isLoading: isDashboardLoading, isError: isDashboardError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<DashboardPayload>>("/api/v1/dashboard");

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    enabled: shouldFetchDashboard,
  });

  const selectedSpecificAssetClasses = useMemo(
    () => selectedAssetClasses.filter((assetClass) => assetClass !== ALL_ASSET_CLASS_OPTION),
    [selectedAssetClasses],
  );

  const { data: positionsData, isLoading: isPositionsLoading, isError: isPositionsError } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<PositionsPayload>>("/api/v1/positions");

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    staleTime: 60_000,
    enabled: shouldFetchPositions,
  });

  const { data: ordersData, isLoading: isOrdersLoading, isError: isOrdersError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<OrdersPayload>>("/api/v1/orders");

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    staleTime: 60_000,
    enabled: shouldFetchOrders,
  });

  const holdings = useMemo(() => positionsData?.positions ?? [], [positionsData]);
  const recentOrders = useMemo(() => ordersData?.orders ?? [], [ordersData]);

  const selectedFilterSet = useMemo(() => new Set(selectedAssetClasses), [selectedAssetClasses]);

  const backendAssetClasses = useMemo(() => {
    if (dashboardData) {
      return Array.from(new Set(dashboardData.accounts.map((account) => formatAccountTypeLabel(account.accountType))));
    }

    return Array.from(new Set(holdings.map((holding) => holding.assetClass)));
  }, [dashboardData, holdings]);

  const assetClasses = useMemo(
    () => backendAssetClasses,
    [backendAssetClasses],
  );

  const activeAssetClasses = useMemo(
    () =>
      selectedFilterSet.has(ALL_ASSET_CLASS_OPTION)
        ? assetClasses
        : selectedAssetClasses.filter((assetClass) => assetClasses.includes(assetClass)),
    [assetClasses, selectedAssetClasses, selectedFilterSet],
  );

  const filterOptions = useMemo(
    () => (assetClasses.length > 1 ? [ALL_ASSET_CLASS_OPTION, ...assetClasses] : assetClasses),
    [assetClasses],
  );

  const filteredHoldingsRaw = useMemo(
    () => holdings.filter((holding) => activeAssetClasses.includes(holding.assetClass)),
    [activeAssetClasses, holdings],
  );

  const holdingQuoteTargets = useMemo(
    () =>
      Array.from(
        new Map(
          filteredHoldingsRaw.map((holding) => [
            `${holding.symbol.toUpperCase()}::${holding.assetClass}`,
            {
              symbol: holding.symbol.toUpperCase(),
              assetClass: holding.assetClass,
            },
          ]),
        ).values(),
      ),
    [filteredHoldingsRaw],
  );

  const { data: holdingQuotesMap } = useQuery({
    queryKey: ["holdings-live-quotes", holdingQuoteTargets],
    queryFn: async () => {
      const quotes = await Promise.all(
        holdingQuoteTargets.map(async (target) => {
          try {
            const response = await apiFetch<ApiResponse<QuotePayload>>(
              `/api/v1/quotes?symbol=${encodeURIComponent(target.symbol)}&assetClass=${encodeURIComponent(
                toQuoteAssetClassParam(target.assetClass),
              )}`,
            );
            if (!response.success) return null;
            return {
              key: `${target.symbol}::${target.assetClass}`,
              quote: response.data.quote,
            };
          } catch {
            return null;
          }
        }),
      );

      return quotes.reduce<Record<string, QuotePayload["quote"]>>((acc, item) => {
        if (!item) return acc;
        acc[item.key] = item.quote;
        return acc;
      }, {});
    },
    enabled: shouldFetchPositions && holdingQuoteTargets.length > 0,
    staleTime: 20_000,
  });

  const filteredHoldings = useMemo(
    () =>
      filteredHoldingsRaw.map((holding) => ({
        holding,
        presentation: toHoldingPresentation(
          holding,
          holdingQuotesMap?.[`${holding.symbol.toUpperCase()}::${holding.assetClass}`],
        ),
      })),
    [filteredHoldingsRaw, holdingQuotesMap],
  );

  const filteredDashboardAccounts = useMemo(
    () =>
      (dashboardData?.accounts ?? []).filter((account) =>
        activeAssetClasses.includes(formatAccountTypeLabel(account.accountType)),
      ) ?? [],
    [activeAssetClasses, dashboardData?.accounts],
  );

  const hasActiveAccountFilter = selectedSpecificAssetClasses.length > 0;
  const shouldUseFilteredAccountDetails = hasActiveAccountFilter;

  const totalValue = useMemo(() => {
    if (dashboardData && !hasActiveAccountFilter) {
      return dashboardData.aggregated.accountValue;
    }
    if (shouldUseFilteredAccountDetails) {
      return filteredDashboardAccounts.reduce((sum, account) => sum + account.accountValue, 0);
    }
    return filteredHoldings.reduce((sum, item) => sum + item.holding.marketValue, 0);
  }, [dashboardData, filteredDashboardAccounts, filteredHoldings, hasActiveAccountFilter, shouldUseFilteredAccountDetails]);

  const dailyMove = useMemo(() => {
    if (dashboardData && !hasActiveAccountFilter) {
      return dashboardData.aggregated.totalMarketValue - dashboardData.aggregated.totalCostBasis;
    }
    if (shouldUseFilteredAccountDetails) {
      return filteredDashboardAccounts.reduce((sum, account) => sum + (account.totalMarketValue - account.totalCostBasis), 0);
    }
    return filteredHoldings.reduce((sum, item) => sum + item.holding.marketValue * (item.holding.dayChangePercent / 100), 0);
  }, [dashboardData, filteredDashboardAccounts, filteredHoldings, hasActiveAccountFilter, shouldUseFilteredAccountDetails]);

  const buyingPower = useMemo(() => {
    if (dashboardData && !hasActiveAccountFilter) {
      return dashboardData.aggregated.buyingPower;
    }
    if (shouldUseFilteredAccountDetails) {
      return filteredDashboardAccounts.reduce((sum, account) => sum + account.buyingPower, 0);
    }
    return 0;
  }, [dashboardData, filteredDashboardAccounts, hasActiveAccountFilter, shouldUseFilteredAccountDetails]);

  const availableForWithdrawal = useMemo(() => {
    if (dashboardData && !hasActiveAccountFilter) {
      return dashboardData.aggregated.cashAvailableForWithdrawal;
    }
    if (shouldUseFilteredAccountDetails) {
      return filteredDashboardAccounts.reduce((sum, account) => sum + account.cashAvailableForWithdrawal, 0);
    }
    return 0;
  }, [dashboardData, filteredDashboardAccounts, hasActiveAccountFilter, shouldUseFilteredAccountDetails]);
  const isPortfolioBalancesLoading = isDashboardLoading && !dashboardData;

  const handleAssetClassToggle = (option: string) => {
    setSelectedAssetClasses((current) => {
      if (option === ALL_ASSET_CLASS_OPTION) {
        return [ALL_ASSET_CLASS_OPTION];
      }

      const next = new Set(current);
      next.delete(ALL_ASSET_CLASS_OPTION);

      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }

      if (next.size === 0 || next.size === assetClasses.length) {
        return next.size === 0 ? [ALL_ASSET_CLASS_OPTION] : Array.from(next);
      }

      return Array.from(next);
    });
  };

  const hasOpenedAccounts = assetClasses.length > 0;
  const missingAccountAssetClasses = ACCOUNT_ONBOARDING_ASSET_CLASSES.filter(
    (assetClass) => !assetClasses.includes(assetClass),
  );
  const showAccountOnboardingCta = !!dashboardData && missingAccountAssetClasses.length > 0;
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-4 pb-10">
      <section className="rounded-2xl border border-app bg-surface-1 p-5 shadow-sm @md:p-6">
        <button
          type="button"
          onClick={() => handleSectionToggle("portfolio")}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={isPortfolioOpen}
          aria-controls="dashboard-section-portfolio"
        >
          <h2 className="text-app-primary text-lg font-semibold">Portfolio</h2>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`text-app-secondary h-5 w-5 shrink-0 transition-transform ${isPortfolioOpen ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isPortfolioOpen ? (
          <div id="dashboard-section-portfolio" className="mt-4">
            <div className="flex flex-col gap-4 @lg:flex-row @lg:items-start @lg:justify-between">
              <div className="@lg:max-w-2xl">
                <p className="text-app-secondary text-sm">Consolidated portfolio summary across account types.</p>
              </div>

              <div className="w-full @lg:max-w-md">
                {hasOpenedAccounts ? (
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.map((option) => {
                      const isActive = selectedFilterSet.has(option);

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleAssetClassToggle(option)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                            isActive
                              ? "bg-app-accent text-app-accent-contrast border-transparent"
                              : "border-app bg-surface-2 text-app-secondary hover:opacity-90"
                          }`}
                          aria-pressed={isActive}
                        >
                          {getAssetClassFilterLabel(option)}
                        </button>
                      );
                    })}
                  </div>
                ) : isDashboardLoading ? null : (
                  <p className="text-app-secondary mt-2 text-sm">No account is opened yet.</p>
                )}
              </div>
            </div>

            {isDashboardError ? (
              <p className="text-negative mt-3 text-sm">Unable to load live dashboard data right now.</p>
            ) : null}

            {isPortfolioBalancesLoading ? (
              <SectionSpinner label="Loading portfolio..." />
            ) : (
              <>
                <div className="mt-4">
                  <article className="border-app bg-surface-2 rounded-xl border p-4">
                    <p className="text-app-muted text-xs uppercase tracking-[0.14em]">Total Value</p>
                    <p className="text-app-primary mt-2 text-xl font-semibold">{formatCurrency(totalValue)}</p>
                    <p className={`mt-2 flex items-center gap-2 text-sm ${dailyMove < 0 ? "text-negative" : "text-positive"}`}>
                      <span className="font-semibold">{formatSignedCurrency(dailyMove)}</span>
                      <span className="text-app-muted text-xs uppercase tracking-[0.08em]">
                        {dashboardData ? "Unrealized P/L" : "Today"}
                      </span>
                    </p>

                    {hasOpenedAccounts ? (
                      <div className="border-app-soft mt-3 border-t pt-3">
                        <button
                          type="button"
                          onClick={() => setIsBalanceBreakdownOpen((current) => !current)}
                          className="text-app-secondary flex w-full items-center justify-between text-sm font-medium"
                          aria-expanded={isBalanceBreakdownOpen}
                        >
                          <span>Account balance breakdown</span>
                          <span>{isBalanceBreakdownOpen ? "Hide" : "Show"}</span>
                        </button>

                        {isBalanceBreakdownOpen ? (
                          <div className="mt-3 flex flex-col gap-2">
                            {filteredDashboardAccounts.length === 0 ? (
                              <p className="text-app-secondary text-sm">Select an account type to load its balance.</p>
                            ) : null}

                            {filteredDashboardAccounts.map((account) => {
                              const label = formatAccountTypeLabel(account.accountType);
                              const pnl = account.totalMarketValue - account.totalCostBasis;

                              return (
                                <div key={account.accountId} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${getAccountTypeTagClass(label)}`}
                                    >
                                      {getAssetClassChipLabel(label)}
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-2">
                                    <span className={`text-xs ${pnl < 0 ? "text-negative" : "text-positive"}`}>
                                      {formatSignedCurrency(pnl)}
                                    </span>
                                    <span className="text-app-primary text-sm font-semibold">
                                      {formatCurrency(account.accountValue)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                </div>

                <article className="border-app bg-surface-2 mt-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Buying Power</p>
                    <p className="text-app-primary text-sm font-semibold">{formatCurrency(buyingPower)}</p>
                  </div>
                  <div className="border-app-soft mt-3 flex items-center justify-between gap-3 border-t pt-3">
                    <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Available for Withdrawal</p>
                    <p className="text-app-primary text-sm font-semibold">{formatCurrency(availableForWithdrawal)}</p>
                  </div>
                  <Link
                    href="/transfer"
                    className="border-app bg-surface-1 text-app-primary mt-4 inline-flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:opacity-90"
                  >
                    + Add funds
                  </Link>
                </article>

                {showAccountOnboardingCta ? (
                  <div className="border-app bg-surface-2 mt-4 flex flex-col gap-3 rounded-xl border p-4 @md:flex-row @md:items-center @md:justify-between">
                    <div>
                      <p className="text-app-primary text-sm font-semibold">
                        {hasOpenedAccounts ? "Open another account type." : "Open your first account."}
                      </p>
                      <p className="text-app-secondary mt-1 text-sm">
                        {hasOpenedAccounts
                          ? `Account onboarding is still pending for ${missingAccountAssetClasses.join(", ")}.`
                          : "Start account onboarding to activate an account type."}
                      </p>
                    </div>
                    <Link
                      href="/onboarding"
                      className="bg-app-accent text-app-accent-contrast inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                    >
                      {hasOpenedAccounts ? "Continue account onboarding" : "Start account onboarding"}
                    </Link>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </section>

      <section className="border-app bg-surface-1 rounded-2xl border p-5 shadow-sm @md:p-6">
        <button
          type="button"
          onClick={() => handleSectionToggle("holdings")}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={isHoldingsOpen}
          aria-controls="dashboard-section-holdings"
        >
          <h3 className="text-app-primary text-lg font-semibold">Holdings</h3>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`text-app-secondary h-5 w-5 shrink-0 transition-transform ${isHoldingsOpen ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isHoldingsOpen ? (
          <div id="dashboard-section-holdings" className="mt-4">
            {isPositionsError ? (
              <p className="text-negative mt-1 text-sm">Unable to load holdings data right now.</p>
            ) : null}

            {isPositionsLoading ? (
              <SectionSpinner label="Loading holdings..." />
            ) : (
              <div className="border-app bg-surface-1 mt-3 rounded-xl border">
                {filteredHoldings.length > 0 ? (
                  filteredHoldings.map(({ holding, presentation }, index) => (
                    <article
                      key={`${holding.symbol}-${holding.assetClass}`}
                      className={`flex items-start justify-between gap-4 px-4 py-3 @md:px-5 ${
                      index !== filteredHoldings.length - 1 ? "border-app-soft border-b" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/instruments/${encodeURIComponent(holding.symbol)}`}
                            className="text-app-primary text-sm font-semibold leading-none hover:underline"
                          >
                            {presentation.title}
                          </Link>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${getAccountTypeTagClass(
                              holding.assetClass,
                            )}`}
                          >
                            {getAssetClassChipLabel(holding.assetClass)}
                          </span>
                        </div>
                        <p className="text-app-secondary mt-1.5 text-sm">
                          {presentation.leftPrimaryText}{" "}
                        <span className={presentation.dayChangePercent < 0 ? "text-negative" : "text-positive"}>
                          ({presentation.moveWindowLabel}: {formatSignedPercent(presentation.dayChangePercent)})
                          </span>
                        </p>
                        {presentation.leftSecondaryText ? (
                        <p className="text-app-muted mt-1 text-xs">{presentation.leftSecondaryText}</p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                      <p className="text-app-primary text-sm font-semibold">{formatCurrency(holding.marketValue)}</p>
                        <p className="text-app-muted mt-1.5 text-xs">
                          {presentation.performanceLabel}:{" "}
                        <span className={holding.pnlPercent < 0 ? "text-negative" : "text-positive"}>
                            {formatSignedPercent(holding.pnlPercent)}
                          </span>
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center @md:px-5">
                    <p className="text-app-primary text-sm font-medium">
                      No holdings match this filter.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="border-app bg-surface-1 rounded-2xl border p-5 shadow-sm @md:p-6">
        <button
          type="button"
          onClick={() => handleSectionToggle("orders")}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={isOrdersOpen}
          aria-controls="dashboard-section-orders"
        >
          <h3 className="text-app-primary text-lg font-semibold">Orders</h3>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`text-app-secondary h-5 w-5 shrink-0 transition-transform ${isOrdersOpen ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isOrdersOpen ? (
          <div id="dashboard-section-orders" className="mt-4">
            {isOrdersError ? (
              <p className="text-negative mt-1 text-sm">Unable to load orders right now.</p>
            ) : null}

            {isOrdersLoading ? (
              <SectionSpinner label="Loading orders..." />
            ) : (
              <div className="border-app bg-surface-1 mt-3 rounded-xl border">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order, index) => (
                    <article
                      key={`${order.orderId}-${order.submittedAt}`}
                      className={`flex items-start justify-between gap-4 px-4 py-3 @md:px-5 ${
                      index !== recentOrders.length - 1 ? "border-app-soft border-b" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                        <p className="text-app-primary text-sm font-semibold">{order.instrumentSymbol}</p>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${getAccountTypeTagClass(
                              order.assetClass,
                            )}`}
                          >
                            {getAssetClassChipLabel(order.assetClass)}
                          </span>
                        </div>
                        <p className="text-app-secondary mt-1.5 text-sm">
                          {order.side}
                        {order.eventSide ? ` ${order.eventSide}` : ""} • {formatCurrency(order.amountUsd)} @{" "}
                          {formatCurrency(order.pricePerUnit)}
                        </p>
                      <p className="text-app-muted mt-1 text-xs">{formatDateTime(order.submittedAt)}</p>
                      </div>

                      <div className="shrink-0 text-right">
                      <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${getOrderStatusClassName(order.status)}`}>
                          {order.status}
                        </p>
                      <p className="text-app-muted mt-1.5 text-xs">#{order.orderId.slice(-6)}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center @md:px-5">
                    <p className="text-app-primary text-sm font-medium">No orders yet.</p>
                    <p className="text-app-secondary mt-1 text-sm">Submit a buy or sell order to see activity here.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
