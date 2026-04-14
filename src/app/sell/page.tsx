"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import {
  ApiResponse,
  PositionsPayload,
  QuotePayload,
  SubmitOrderPayload,
} from "@/types/api";

type AssetClass = "Equity" | "Crypto" | "Event Contract";
type EventSide = "YES" | "NO";
type OrderType = "market" | "limit" | "stop" | "stop-limit";

const ORDER_TYPES: { id: OrderType; label: string; enabled: boolean }[] = [
  { id: "market", label: "Market", enabled: true },
  { id: "limit", label: "Limit", enabled: false },
  { id: "stop", label: "Stop", enabled: false },
  { id: "stop-limit", label: "Stop Limit", enabled: false },
];
type OrderInstrument = {
  id: string;
  title: string;
  symbol: string;
  assetClass: AssetClass;
};

type OrderFeedback =
  | {
      type: "success";
      message: string;
      orderId: string;
      status: string;
    }
  | {
      type: "error";
      message: string;
    };

const FALLBACK_INVESTED_BALANCE = 0;

function toOrderAssetClass(value: string | null): AssetClass | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "CRYPTO") return "Crypto";
  if (
    normalized === "OPTION" ||
    normalized === "EVENT_CONTRACT" ||
    normalized === "EVENT CONTRACT"
  ) {
    return "Event Contract";
  }
  if (normalized === "EQUITY") return "Equity";
  if (value === "Equity" || value === "Crypto" || value === "Event Contract")
    return value;
  return undefined;
}

