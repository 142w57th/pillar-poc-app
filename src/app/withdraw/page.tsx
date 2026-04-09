"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type {
  ApiResponse,
  DashboardPayload,
  DestinationAccountsPayload,
  PaymentAccountsPayload,
  SubmitDepositPayload,
  SubmitDepositRequestPayload,
} from "@/types/api";

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

function formatAccountTypeLabel(value: string) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatAccountSelectLabel(accountType: string, accountId: string) {
  const suffix = accountId.slice(-3);
  return `${formatAccountTypeLabel(accountType)} •••${suffix}`;
}

export default function WithdrawPage() {
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationPaymentAccountId, setDestinationPaymentAccountId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState(0);
  const [lastResultMessage, setLastResultMessage] = useState<string | null>(null);
  const [lastResultTone, setLastResultTone] = useState<"neutral" | "positive" | "negative">("neutral");

  const amountUsd = useMemo(() => parseAmount(amountInput), [amountInput]);

  const {
    data: destinationData,
    isLoading: isDestinationLoading,
    isError: isDestinationError,
  } = useQuery({
    queryKey: ["withdraw-destination-accounts"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<DestinationAccountsPayload>>("/api/v1/payments/destination-accounts");
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 60_000,
  });

  const {
    data: paymentAccountsData,
    isLoading: isPaymentAccountsLoading,
    isError: isPaymentAccountsError,
  } = useQuery({
    queryKey: ["withdraw-payment-accounts"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<PaymentAccountsPayload>>("/api/v1/payments/payment-accounts?type=BANK_ACCOUNT");
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
  const linkedPaymentAccounts = (paymentAccountsData?.data ?? []).filter((account) => account.status === "LINKED");
  const hasLinkedPaymentAccounts = linkedPaymentAccounts.length > 0;
  const effectiveSourceAccountId =
    accounts.find((account) => account.accountId === sourceAccountId)?.accountId ?? accounts[0]?.accountId ?? "";
  const effectiveDestinationPaymentAccountId =
    linkedPaymentAccounts.find((account) => account.paymentAccountId === destinationPaymentAccountId)?.paymentAccountId ??
    linkedPaymentAccounts[0]?.paymentAccountId ??
    "";

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
  } = useQuery({
    queryKey: ["dashboard-for-withdraw"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<DashboardPayload>>("/api/v1/dashboard");
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    enabled: hasAccounts,
    staleTime: 60_000,
  });
  const selectedAccountDetails =
    dashboardData?.accounts.find((account) => account.accountId === effectiveSourceAccountId) ?? null;
  const selectedPaymentAccount =
    linkedPaymentAccounts.find((account) => account.paymentAccountId === effectiveDestinationPaymentAccountId) ??
    null;

  const withdrawMutation = useMutation({
    mutationFn: async (payload: SubmitDepositRequestPayload) => {
      const response = await apiFetch<ApiResponse<SubmitDepositPayload>>("/api/v1/payments/deposits", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: (data) => {
      setIsSubmitSuccess(true);
      setSubmittedAmount(data.deposit.amountUsd);
      setLastResultTone("positive");
      setLastResultMessage(`Withdrawal submitted (${data.deposit.status}) for ${formatCurrency(data.deposit.amountUsd)}.`);
      setAmountInput("");
    },
    onError: (error) => {
      setLastResultTone("negative");
      setLastResultMessage(error instanceof Error ? error.message : "Unable to submit withdrawal right now.");
    },
  });

  const availableForWithdrawal = selectedAccountDetails?.cashAvailableForWithdrawal ?? 0;

  const isAmountTooHigh = amountUsd > availableForWithdrawal;
  const isAmountInvalid = amountUsd <= 0;
  const shouldShowAmountError = amountInput.trim().length > 0 && isAmountInvalid;
  const isSubmitDisabled =
    !hasAccounts ||
    !effectiveSourceAccountId ||
    !hasLinkedPaymentAccounts ||
    !effectiveDestinationPaymentAccountId ||
    isAmountInvalid ||
    isAmountTooHigh ||
    isDestinationLoading ||
    isDashboardLoading ||
    isPaymentAccountsLoading ||
    withdrawMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLastResultTone("neutral");
    setLastResultMessage(null);

    if (isSubmitDisabled) {
      return;
    }

    withdrawMutation.mutate({
      direction: "WITHDRAW",
      sourcePaymentAccountId: effectiveDestinationPaymentAccountId,
      destinationAccountId: effectiveSourceAccountId,
      amountUsd,
    });
  };

  if (isSubmitSuccess) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-10">
        <section className="border-app bg-surface-1 rounded-2xl border p-5 text-center shadow-sm @md:p-6">
          <div className="bg-positive/15 text-positive mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17L4 12" />
            </svg>
          </div>
          <h2 className="text-app-primary mt-4 text-xl font-semibold">Withdrawal submitted</h2>
          <p className="text-app-secondary mt-2 text-sm">
            Your withdrawal request for {formatCurrency(submittedAmount)} has been submitted successfully.
          </p>
          <Link
            href="/transfer"
            className="bg-app-accent text-app-accent-contrast mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition hover:opacity-90"
          >
            Return to Transfer
          </Link>
        </section>
      </div>
    );
  }

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
        {isDashboardLoading ? (
          <p className="text-app-secondary mt-2 text-sm">Loading selected account balance...</p>
        ) : null}
        {isDashboardError ? (
          <p className="text-negative mt-2 text-sm">Unable to load selected account balance right now.</p>
        ) : null}

        <label htmlFor="withdraw-source-account" className="text-app-primary mt-2 block text-sm font-semibold">
          Account
        </label>
        <select
          id="withdraw-source-account"
          value={effectiveSourceAccountId}
          onChange={(event) => setSourceAccountId(event.target.value)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
          disabled={!hasAccounts}
        >
          <option value="">Select source account</option>
          {accounts.map((account) => (
            <option key={account.accountId} value={account.accountId}>
              {formatAccountSelectLabel(account.accountType, account.accountId)}
            </option>
          ))}
        </select>

        <p className="text-app-secondary mt-2 text-xs">
          Available for withdrawal: <span className="text-app-primary font-semibold">{formatCurrency(availableForWithdrawal)}</span>
        </p>

        <div className="mt-4">
          <label htmlFor="withdraw-amount" className="text-app-primary block text-sm font-semibold">
            Withdraw amount
          </label>
          <div
            className={`mt-2 flex items-center rounded-lg border px-3 ${
              shouldShowAmountError || isAmountTooHigh ? "border-negative" : "border-app"
            }`}
          >
            <span className="text-app-secondary mr-1 text-lg font-semibold">$</span>
            <input
              id="withdraw-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(sanitizeAmountInput(event.target.value))}
              placeholder="0.00"
              className="text-app-primary placeholder:text-app-muted h-10 w-full bg-transparent text-lg font-semibold outline-none"
            />
          </div>
          {shouldShowAmountError ? <p className="text-negative mt-1.5 text-xs">Enter an amount greater than $0.00.</p> : null}
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
          {withdrawMutation.isPending ? "Submitting..." : "Continue Withdrawal"}
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
        <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Withdraw to</p>

        {isPaymentAccountsLoading ? <p className="text-app-secondary mt-2 text-sm">Loading payment accounts...</p> : null}
        {isPaymentAccountsError ? (
          <p className="text-negative mt-2 text-sm">Unable to load payment accounts right now.</p>
        ) : null}

        {!isPaymentAccountsLoading && !isPaymentAccountsError && !hasLinkedPaymentAccounts ? (
          <p className="text-app-secondary mt-2 text-sm">No linked payment account is available yet.</p>
        ) : null}

        {hasLinkedPaymentAccounts ? (
          <div className="mt-2 space-y-2">
            {linkedPaymentAccounts.map((account) => (
              <article
                key={account.paymentAccountId}
                onClick={() => setDestinationPaymentAccountId(account.paymentAccountId)}
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  effectiveDestinationPaymentAccountId === account.paymentAccountId
                    ? "border-app-accent bg-surface-3"
                    : "border-app bg-surface-2"
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setDestinationPaymentAccountId(account.paymentAccountId);
                  }
                }}
              >
                <p className="text-app-primary text-sm font-semibold">{account.details.bankName ?? "Bank account"}</p>
                <p className="text-app-secondary mt-1 text-xs">Status: {account.status.replaceAll("_", " ")}</p>
                <p className="text-app-muted mt-1 text-xs">Payment account ID: {account.paymentAccountId}</p>
                <p className="text-app-muted mt-1 text-xs">
                  {effectiveDestinationPaymentAccountId === account.paymentAccountId ? "Selected" : "Tap to select"}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {selectedPaymentAccount ? (
          <p className="text-app-secondary mt-2 text-xs">
            Selected destination bank: {selectedPaymentAccount.details.bankName ?? "Bank account"}
          </p>
        ) : null}

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
