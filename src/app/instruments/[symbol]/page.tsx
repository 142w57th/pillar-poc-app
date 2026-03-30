"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { apiFetch } from "@/lib/api-client";
import { ApiResponse, InstrumentsCatalogPayload, QuotePayload } from "@/types/api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatWholeCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatEventPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function InstrumentDetailsPage() {
  const params = useParams<{ symbol: string }>();
  const rawSymbol = params?.symbol;
  const symbol = useMemo(() => decodeURIComponent(Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol ?? ""), [rawSymbol]);
  const normalizedSymbol = symbol.toUpperCase();

  const { data: instrumentsData, isLoading: isInstrumentsLoading } = useQuery({
    queryKey: ["instruments-catalog"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<InstrumentsCatalogPayload>>("/api/v1/instruments");
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    staleTime: 60_000,
  });

  const { data: quoteData, isLoading: isQuoteLoading } = useQuery({
    queryKey: ["quote", normalizedSymbol],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<QuotePayload>>(
        `/api/v1/quotes?symbol=${encodeURIComponent(normalizedSymbol)}`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    staleTime: 30_000,
    enabled: !!normalizedSymbol,
  });

  const instrument = useMemo(
    () =>
      (instrumentsData?.instruments ?? []).find(
        (item) => item.symbol.toUpperCase() === normalizedSymbol,
      ),
    [instrumentsData?.instruments, normalizedSymbol],
  );

  const snapshot = quoteData?.quote ?? null;
  const isEventContract = snapshot?.assetClass === "Event Contract";
  const isPositiveDayMove = (snapshot?.dayChangePercent ?? 0) >= 0;
  const position = snapshot?.position;
  const pnlAmount = position ? position.currentValue - position.invested : 0;
  const pnlPercent = position && position.invested > 0 ? (pnlAmount / position.invested) * 100 : 0;

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
            {instrument?.name ?? normalizedSymbol}
          </h1>
        </header>

        {isQuoteLoading ? (
          <div className="px-6 py-6 text-center">
            <p className="text-app-secondary text-sm">Loading quote...</p>
          </div>
        ) : isEventContract && snapshot?.eventPricing ? (
          <div className="px-6 py-6 text-center">
            <div className="flex items-center justify-center gap-6">
              <div>
                <p className="text-app-muted text-xs uppercase tracking-widest">Yes</p>
                <p className="text-positive mt-1 text-2xl font-semibold">
                  {formatEventPrice(snapshot.eventPricing.yesPrice)}
                </p>
              </div>
              <div className="border-app-soft h-10 border-l" />
              <div>
                <p className="text-app-muted text-xs uppercase tracking-widest">No</p>
                <p className="text-negative mt-1 text-2xl font-semibold">
                  {formatEventPrice(snapshot.eventPricing.noPrice)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-6 text-center">
            <p className="text-app-primary text-3xl font-semibold tracking-tight">
              {formatCurrency(snapshot?.price ?? 0)}
            </p>
            <p className={`mt-1 text-sm font-medium ${isPositiveDayMove ? "text-positive" : "text-negative"}`}>
              {formatSignedPercent(snapshot?.dayChangePercent ?? 0)} today
            </p>
          </div>
        )}

        {position ? (
          <>
            <div className="border-app-soft mx-5 border-t" />
            <section className="px-6 py-5">
              <h2 className="text-app-primary text-sm font-semibold">Your Position</h2>

              <dl className="mt-3 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-app-secondary text-sm">Invested:</dt>
                  <dd className="text-app-primary text-sm font-medium">{formatWholeCurrency(position.invested)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-app-secondary text-sm">Current Value:</dt>
                  <dd className="text-app-primary text-sm font-medium">{formatWholeCurrency(position.currentValue)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-app-secondary text-sm">P/L:</dt>
                  <dd className={`text-sm font-medium ${pnlAmount >= 0 ? "text-positive" : "text-negative"}`}>
                    {`${pnlAmount >= 0 ? "+" : "-"}${formatWholeCurrency(Math.abs(pnlAmount))} (${formatSignedPercent(pnlPercent)})`}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        ) : null}
      </section>

      {isInstrumentsLoading ? (
        <p className="text-app-secondary mt-3 px-1 text-xs">Loading instrument details...</p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-5 pt-3 @md:px-6">
        <div className={`mx-auto max-w-md ${position ? "grid grid-cols-2 gap-3" : ""}`}>
          <Link
            href={`/buy?symbol=${encodeURIComponent(normalizedSymbol)}`}
            className="bg-app-accent text-app-accent-contrast inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:opacity-90"
          >
            Buy
          </Link>
          {position ? (
            <Link
              href={`/sell?symbol=${encodeURIComponent(normalizedSymbol)}`}
              className="border-app bg-surface-1 text-app-secondary w-full rounded-lg border px-4 py-3 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:opacity-90"
            >
              Sell
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
