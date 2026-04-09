"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import type {
  ApiResponse,
  CreatePaymentAccountPayload,
  CreatePaymentAccountRequestPayload,
} from "@/types/api";

export default function LinkBankAccountPage() {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = useState("");
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [createdPaymentAccount, setCreatedPaymentAccount] = useState<{
    paymentAccountId: string;
    status: string;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: async (payload: CreatePaymentAccountRequestPayload) => {
      const response = await apiFetch<ApiResponse<CreatePaymentAccountPayload>>("/api/v1/payments/payment-accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      setCreatedPaymentAccount({
        paymentAccountId: payload.data.paymentAccountId,
        status: payload.data.status,
      });
      setSubmitErrorMessage(null);
      setBankName("");
    },
    onError: (error) => {
      setSubmitErrorMessage(error instanceof Error ? error.message : "Unable to link bank account.");
    },
  });

  const isDisabled = !bankName.trim() || createMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitErrorMessage(null);
    if (isDisabled) return;

    createMutation.mutate({
      data: {
        currency: "USD",
        country: "USA",
        details: {
          type: "BANK_ACCOUNT",
          bankName: bankName.trim(),
        },
      },
      meta: {},
    });
  };

  if (createdPaymentAccount) {
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
          <h2 className="text-app-primary mt-4 text-xl font-semibold">Bank account linked successfully</h2>
          <p className="text-app-secondary mt-2 text-sm">
            Payment Account ID: {createdPaymentAccount.paymentAccountId}
          </p>
          <p className="text-app-secondary mt-1 text-sm">Status: {createdPaymentAccount.status}</p>
          <Link
            href="/deposit"
            className="bg-app-accent text-app-accent-contrast mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition hover:opacity-90"
          >
            Return to Deposit
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
            href="/deposit"
            className="text-app-primary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-surface-2"
            aria-label="Back to deposit"
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
          <h1 className="text-app-primary min-w-0 truncate text-sm font-semibold">Link bank account</h1>
        </header>
      </section>

      <form onSubmit={handleSubmit} className="border-app bg-surface-1 rounded-2xl border p-4 shadow-sm @md:p-5">
        <h2 className="text-app-primary text-xl font-semibold">Bank details</h2>
        <p className="text-app-secondary mt-1 text-sm">Link a new payment account with bank name only.</p>

        <label htmlFor="bank-name" className="text-app-primary mt-4 block text-sm font-semibold">
          Bank name
        </label>
        <input
          id="bank-name"
          value={bankName}
          onChange={(event) => setBankName(event.target.value)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <button
          type="submit"
          disabled={isDisabled}
          className={`mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
            isDisabled
              ? "bg-app-accent text-app-accent-contrast cursor-not-allowed opacity-40"
              : "bg-app-accent text-app-accent-contrast hover:opacity-90"
          }`}
        >
          {createMutation.isPending ? "Submitting..." : "Submit"}
        </button>

        {submitErrorMessage ? <p className="text-negative mt-2 text-xs">{submitErrorMessage}</p> : null}
      </form>

    </div>
  );
}