function toQuoteAssetClassParam(value: AssetClass | undefined) {
  if (value === "Crypto") return "CRYPTO";
  if (value === "Event Contract") return "OPTION";
  return "EQUITY";
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const firstDotIndex = normalized.indexOf(".");
  if (firstDotIndex === -1) {
    return normalized;
  }
  const beforeDot = normalized.slice(0, firstDotIndex + 1);
  const afterDot = normalized.slice(firstDotIndex + 1).replace(/\./g, "");
  return `${beforeDot}${afterDot}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUnits(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0.0000";
  }

  return value.toFixed(4);
}

function toCryptoPairLabel(symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (normalizedSymbol.includes("/")) {
    return normalizedSymbol;
  }

  const delimitedUsdMatch = normalizedSymbol.match(/^([A-Z0-9]+)[-_]USD$/);
  if (delimitedUsdMatch?.[1]) {
    return `${delimitedUsdMatch[1]}/USD`;
  }

  if (normalizedSymbol.endsWith("USD") && normalizedSymbol.length > 3) {
    const base = normalizedSymbol.slice(0, -3).replace(/[-_]+$/g, "");
    return `${base}/USD`;
  }

  return symbol;
}

function toCryptoBaseAsset(symbol: string) {
  const pairLabel = toCryptoPairLabel(symbol);
  if (pairLabel.includes("/")) {
    return pairLabel.split("/")[0] ?? symbol;
  }

  return pairLabel;
}

function SellPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const symbolFromUrl = searchParams.get("symbol")?.trim() ?? "";
  const selectedAssetClassFromUrl = toOrderAssetClass(
    searchParams.get("assetClass"),
  );

  const [orderType, setOrderType] = useState<OrderType>("market");
  const [comingSoonMessage, setComingSoonMessage] = useState<string | null>(
    null,
  );
  const [eventSide, setEventSide] = useState<EventSide>("YES");
  const [amountInput, setAmountInput] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<OrderFeedback | null>(
    null,
  );

  const selectedInstrument = useMemo(() => {
    if (!symbolFromUrl) {
      return null;
    }

    const normalizedSymbol = symbolFromUrl.toUpperCase();
    return {
      id: `symbol-${normalizedSymbol}`,
      title:
        selectedAssetClassFromUrl === "Crypto"
          ? toCryptoPairLabel(normalizedSymbol)
          : normalizedSymbol,
      symbol: normalizedSymbol,
      assetClass: selectedAssetClassFromUrl ?? "Equity",
    } satisfies OrderInstrument;
  }, [selectedAssetClassFromUrl, symbolFromUrl]);

  const { data: quoteData, isLoading: isQuoteLoading } = useQuery({
    queryKey: [
      "quote-sell",
      selectedInstrument?.symbol,
      selectedInstrument?.assetClass,
    ],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<QuotePayload>>(
        `/api/v1/quotes?symbol=${encodeURIComponent(selectedInstrument!.symbol)}&assetClass=${encodeURIComponent(
          toQuoteAssetClassParam(selectedInstrument?.assetClass),
        )}`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    staleTime: 30_000,
    enabled: !!selectedInstrument?.symbol,
  });

  const { data: positionsData, isLoading: isPositionsLoading } = useQuery({
    queryKey: [
      "positions-sell",
      selectedInstrument?.symbol,
      selectedInstrument?.assetClass,
    ],
    queryFn: async () => {
      const assetClassQuery = selectedInstrument?.assetClass
        ? `&assetClass=${encodeURIComponent(toQuoteAssetClassParam(selectedInstrument.assetClass))}`
        : "";
      const response = await apiFetch<ApiResponse<PositionsPayload>>(
        `/api/v1/positions?scope=account&symbol=${encodeURIComponent(
          selectedInstrument!.symbol,
        )}${assetClassQuery}`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 30_000,
    enabled: !!selectedInstrument?.symbol,
  });

  const resolvedAssetClass =
    quoteData?.quote.assetClass ?? selectedInstrument?.assetClass;
  const displayTitle =
    quoteData?.quote.instrumentName ??
    (resolvedAssetClass === "Crypto"
      ? toCryptoPairLabel(selectedInstrument?.symbol ?? "")
      : (selectedInstrument?.symbol ?? ""));
  const position = positionsData?.positions[0] ?? null;
  const currentValue = position?.marketValue ?? 0;
  const pnlPercent = position?.pnlPercent ?? 0;
  const investedFromPosition = currentValue / (1 + pnlPercent / 100);
  const investedBalance = Number.isFinite(investedFromPosition)
    ? investedFromPosition
    : FALLBACK_INVESTED_BALANCE;
  const quotePrice = quoteData?.quote.price ?? 0;
  const eventYesPrice = quoteData?.quote.eventPricing?.yesPrice ?? 0;
  const eventNoPrice = quoteData?.quote.eventPricing?.noPrice ?? 0;

  const amount = useMemo(() => parseAmount(amountInput), [amountInput]);
  const isEventContract = resolvedAssetClass === "Event Contract";

  const eventSidePrice = useMemo(() => {
    if (!isEventContract) {
      return null;
    }

    return eventSide === "YES" ? eventYesPrice : eventNoPrice;
  }, [eventSide, isEventContract, eventYesPrice, eventNoPrice]);

  const estimatedUnitsToSell = useMemo(() => {
    if (isEventContract || quotePrice <= 0) {
      return 0;
    }

    return amount / quotePrice;
  }, [amount, isEventContract, quotePrice]);

  const estimatedContractsToSell = useMemo(() => {
    if (!isEventContract || !eventSidePrice || eventSidePrice <= 0) {
      return 0;
    }

    return amount / eventSidePrice;
  }, [amount, eventSidePrice, isEventContract]);

  const exceedsInvestedBalance = amount > investedBalance;
  const isAmountEmpty = amount <= 0;
  const canSubmit = !isAmountEmpty && !exceedsInvestedBalance;

  const submitButtonLabel = isEventContract ? `SELL ${eventSide}` : "SELL";
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedInstrument || !canSubmit || isSubmittingOrder) {
      return;
    }

    setOrderFeedback(null);
    setIsSubmittingOrder(true);

    try {
      const pricePerUnit = isEventContract ? (eventSidePrice ?? 0) : quotePrice;
      if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
        throw new Error(
          "Current market price is unavailable. Please try again.",
        );
      }

      const response = await apiFetch<ApiResponse<SubmitOrderPayload>>(
        "/api/v1/orders",
        {
          method: "POST",
          body: JSON.stringify({
            instrumentSymbol: selectedInstrument.symbol,
            assetClass: resolvedAssetClass,
            side: "SELL",
            amountUsd: amount,
            pricePerUnit,
            eventSide: isEventContract ? eventSide : undefined,
          }),
        },
      );

      if (!response.success) {
        throw new Error(response.error.message);
      }

      const orderStatus = response.data.order.status;
      setOrderFeedback({
        type: "success",
        message: `${submitButtonLabel} order placed successfully.`,
        orderId: response.data.order.orderId,
        status: orderStatus,
      });

      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["positions"] });
      void queryClient.invalidateQueries({ queryKey: ["positions-sell"] });
      void queryClient.invalidateQueries({ queryKey: ["holdings-live-quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["balances-buying-power"] });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Order submission failed.";
      setOrderFeedback({
        type: "error",
        message,
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (!selectedInstrument) {
    return (
      <div className="mx-auto w-full max-w-md pb-10">
        <div className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5">
          <p className="text-app-secondary text-sm">
            No instrument selected. Open Sell from an instrument page.
          </p>
        </div>
      </div>
    );
  }

  if (orderFeedback?.type === "success") {
    return (
      <div className="mx-auto w-full max-w-md pb-10">
        <section className="border-app bg-surface-1 rounded-2xl border p-5 shadow-sm @md:p-6">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-2xl">✅</span>
            <h2 className="text-app-primary text-lg font-semibold">
              Order placed successfully
            </h2>
            <p className="text-app-secondary text-sm">
              Your {submitButtonLabel} order for{" "}
              <span className="text-app-primary font-semibold">
                {selectedInstrument.symbol}
              </span>{" "}
              has been submitted.
            </p>
            <div className="border-app bg-surface-2 mt-2 w-full rounded-lg border px-4 py-3 text-left">
              <p className="text-app-muted text-xs uppercase tracking-[0.12em]">
                Order ID
              </p>
              <p className="text-app-primary mt-1 break-all font-mono text-sm">
                {orderFeedback.orderId}
              </p>
              <p className="text-app-muted mt-3 text-xs uppercase tracking-[0.12em]">
                Status
              </p>
              <p className="text-app-primary mt-1 text-sm font-semibold">
                {orderFeedback.status}
              </p>
            </div>
            <div className="mt-4 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrderFeedback(null);
                  setAmountInput("");
                }}
                className="border-app bg-surface-2 text-app-primary rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
              >
                Place another order
              </button>
              <Link
                href="/"
                className="bg-app-accent text-app-accent-contrast inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md pb-10">
      <form
        onSubmit={handleSubmit}
        className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="border-app bg-surface-2 text-app-primary inline-flex h-8 w-8 items-center justify-center rounded-md border"
              aria-label="Back to dashboard"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18L9 12L15 6" />
              </svg>
            </Link>
            <h2 className="text-app-primary text-base font-semibold">
              {displayTitle}
            </h2>
          </div>
          <span className="text-app-muted text-xs">{resolvedAssetClass}</span>
        </div>

        <div className="border-app bg-surface-2 mb-4 rounded-lg border px-3 py-2.5">
          <p className="text-app-muted text-xs uppercase tracking-[0.08em]">
            Invested balance
          </p>
          {isPositionsLoading ? (
            <p className="text-app-secondary mt-1 text-sm">Loading...</p>
          ) : (
            <p className="text-app-primary mt-1 text-sm font-semibold">
              {formatCurrency(investedBalance)}
            </p>
          )}
        </div>

        <div className="border-app bg-surface-2 mb-4 rounded-lg border px-3 py-2.5">
          <p className="text-app-muted text-xs uppercase tracking-[0.08em]">
            Current price
          </p>
          {isQuoteLoading ? (
            <p className="text-app-secondary mt-1 text-sm">Loading...</p>
          ) : isEventContract ? (
            <div className="mt-1 flex items-center gap-4">
              <p className="text-sm">
                <span className="text-app-muted">Yes</span>{" "}
                <span className="text-positive font-semibold">
                  {formatCurrency(eventYesPrice)}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-app-muted">No</span>{" "}
                <span className="text-negative font-semibold">
                  {formatCurrency(eventNoPrice)}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-app-primary mt-1 text-sm font-semibold">
              {formatCurrency(quotePrice)}
            </p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-app-muted mb-2 text-xs uppercase tracking-[0.08em]">
            Order type
          </p>
          <div className="flex flex-wrap gap-2">
            {ORDER_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  if (type.enabled) {
                    setComingSoonMessage(null);
                    setOrderType(type.id);
                  } else {
                    setComingSoonMessage(
                      `${type.label} orders are coming soon.`,
                    );
                  }
                }}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  type.id === orderType
                    ? "bg-app-accent text-app-accent-contrast border-transparent"
                    : "border-app bg-surface-2 text-app-primary hover:opacity-90"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          {comingSoonMessage ? (
            <p className="text-app-muted mt-2 text-xs">{comingSoonMessage}</p>
          ) : null}
        </div>

        <div className="border-app-soft border-t pt-4">
          <label
            htmlFor="sell-amount"
            className="text-app-primary block text-sm font-semibold"
          >
            How much?
          </label>
          <div
            className={`bg-surface-1 mt-2 flex items-center rounded-lg border px-3 ${
              exceedsInvestedBalance ? "border-negative" : "border-app"
            }`}
          >
            <span className="text-app-secondary mr-1 text-lg font-semibold">
              $
            </span>
            <input
              id="sell-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) =>
                setAmountInput(sanitizeAmountInput(event.target.value))
              }
              placeholder="10"
              className="text-app-primary placeholder:text-app-muted h-10 w-full bg-transparent text-lg font-semibold outline-none"
            />
          </div>

          {exceedsInvestedBalance ? (
            <p className="text-negative mt-1.5 text-xs">
              Amount exceeds your invested balance of{" "}
              {formatCurrency(investedBalance)}.
            </p>
          ) : null}
        </div>

        {isEventContract ? (
          <div className="border-app-soft mt-4 border-t pt-4">
            <div className="border-app bg-surface-2 inline-flex w-full rounded-lg border p-1">
              {(["YES", "NO"] as const).map((side) => {
                const isSelected = side === eventSide;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setEventSide(side)}
                    className={`w-1/2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "bg-app-accent text-app-accent-contrast"
                        : "text-app-secondary hover:opacity-90"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {side}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="border-app-soft mt-4 border-t pt-4">
          <p className="text-app-primary text-sm font-semibold">
            You sell (est.)
          </p>
          <div className="border-app bg-surface-2 mt-2 rounded-lg border px-3 py-3">
            {isEventContract ? (
              <p className="text-app-primary text-sm font-semibold">
                Estimated {formatUnits(estimatedContractsToSell)} contracts at{" "}
                {eventSide}
              </p>
            ) : (
              <p className="text-app-primary text-sm font-semibold">
                {formatUnits(estimatedUnitsToSell)}{" "}
                {toCryptoBaseAsset(selectedInstrument.symbol)}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isSubmittingOrder}
          className={`mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
            canSubmit && !isSubmittingOrder
              ? "bg-app-accent text-app-accent-contrast hover:opacity-90"
              : "bg-app-accent text-app-accent-contrast cursor-not-allowed opacity-40"
          }`}
        >
          {isSubmittingOrder ? "Submitting..." : submitButtonLabel}
        </button>

        {orderFeedback?.type === "error" ? (
          <div className="border-negative bg-negative/10 mt-3 rounded-lg border px-3 py-2.5">
            <p className="text-negative text-sm font-semibold">Order failed</p>
            <p className="text-negative mt-1 text-xs">
              {orderFeedback.message}
            </p>
          </div>
        ) : null}
      </form>
    </div>
  );
}

function SellPageFallback() {
  return (
    <div className="mx-auto w-full max-w-md pb-10">
      <div className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5">
        <p className="text-app-secondary text-sm">Loading sell experience...</p>
      </div>
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<SellPageFallback />}>
      <SellPageContent />
    </Suspense>
  );
}
