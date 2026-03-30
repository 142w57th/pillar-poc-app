"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import { ApiResponse, InstrumentsCatalogPayload, QuotePayload, SubmitOrderPayload } from "@/types/api";

type AssetClass = "Equity" | "Crypto" | "Event Contract";
type EventSide = "YES" | "NO";
type OrderType = "market" | "limit" | "stop" | "stop-limit";

const ORDER_TYPES: { id: OrderType; label: string; enabled: boolean }[] = [
  { id: "market", label: "Market", enabled: true },
  { id: "limit", label: "Limit", enabled: false },
  { id: "stop", label: "Stop", enabled: false },
  { id: "stop-limit", label: "Stop Limit", enabled: false },
];
const DASHBOARD_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "31f44327-82c4-4e7f-a6c5-362c230243b1";

type OrderInstrument = {
  id: string;
  title: string;
  symbol: string;
  assetClass: AssetClass;
};

const FALLBACK_INVESTED_BALANCE = 0;

function toOrderAssetClass(value: string): AssetClass | null {
  if (value === "Equity" || value === "Crypto" || value === "Event Contract") {
    return value;
  }

  return null;
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
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
  if (symbol.includes("/")) {
    return symbol;
  }

  if (symbol.endsWith("USD") && symbol.length > 3) {
    const base = symbol.slice(0, -3);
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

export default function SellPage() {
  const searchParams = useSearchParams();
  const symbolFromUrl = searchParams.get("symbol");

  const [orderType, setOrderType] = useState<OrderType>("market");
  const [comingSoonMessage, setComingSoonMessage] = useState<string | null>(null);
  const [eventSide, setEventSide] = useState<EventSide>("YES");
  const [amountInput, setAmountInput] = useState("0");
  const [lastPreviewMessage, setLastPreviewMessage] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  const { data: instrumentsData, isLoading: isInstrumentsLoading, isError: isInstrumentsError } = useQuery({
    queryKey: ["instruments-catalog-sell"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<InstrumentsCatalogPayload>>("/api/v1/instruments");
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    staleTime: 60_000,
  });

  const orderInstruments = useMemo<OrderInstrument[]>(() => {
    const instruments = instrumentsData?.instruments ?? [];

    return instruments.reduce<OrderInstrument[]>((result, instrument) => {
      const assetClass = toOrderAssetClass(instrument.assetClass);
      if (!assetClass) {
        return result;
      }

      result.push({
        id: `catalog-${instrument.symbol}`,
        title:
          assetClass === "Crypto"
            ? toCryptoPairLabel(instrument.symbol)
            : assetClass === "Event Contract"
              ? instrument.name
              : instrument.symbol,
        symbol: instrument.symbol,
        assetClass,
      });
      return result;
    }, []);
  }, [instrumentsData]);

  const selectedInstrument = useMemo(() => {
    if (!symbolFromUrl) {
      return orderInstruments[0];
    }

    return (
      orderInstruments.find((instrument) => instrument.symbol.toUpperCase() === symbolFromUrl.toUpperCase()) ??
      orderInstruments[0]
    );
  }, [orderInstruments, symbolFromUrl]);

  const { data: quoteData, isLoading: isQuoteLoading } = useQuery({
    queryKey: ["quote-sell", selectedInstrument?.symbol],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<QuotePayload>>(
        `/api/v1/quotes?symbol=${encodeURIComponent(selectedInstrument!.symbol)}`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    staleTime: 30_000,
    enabled: !!selectedInstrument?.symbol,
  });

  const investedBalance = quoteData?.quote.position?.invested ?? FALLBACK_INVESTED_BALANCE;
  const quotePrice = quoteData?.quote.price ?? 0;
  const eventYesPrice = quoteData?.quote.eventPricing?.yesPrice ?? 0;
  const eventNoPrice = quoteData?.quote.eventPricing?.noPrice ?? 0;

  const amount = useMemo(() => parseAmount(amountInput), [amountInput]);
  const isEventContract = selectedInstrument?.assetClass === "Event Contract";

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

    setSubmitErrorMessage(null);
    setIsSubmittingOrder(true);

    try {
      const pricePerUnit = isEventContract ? (eventSidePrice ?? 0) : quotePrice;
      if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
        throw new Error("Current market price is unavailable. Please try again.");
      }

      const response = await apiFetch<ApiResponse<SubmitOrderPayload>>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          userId: DASHBOARD_USER_ID,
          instrumentSymbol: selectedInstrument.symbol,
          assetClass: selectedInstrument.assetClass,
          side: "SELL",
          amountUsd: amount,
          pricePerUnit,
          eventSide: isEventContract ? eventSide : undefined,
        }),
      });

      if (!response.success) {
        throw new Error(response.error.message);
      }

      const orderStatus = response.data.order.status.toUpperCase();
      setLastPreviewMessage(`Order submitted (${submitButtonLabel}) - status: ${orderStatus}.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Order submission failed.";
      setSubmitErrorMessage(message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (!selectedInstrument) {
    return (
      <div className="mx-auto w-full max-w-md pb-10">
        <div className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5">
          <p className="text-app-secondary text-sm">
            {isInstrumentsLoading ? "Loading instruments..." : "Unable to load instruments for sell entry."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md pb-10">
      <form onSubmit={handleSubmit} className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5">
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
            <h2 className="text-app-primary text-base font-semibold">{selectedInstrument.title}</h2>
          </div>
          <span className="text-app-muted text-xs">{selectedInstrument.assetClass}</span>
        </div>
        {isInstrumentsLoading ? <p className="text-app-secondary mb-3 text-xs">Loading market instruments...</p> : null}
        {isInstrumentsError ? (
          <p className="text-negative mb-3 text-xs">Instrument API unavailable.</p>
        ) : null}

        <div className="border-app bg-surface-2 mb-4 rounded-lg border px-3 py-2.5">
          <p className="text-app-muted text-xs uppercase tracking-[0.08em]">Invested balance</p>
          <p className="text-app-primary mt-1 text-sm font-semibold">{formatCurrency(investedBalance)}</p>
        </div>

        <div className="border-app bg-surface-2 mb-4 rounded-lg border px-3 py-2.5">
          <p className="text-app-muted text-xs uppercase tracking-[0.08em]">Current price</p>
          {isQuoteLoading ? (
            <p className="text-app-secondary mt-1 text-sm">Loading...</p>
          ) : isEventContract ? (
            <div className="mt-1 flex items-center gap-4">
              <p className="text-sm">
                <span className="text-app-muted">Yes</span>{" "}
                <span className="text-positive font-semibold">{formatCurrency(eventYesPrice)}</span>
              </p>
              <p className="text-sm">
                <span className="text-app-muted">No</span>{" "}
                <span className="text-negative font-semibold">{formatCurrency(eventNoPrice)}</span>
              </p>
            </div>
          ) : (
            <p className="text-app-primary mt-1 text-sm font-semibold">{formatCurrency(quotePrice)}</p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-app-muted mb-2 text-xs uppercase tracking-[0.08em]">Order type</p>
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
                    setComingSoonMessage(`${type.label} orders are coming soon.`);
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
          <label htmlFor="sell-amount" className="text-app-primary block text-sm font-semibold">
            How much?
          </label>
          <div
            className={`bg-surface-1 mt-2 flex items-center rounded-lg border px-3 ${
              exceedsInvestedBalance ? "border-negative" : "border-app"
            }`}
          >
            <span className="text-app-secondary mr-1 text-lg font-semibold">$</span>
            <input
              id="sell-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0"
              className="text-app-primary placeholder:text-app-muted h-10 w-full bg-transparent text-lg font-semibold outline-none"
            />
          </div>

          {exceedsInvestedBalance ? (
            <p className="text-negative mt-1.5 text-xs">
              Amount exceeds your invested balance of {formatCurrency(investedBalance)}.
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
          <p className="text-app-primary text-sm font-semibold">You sell (est.)</p>
          <div className="border-app bg-surface-2 mt-2 rounded-lg border px-3 py-3">
            {isEventContract ? (
              <p className="text-app-primary text-sm font-semibold">
                Estimated {formatUnits(estimatedContractsToSell)} contracts at {eventSide}
              </p>
            ) : (
              <p className="text-app-primary text-sm font-semibold">
                {formatUnits(estimatedUnitsToSell)} {toCryptoBaseAsset(selectedInstrument.symbol)}
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

        {lastPreviewMessage ? <p className="text-app-secondary mt-2 text-xs">{lastPreviewMessage}</p> : null}
        {submitErrorMessage ? <p className="text-negative mt-2 text-xs">{submitErrorMessage}</p> : null}
      </form>
    </div>
  );
}
