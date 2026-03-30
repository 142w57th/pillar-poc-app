"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type {
  ApiResponse,
  DashboardAccountsPayload,
  DestinationAccountsPayload,
  PaymentInstructionsPayload,
} from "@/types/api";

const DASHBOARD_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "31f44327-82c4-4e7f-a6c5-362c230243b1";

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

function formatAccountTypeLabel(value: string) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

type WithdrawalAccount = DashboardAccountsPayload["accounts"][number] & {
  totalCashAvailalableForWithdrawal?: number;
};

export default function WithdrawPage() {
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [lastResultMessage, setLastResultMessage] = useState<string | null>(null);
  const [lastResultTone, setLastResultTone] = useState<"neutral" | "positive" | "negative">("neutral");

  const amountUsd = useMemo(() => parseAmount(amountInput), [amountInput]);

  const {
    data: destinationData,
    isLoading: isDestinationLoading,
    isError: isDestinationError,
  } = useQuery({
    queryKey: ["withdraw-destination-accounts", DASHBOARD_USER_ID],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<DestinationAccountsPayload>>(
        `/api/v1/payments/destination-accounts?userId=${encodeURIComponent(DASHBOARD_USER_ID)}`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 60_000,
  });

  const {
    data: instructionsData,
    isLoading: isInstructionsLoading,
    isError: isInstructionsError,
  } = useQuery({
    queryKey: ["payment-instructions"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<PaymentInstructionsPayload>>("/api/v1/payments/payment-instructions");
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 60_000,
  });

  const linkedAccounts = destinationData?.accounts ?? [];
  const accounts = linkedAccounts.map((account) => ({
    accountType: account.accountType,
    accountId: account.externalAccountId,
  }));
  const hasAccounts = accounts.length > 0;
  const destinationAccount = instructionsData?.accounts[0];

  useEffect(() => {
    if (hasAccounts && !sourceAccountId) {
      setSourceAccountId(accounts[0].accountId);
    }
  }, [accounts, hasAccounts, sourceAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.accountId === sourceAccountId) as WithdrawalAccount | undefined,
    [accounts, sourceAccountId],
  );
  const {
    data: selectedAccountDetailsData,
    isLoading: isSelectedAccountLoading,
    isError: isSelectedAccountError,
  } = useQuery({
    queryKey: ["dashboard-account-balance-by-type", DASHBOARD_USER_ID, selectedAccount?.accountType],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<DashboardAccountsPayload>>(
        `/api/v1/dashboard/accounts/by-type?userId=${encodeURIComponent(DASHBOARD_USER_ID)}&accountType=${encodeURIComponent(
          selectedAccount?.accountType ?? "",
        )}`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    enabled: !!selectedAccount?.accountType,
    staleTime: 60_000,
  });
  const selectedAccountDetails = selectedAccountDetailsData?.accounts[0];

  const availableForWithdrawal =
    selectedAccountDetails?.totalCashAvailalableForWithdrawal ??
    selectedAccountDetails?.cashAvailableForWithdrawal ??
    0;

  const isAmountTooHigh = amountUsd > availableForWithdrawal;
  const isAmountInvalid = amountUsd <= 0;
  const isSubmitDisabled =
    !hasAccounts ||
    !sourceAccountId ||
    isAmountInvalid ||
    isAmountTooHigh ||
    isDestinationLoading ||
    isSelectedAccountLoading ||
    isInstructionsLoading;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLastResultTone("neutral");
    setLastResultMessage(null);

    if (isSubmitDisabled) {
      return;
    }

    setLastResultTone("positive");
    setLastResultMessage(
      `Withdrawal preview ready: ${formatCurrency(amountUsd)} from ${formatAccountTypeLabel(
        selectedAccount?.accountType ?? "selected account",
      )}.`,
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-10">
      <section className="border-app bg-surface-1 overflow-hidden rounded-2xl border shadow-sm">
        <header className="border-app-soft flex items-center gap-3 border-b px-5 py-4">
          <Link
            href="/transfer"
            className="text-app-primary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-surface-2"
            aria-label="Back to transfer"
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

      <section className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5">
        <h2 className="text-app-primary text-xl font-semibold">Withdraw</h2>
        <p className="text-app-secondary mt-1 text-sm">
          Select the account to withdraw from and enter an amount within the account limit.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5">
        <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Withdraw from</p>

        {isDestinationLoading ? <p className="text-app-secondary mt-2 text-sm">Loading accounts...</p> : null}
        {isDestinationError ? <p className="text-negative mt-2 text-sm">Unable to load accounts right now.</p> : null}
        {isSelectedAccountLoading ? (
          <p className="text-app-secondary mt-2 text-sm">Loading selected account balance...</p>
        ) : null}
        {isSelectedAccountError ? (
          <p className="text-negative mt-2 text-sm">Unable to load selected account balance right now.</p>
        ) : null}

        <label htmlFor="withdraw-source-account" className="text-app-primary mt-2 block text-sm font-semibold">
          Account
        </label>
        <select
          id="withdraw-source-account"
          value={sourceAccountId}
          onChange={(event) => setSourceAccountId(event.target.value)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
          disabled={!hasAccounts}
        >
          <option value="">Select source account</option>
          {accounts.map((account) => (
            <option key={account.accountId} value={account.accountId}>
              {formatAccountTypeLabel(account.accountType)}
            </option>
          ))}
        </select>

        <p className="text-app-secondary mt-2 text-xs">
          totalCashAvailalableForWithdrawal: <span className="text-app-primary font-semibold">{formatCurrency(availableForWithdrawal)}</span>
        </p>

        <div className="mt-4">
          <label htmlFor="withdraw-amount" className="text-app-primary block text-sm font-semibold">
            Withdraw amount
          </label>
          <div
            className={`mt-2 flex items-center rounded-lg border px-3 ${
              isAmountInvalid || isAmountTooHigh ? "border-negative" : "border-app"
            }`}
          >
            <span className="text-app-secondary mr-1 text-lg font-semibold">$</span>
            <input
              id="withdraw-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0.00"
              className="text-app-primary placeholder:text-app-muted h-10 w-full bg-transparent text-lg font-semibold outline-none"
            />
          </div>
          {isAmountInvalid ? <p className="text-negative mt-1.5 text-xs">Enter an amount greater than $0.00.</p> : null}
          {isAmountTooHigh ? (
            <p className="text-negative mt-1.5 text-xs">
              Amount cannot exceed {formatCurrency(availableForWithdrawal)} for the selected account.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
            isSubmitDisabled
              ? "bg-app-accent text-app-accent-contrast cursor-not-allowed opacity-40"
              : "bg-app-accent text-app-accent-contrast hover:opacity-90"
          }`}
        >
          Continue Withdrawal
        </button>

        {lastResultMessage ? (
          <p
            className={`mt-2 text-xs ${
              lastResultTone === "positive"
                ? "text-positive"
                : lastResultTone === "negative"
                  ? "text-negative"
                  : "text-app-secondary"
            }`}
          >
            {lastResultMessage}
          </p>
        ) : null}
      </form>

      <section className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5">
        <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Deposited to</p>

        {isInstructionsLoading ? <p className="text-app-secondary mt-2 text-sm">Loading destination account...</p> : null}
        {isInstructionsError ? (
          <p className="text-negative mt-2 text-sm">Unable to load destination account right now.</p>
        ) : null}

        {destinationAccount ? (
          <article className="border-app bg-surface-2 mt-2 rounded-xl border p-3">
            <p className="text-app-primary text-sm font-semibold">{destinationAccount.bankName}</p>
            <p className="text-app-secondary mt-1 text-xs">{destinationAccount.accountHolderName}</p>
            <p className="text-app-muted mt-1 text-xs">
              {destinationAccount.accountType.toUpperCase()} - Routing - - - -{destinationAccount.routingNumberLast4} -
              Account - - - -{destinationAccount.accountNumberLast4}
            </p>
          </article>
        ) : (
          !isInstructionsLoading &&
          !isInstructionsError && (
            <p className="text-app-secondary mt-2 text-sm">No destination account is available yet.</p>
          )
        )}

        <Link
          href="/transfer"
          className="border-app bg-surface-2 text-app-primary mt-4 inline-flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
        >
          Back to Transfer
        </Link>
      </section>
    </div>
  );
}
