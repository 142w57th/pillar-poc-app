"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { apiFetch } from "@/lib/api-client";
import {
  ApiResponse,
  PositionsPayload,
  QuotePayload,
} from "@/types/api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSignedCurrency(value: number) {
  const absolute = formatCurrency(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${absolute}`;
}

function formatVolume(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateTime(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function toOrderAssetClassParam(value: string | undefined) {
  if (!value) return "EQUITY";
  if (value === "Crypto" || value === "CRYPTO") return "CRYPTO";
  if (value === "Event Contract") return "EVENT_CONTRACT";
  if (value === "Equity" || value === "EQUITY") return "EQUITY";
  return value.toUpperCase();
}

export default function InstrumentDetailsPage() {
  const params = useParams<{ symbol: string }>();
  const searchParams = useSearchParams();
  const rawSymbol = params?.symbol;
  const symbol = useMemo(
    () =>
      decodeURIComponent(
        Array.isArray(rawSymbol) ? rawSymbol[0] : (rawSymbol ?? ""),
      ),
    [rawSymbol],
  );
  const normalizedSymbol = symbol.toUpperCase();
  const selectedAssetClass = searchParams.get("assetClass") ?? "";
  const normalizedSelectedAssetClass = toOrderAssetClassParam(
    selectedAssetClass || undefined,
  );

  const { data: positionsData } = useQuery({
    queryKey: ["positions", normalizedSymbol, normalizedSelectedAssetClass],
    queryFn: async () => {
      const assetClassQuery = normalizedSelectedAssetClass
        ? `&assetClass=${encodeURIComponent(normalizedSelectedAssetClass)}`
        : "";
      const response = await apiFetch<ApiResponse<PositionsPayload>>(
        `/api/v1/positions?scope=account&symbol=${encodeURIComponent(normalizedSymbol)}${assetClassQuery}`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 30_000,
    enabled: !!normalizedSymbol,
  });

  const { data: quoteData, isLoading: isPriceLoading } = useQuery({
    queryKey: [
      "price-snapshot",
      normalizedSymbol,
      normalizedSelectedAssetClass,
    ],
    queryFn: async () => {
      const assetClassQuery = normalizedSelectedAssetClass
        ? `&assetClass=${encodeURIComponent(normalizedSelectedAssetClass)}`
        : "";
      const response = await apiFetch<ApiResponse<QuotePayload>>(
        `/api/v1/quotes?symbol=${encodeURIComponent(normalizedSymbol)}${assetClassQuery}&includeExtendedHours=true`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 20_000,
    enabled: !!normalizedSymbol,
  });

  const position = positionsData?.positions[0] ?? null;
  const snapshot = quoteData?.quote;
  const resolvedSymbol = snapshot?.symbol ?? normalizedSymbol;
  const livePrice = snapshot?.price ?? position?.lastPrice ?? 0;
  const dayChangePercent =
    snapshot?.dayChangePercent ?? position?.dayChangePercent ?? 0;
  const dayChange = snapshot?.change ?? (livePrice * dayChangePercent) / 100;
  const isPositiveDayMove = dayChangePercent >= 0;
  const buyAssetClassParam =
    normalizedSelectedAssetClass ||
    toOrderAssetClassParam(snapshot?.assetClass ?? position?.assetClass);
  const currentValue = position?.marketValue ?? 0;
  const investedValue = position?.investedValue ?? 0;
  const pnlPercent = position?.pnlPercent ?? 0;
  const pnlAmount = position?.pnlAmount ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-1 pb-24 @md:px-2">
      <section className="border-app bg-surface-1 overflow-hidden rounded-2xl border shadow-sm">
        <header className="border-app-soft flex items-center gap-3 border-b px-5 py-4">
          <Link
            href="/"
            className="text-app-primary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-surface-2"
            aria-label="Back to dashboard"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18L9 12L15 6" />
            </svg>
          </Link>

          <h1 className="text-app-primary min-w-0 truncate text-sm font-semibold">
            {snapshot?.instrumentName ?? resolvedSymbol}
          </h1>
        </header>

        {isPriceLoading ? (
          <div className="px-6 py-6 text-center">
            <p className="text-app-secondary text-sm">
              Loading price snapshot...
            </p>
          </div>
        ) : (
          <div className="px-6 py-6 text-center">
            <p className="text-app-primary text-3xl font-semibold tracking-tight">
              {formatCurrency(livePrice)}
            </p>
            <p
              className={`mt-1 text-sm font-medium ${isPositiveDayMove ? "text-positive" : "text-negative"} `}
            >
              {formatSignedCurrency(dayChange)} (
              {formatSignedPercent(dayChangePercent)}) today
            </p>
            <p className="text-app-muted mt-2 text-xs">
              {snapshot?.marketSession ?? "UNKNOWN"} · Updated{" "}
              {formatDateTime(snapshot?.updatedAt ?? "")}
            </p>
          </div>
        )}

        {snapshot ? (
          <>
            <div className="border-app-soft mx-5 border-t" />
            <section className="px-6 py-5">
              <h2 className="text-app-primary text-sm font-semibold">
                Market Snapshot
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="border-app bg-surface-2 rounded-lg border px-3 py-2">
                  <dt className="text-app-muted text-xs">Open</dt>
                  <dd className="text-app-primary mt-1 font-medium">
                    {formatCurrency(snapshot.open)}
                  </dd>
                </div>
                <div className="border-app bg-surface-2 rounded-lg border px-3 py-2">
                  <dt className="text-app-muted text-xs">Prev Close</dt>
                  <dd className="text-app-primary mt-1 font-medium">
                    {formatCurrency(snapshot.previousClose)}
                  </dd>
                </div>
                <div className="border-app bg-surface-2 rounded-lg border px-3 py-2">
                  <dt className="text-app-muted text-xs">Day High</dt>
                  <dd className="text-app-primary mt-1 font-medium">
                    {formatCurrency(snapshot.high)}
                  </dd>
                </div>
                <div className="border-app bg-surface-2 rounded-lg border px-3 py-2">
                  <dt className="text-app-muted text-xs">Day Low</dt>
                  <dd className="text-app-primary mt-1 font-medium">
                    {formatCurrency(snapshot.low)}
                  </dd>
                </div>
                <div className="border-app bg-surface-2 rounded-lg border px-3 py-2">
                  <dt className="text-app-muted text-xs">Volume</dt>
                  <dd className="text-app-primary mt-1 font-medium">
                    {formatVolume(snapshot.volume)}
                  </dd>
                </div>
                <div className="border-app bg-surface-2 rounded-lg border px-3 py-2">
                  <dt className="text-app-muted text-xs">VWAP</dt>
                  <dd className="text-app-primary mt-1 font-medium">
                    {snapshot.vwap !== null
                      ? formatCurrency(snapshot.vwap)
                      : "-"}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        ) : null}

        {position ? (
          <>
            <div className="border-app-soft mx-5 border-t" />
            <section className="px-6 py-5">
              <h2 className="text-app-primary text-sm font-semibold">
                Your Position
              </h2>

              <dl className="mt-3 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-app-secondary text-sm">Invested:</dt>
                  <dd className="text-app-primary text-sm font-medium">
                    {investedValue}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-app-secondary text-sm">Current Value:</dt>
                  <dd className="text-app-primary text-sm font-medium">
                    {currentValue}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-app-secondary text-sm">P/L:</dt>
                  <dd
                    className={`text-sm font-medium ${pnlAmount >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {`${formatSignedCurrency(pnlAmount)} (${formatSignedPercent(pnlPercent)})`}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-5 pt-3 @md:px-6">
        <div
          className={`mx-auto max-w-md ${position ? "grid grid-cols-2 gap-3" : ""}`}
        >
          <Link
            href={`/buy?symbol=${encodeURIComponent(resolvedSymbol)}&assetClass=${encodeURIComponent(buyAssetClassParam)}`}
            className="bg-app-accent text-app-accent-contrast inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:opacity-90"
          >
            Buy
          </Link>
          {position ? (
            <Link
              href={`/sell?symbol=${encodeURIComponent(resolvedSymbol)}&assetClass=${encodeURIComponent(buyAssetClassParam)}`}
              className="border-app bg-surface-1 text-app-secondary inline-flex w-full items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:opacity-90"
            >
              Sell
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
