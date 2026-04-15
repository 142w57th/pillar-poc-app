"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { apiFetch } from "@/lib/api-client";
import { ApiResponse, DashboardPayload } from "@/types/api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function SectionSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="border-app bg-surface-2 mt-3 flex items-center justify-center gap-2 rounded-xl border px-4 py-8">
      <span className="border-app-secondary/40 border-t-app-secondary inline-block h-4 w-4 animate-spin rounded-full border-2" />
      <span className="text-app-secondary text-sm">{label}</span>
    </div>
  );
}

export default function TransferPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<DashboardPayload>>("/api/v1/dashboard");

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    staleTime: 60_000,
  });

  const buyingPower = data?.aggregated.buyingPower ?? 0;
  const cashAvailableForWithdrawal = data?.aggregated.cashAvailableForWithdrawal ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-10">
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
          <h1 className="text-app-primary min-w-0 truncate text-sm font-semibold">Transfer funds</h1>
        </header>
      </section>

      <section className="border-app bg-surface-1 rounded-2xl border p-5 shadow-sm @md:p-6">
        <h2 className="text-app-primary text-xl font-semibold">Transfer</h2>
        <p className="text-app-secondary mt-1 text-sm">Move money in or out of your account.</p>

        {isError ? <p className="text-negative mt-4 text-sm">Unable to load balances right now.</p> : null}

        {isLoading ? (
          <SectionSpinner label="Loading balances..." />
        ) : (
          <div className="mt-4 space-y-3">
            <article className="border-app bg-surface-2 rounded-xl border p-4">
              <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Buying Power</p>
              <p className="text-app-primary mt-1 text-lg font-semibold">{formatCurrency(buyingPower)}</p>
            </article>

            <article className="border-app bg-surface-2 rounded-xl border p-4">
              <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Cash Available for Withdrawal</p>
              <p className="text-app-primary mt-1 text-lg font-semibold">{formatCurrency(cashAvailableForWithdrawal)}</p>
            </article>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 @sm:grid-cols-2">
          <Link
            href="/deposit"
            className="bg-app-accent text-app-accent-contrast inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90"
          >
            Deposit
          </Link>
          <Link
            href="/withdraw"
            className="border-app bg-surface-1 text-app-primary inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90"
          >
            Withdraw
          </Link>
        </div>
      </section>
    </div>
  );
}
