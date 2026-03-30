"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import type {
  ApiResponse,
  DestinationAccountsPayload,
  PaymentInstructionsPayload,
  SubmitDepositPayload,
  SubmitDepositRequestPayload,
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

export default function DepositPage() {
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState(0);
  const [lastResultMessage, setLastResultMessage] = useState<string | null>(null);
  const [lastResultTone, setLastResultTone] = useState<"neutral" | "positive" | "negative">("neutral");

  const amountUsd = useMemo(() => parseAmount(amountInput), [amountInput]);

  const {
    data: instructionsData,
    isLoading: isInstructionsLoading,
    isError: isInstructionsError,
  } = useQuery({
    queryKey: ["payment-instructions"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<PaymentInstructionsPayload>>(
        "/api/v1/payments/payment-instructions",
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 60_000,
  });

  const {
    data: destinationData,
    isLoading: isDestinationLoading,
    isError: isDestinationError,
  } = useQuery({
    queryKey: ["deposit-destination-accounts", DASHBOARD_USER_ID],
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

  const depositMutation = useMutation({
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
      setLastResultMessage(
        `Deposit submitted (${data.deposit.status}) for ${formatCurrency(data.deposit.amountUsd)}.`,
      );
      setAmountInput("");
    },
    onError: (error) => {
      setLastResultTone("negative");
      setLastResultMessage(error instanceof Error ? error.message : "Unable to submit deposit right now.");
    },
  });

  const paymentInstructionAccounts = instructionsData?.accounts ?? [];
  const defaultSourceInstructionId = paymentInstructionAccounts[0]?.instructionId ?? "";
  const destinationAccounts = destinationData?.accounts ?? [];
  const hasInstructionAccounts = paymentInstructionAccounts.length > 0;
  const hasDestinationAccounts = destinationAccounts.length > 0;

  const isAmountInvalid = amountUsd <= 0;
  const isSubmitDisabled =
    !hasInstructionAccounts ||
    !hasDestinationAccounts ||
    !destinationAccountId ||
    isAmountInvalid ||
    depositMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLastResultMessage(null);
    setLastResultTone("neutral");

    if (isSubmitDisabled) {
      return;
    }

    depositMutation.mutate({
      userId: DASHBOARD_USER_ID,
      sourceInstructionId: defaultSourceInstructionId,
      destinationAccountId,
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
          <h2 className="text-app-primary mt-4 text-xl font-semibold">Deposit submitted</h2>
          <p className="text-app-secondary mt-2 text-sm">
            Your deposit request for {formatCurrency(submittedAmount)} has been submitted successfully.
          </p>
          <Link
            href="/"
            className="bg-app-accent text-app-accent-contrast mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition hover:opacity-90"
          >
            Return to Dashboard
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
        <h2 className="text-app-primary text-xl font-semibold">Deposit</h2>
        <p className="text-app-secondary mt-1 text-sm">Move money into your account using payment instructions.</p>

        <div className="mt-4">
          <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Transfer from</p>
          {isInstructionsLoading ? (
            <p className="text-app-secondary mt-2 text-sm">Loading payment instruction accounts...</p>
          ) : null}
          {isInstructionsError ? (
            <p className="text-negative mt-2 text-sm">Unable to load payment instruction accounts.</p>
          ) : null}

          {!isInstructionsLoading && !isInstructionsError && !hasInstructionAccounts ? (
            <p className="text-app-secondary mt-2 text-sm">
              No payment instruction accounts are available right now.
            </p>
          ) : null}

          {hasInstructionAccounts ? (
            <div className="mt-2 space-y-2">
              {paymentInstructionAccounts.map((account) => (
                <article key={account.instructionId} className="border-app bg-surface-2 rounded-xl border p-3">
                  <p className="text-app-primary text-sm font-semibold">{account.bankName}</p>
                  <p className="text-app-secondary mt-1 text-xs">{account.accountHolderName}</p>
                  <p className="text-app-muted mt-1 text-xs">
                    {account.accountType.toUpperCase()} • Routing ••••{account.routingNumberLast4} • Account ••••
                    {account.accountNumberLast4}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5"
      >
        <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Deposit to</p>

        {isDestinationLoading ? (
          <p className="text-app-secondary mt-2 text-sm">Loading destination accounts...</p>
        ) : null}
        {isDestinationError ? (
          <p className="text-negative mt-2 text-sm">Unable to load destination accounts.</p>
        ) : null}

        <label htmlFor="destination-account" className="text-app-primary mt-2 block text-sm font-semibold">
          Account
        </label>
        <select
          id="destination-account"
          value={destinationAccountId}
          onChange={(event) => setDestinationAccountId(event.target.value)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
          disabled={!hasDestinationAccounts}
        >
          <option value="">Select destination account</option>
          {destinationAccounts.map((account) => (
            <option key={account.externalAccountId} value={account.externalAccountId}>
              {account.label}
            </option>
          ))}
        </select>

        <div className="mt-4">
          <label htmlFor="deposit-amount" className="text-app-primary block text-sm font-semibold">
            Deposit amount
          </label>
          <div className={`mt-2 flex items-center rounded-lg border px-3 ${isAmountInvalid ? "border-negative" : "border-app"}`}>
            <span className="text-app-secondary mr-1 text-lg font-semibold">$</span>
            <input
              id="deposit-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0.00"
              className="text-app-primary placeholder:text-app-muted h-10 w-full bg-transparent text-lg font-semibold outline-none"
            />
          </div>
          {isAmountInvalid ? (
            <p className="text-negative mt-1.5 text-xs">Enter an amount greater than $0.00.</p>
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
          {depositMutation.isPending ? "Submitting..." : "Submit Deposit"}
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

        <p className="text-app-muted mt-3 text-xs">Bank account linking flow will be added in a later phase.</p>
      </form>
    </div>
  );
}
