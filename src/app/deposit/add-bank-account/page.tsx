"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import type {
  ApiResponse,
  CreatePaymentAccountPayload,
  CreatePaymentAccountRequestPayload,
} from "@/types/api";

const DASHBOARD_CLIENT_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "31f44327-82c4-4e7f-a6c5-362c230243b1";
const ACCOUNT_TYPES = ["CHECKING", "SAVINGS"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

export default function LinkBankAccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("CHECKING");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [bankIdentifier, setBankIdentifier] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      router.push("/deposit");
    },
    onError: (error) => {
      setResultMessage(error instanceof Error ? error.message : "Unable to link bank account.");
    },
  });

  const isDisabled =
    !accountHolderName.trim() ||
    !accountNumber.trim() ||
    !bankName.trim() ||
    !bankAddress.trim() ||
    !bankIdentifier.trim() ||
    createMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResultMessage(null);
    if (isDisabled) return;

    createMutation.mutate({
      data: {
        clientId: DASHBOARD_CLIENT_ID,
        currency: "USD",
        country: "USA",
        details: {
          type: "BANK_ACCOUNT",
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          accountType,
          bankName: bankName.trim(),
          bankAddress: bankAddress.trim(),
          bankIdentifierType: "ABA_ROUTING",
          bankIdentifier: bankIdentifier.trim(),
        },
      },
    });
  };

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
        <p className="text-app-secondary mt-1 text-sm">Link a new payment account.</p>

        <label htmlFor="account-holder-name" className="text-app-primary mt-4 block text-sm font-semibold">
          Account holder name
        </label>
        <input
          id="account-holder-name"
          value={accountHolderName}
          onChange={(event) => setAccountHolderName(event.target.value)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label htmlFor="account-number" className="text-app-primary mt-4 block text-sm font-semibold">
          Account number
        </label>
        <input
          id="account-number"
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label htmlFor="account-type" className="text-app-primary mt-4 block text-sm font-semibold">
          Account type
        </label>
        <select
          id="account-type"
          value={accountType}
          onChange={(event) => setAccountType(event.target.value as AccountType)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label htmlFor="bank-name" className="text-app-primary mt-4 block text-sm font-semibold">
          Bank name
        </label>
        <input
          id="bank-name"
          value={bankName}
          onChange={(event) => setBankName(event.target.value)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label htmlFor="bank-address" className="text-app-primary mt-4 block text-sm font-semibold">
          Bank address
        </label>
        <input
          id="bank-address"
          value={bankAddress}
          onChange={(event) => setBankAddress(event.target.value)}
          className="border-app bg-surface-2 text-app-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label htmlFor="bank-identifier" className="text-app-primary mt-4 block text-sm font-semibold">
          Bank identifier
        </label>
        <input
          id="bank-identifier"
          value={bankIdentifier}
          onChange={(event) => setBankIdentifier(event.target.value)}
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

        {resultMessage ? <p className="text-negative mt-2 text-xs">{resultMessage}</p> : null}
      </form>
    </div>
  );
}
