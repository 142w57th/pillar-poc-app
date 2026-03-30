"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateAccountRequestPayload,
  CreateAccountResultPayload,
  OnboardingStatusPayload,
} from "@/types/api";

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "31f44327-82c4-4e7f-a6c5-362c230243b1";

const ACCOUNT_TYPE_OPTIONS = [
  {
    id: "event-contract",
    title: "I want to predict the future",
    description: "Trade event contracts on real-world outcomes with limited risk.",
    accountType: "Event Contract",
    emoji: "🔮",
  },
  {
    id: "equity",
    title: "I want to invest in stocks",
    description: "Build a portfolio of stocks and ETFs with no commissions.",
    accountType: "Equity",
    emoji: "📈",
  },
  {
    id: "crypto",
    title: "I want to trade in Crypto",
    description: "Buy and sell cryptocurrency in an individual taxable account.",
    accountType: "Crypto",
    emoji: "⚡",
  },
] as const;

type SuitabilityState = {
  employmentType: string;
  occupation: string;
  businessType: string;
  employer: string;
  businessPhone: string;
  businessAddress: string;
  liquidNetWorth: string;
  totalNetWorth: string;
  investmentObjective: string;
  riskTolerance: string;
};

type PersonalInfoState = {
  firstName: string;
  middleInitial: string;
  lastName: string;
  suffix: string;
  taxId: string;
  dateOfBirth: string;
  country: string;
  email: string;
  phone: string;
  legalAddress: string;
};

const INITIAL_PERSONAL_INFO: PersonalInfoState = {
  firstName: "",
  middleInitial: "",
  lastName: "",
  suffix: "",
  taxId: "",
  dateOfBirth: "",
  country: "United States",
  email: "",
  phone: "",
  legalAddress: "",
};

const INITIAL_SUITABILITY: SuitabilityState = {
  employmentType: "",
  occupation: "",
  businessType: "",
  employer: "",
  businessPhone: "",
  businessAddress: "",
  liquidNetWorth: "",
  totalNetWorth: "",
  investmentObjective: "",
  riskTolerance: "",
};

type StepDef = { key: string; label: string };

const FIELD_LABEL_CLASS = "text-app-muted text-xs uppercase tracking-[0.12em]";
const INPUT_CLASS =
  "border-app bg-surface-2 text-app-primary placeholder:text-app-muted w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[color:var(--accent)]";
const SELECT_CLASS = `${INPUT_CLASS} appearance-none`;

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedAccountType, setSelectedAccountType] = useState<string | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoState>(INITIAL_PERSONAL_INFO);
  const [suitability, setSuitability] = useState<SuitabilityState>(INITIAL_SUITABILITY);
  const [stepIndex, setStepIndex] = useState(0);

  const { data: onboardingStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ["onboarding-status", DEMO_USER_ID],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<OnboardingStatusPayload>>(
        `/api/v1/onboarding/status?userId=${encodeURIComponent(DEMO_USER_ID)}`,
      );
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
  });

  const openedAccountTypes = useMemo(() => {
    if (!onboardingStatus) return new Map<string, string>();
    return new Map(onboardingStatus.accounts.map((a) => [a.accountType, a.externalAccountId]));
  }, [onboardingStatus]);

  const clientOnboarded = onboardingStatus?.clientOnboarded ?? false;

  const steps: StepDef[] = useMemo(() => {
    if (clientOnboarded) {
      return [
        { key: "accountType", label: "Account Type" },
        { key: "suitability", label: "Suitability" },
      ];
    }
    return [
      { key: "accountType", label: "Account Type" },
      { key: "personalInfo", label: "Personal Info" },
      { key: "suitability", label: "Suitability" },
    ];
  }, [clientOnboarded]);

  const currentStepKey = steps[stepIndex]?.key ?? "accountType";
  const maxStepIndex = steps.length - 1;
  const progressPercent = ((stepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    if (stepIndex > maxStepIndex) {
      setStepIndex(maxStepIndex);
    }
  }, [stepIndex, maxStepIndex]);

  const canSelectAccount = useCallback(
    (accountId: string) => !openedAccountTypes.has(accountId),
    [openedAccountTypes],
  );

  const allAccountsOpened = useMemo(
    () => ACCOUNT_TYPE_OPTIONS.every((opt) => openedAccountTypes.has(opt.id)),
    [openedAccountTypes],
  );

  const createAccountMutation = useMutation({
    mutationFn: async (payload: CreateAccountRequestPayload) => {
      const response = await apiFetch<ApiResponse<CreateAccountResultPayload>>(
        "/api/v1/onboarding/accounts",
        { method: "POST", body: JSON.stringify(payload) },
      );
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const setPersonalField = <K extends keyof PersonalInfoState>(key: K, value: PersonalInfoState[K]) =>
    setPersonalInfo((c) => ({ ...c, [key]: value }));

  const setSuitabilityField = <K extends keyof SuitabilityState>(key: K, value: SuitabilityState[K]) =>
    setSuitability((c) => ({ ...c, [key]: value }));

  const goNext = () => setStepIndex((c) => Math.min(c + 1, maxStepIndex));
  const goBack = () => setStepIndex((c) => Math.max(c - 1, 0));

  const canContinueFromAccountType = selectedAccountType !== null && canSelectAccount(selectedAccountType);
  const canContinueFromPersonalInfo =
    personalInfo.firstName.trim() !== "" &&
    personalInfo.lastName.trim() !== "" &&
    personalInfo.taxId.trim() !== "" &&
    personalInfo.dateOfBirth.trim() !== "" &&
    personalInfo.email.trim() !== "" &&
    personalInfo.phone.trim() !== "";
  const canSubmitSuitability =
    suitability.employmentType !== "" &&
    suitability.investmentObjective !== "" &&
    suitability.riskTolerance !== "";

  const handleSubmit = async () => {
    if (!selectedAccountType) return;

    const payload: CreateAccountRequestPayload = {
      userId: DEMO_USER_ID,
      accountType: selectedAccountType,
      suitability: {
        employmentType: suitability.employmentType,
        occupation: suitability.occupation || undefined,
        businessType: suitability.businessType || undefined,
        employer: suitability.employer || undefined,
        businessPhone: suitability.businessPhone || undefined,
        businessAddress: suitability.businessAddress || undefined,
        liquidNetWorth: suitability.liquidNetWorth || undefined,
        totalNetWorth: suitability.totalNetWorth || undefined,
        investmentObjective: suitability.investmentObjective,
        riskTolerance: suitability.riskTolerance,
      },
    };

    if (!clientOnboarded) {
      payload.personalInfo = {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        middleInitial: personalInfo.middleInitial || undefined,
        suffix: personalInfo.suffix || undefined,
        taxId: personalInfo.taxId,
        dateOfBirth: personalInfo.dateOfBirth,
        country: personalInfo.country,
        email: personalInfo.email,
        phone: personalInfo.phone,
        legalAddress: personalInfo.legalAddress,
      };
    }

    createAccountMutation.mutate(payload);
  };

  const handleSelectAccountType = (accountId: string) => {
    if (!canSelectAccount(accountId)) return;
    setSelectedAccountType(accountId);
  };

  const isLastStep = stepIndex === maxStepIndex;
  const canContinue =
    currentStepKey === "accountType"
      ? canContinueFromAccountType
      : currentStepKey === "personalInfo"
        ? canContinueFromPersonalInfo
        : canSubmitSuitability;

  if (isStatusLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl pb-10">
        <section className="border-app bg-surface-1 rounded-3xl border p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="border-app-soft h-8 w-8 animate-spin rounded-full border-2 border-t-[color:var(--accent)]" />
            <p className="text-app-secondary text-sm">Loading onboarding status...</p>
          </div>
        </section>
      </div>
    );
  }

  if (allAccountsOpened) {
    return (
      <div className="mx-auto w-full max-w-3xl pb-10">
        <section className="border-app bg-surface-1 rounded-3xl border p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-2xl">✅</span>
            <h2 className="text-app-primary text-lg font-semibold">All accounts opened</h2>
            <p className="text-app-secondary text-sm">
              You have already opened all available account types. Head to the dashboard to manage your portfolio.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="bg-app-accent text-app-accent-contrast mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
            >
              Go to Dashboard
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (createAccountMutation.isSuccess) {
    const result = createAccountMutation.data;
    return (
      <div className="mx-auto w-full max-w-3xl pb-10">
        <section className="border-app bg-surface-1 rounded-3xl border p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-2xl">🎉</span>
            <h2 className="text-app-primary text-lg font-semibold">Account Created!</h2>
            <p className="text-app-secondary text-sm">
              Your <span className="font-semibold capitalize">{result.accountType.replace("-", " ")}</span> account has been successfully opened.
            </p>
            <div className="border-app bg-surface-2 mt-2 rounded-lg border px-4 py-3">
              <p className="text-app-muted text-xs uppercase tracking-[0.12em]">Account ID</p>
              <p className="text-app-primary mt-1 font-mono text-sm">{result.externalAccountId}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 @md:flex-row">
              <button
                type="button"
                onClick={() => {
                  createAccountMutation.reset();
                  setSelectedAccountType(null);
                  setSuitability(INITIAL_SUITABILITY);
                  setStepIndex(0);
                }}
                className="border-app bg-surface-2 text-app-primary rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
              >
                Open Another Account
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="bg-app-accent text-app-accent-contrast rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <section className="border-app bg-surface-1 rounded-3xl border shadow-sm">
        {/* Header */}
        <div className="border-app-soft border-b px-5 py-5 @md:px-7">
          <p className="text-app-muted text-xs uppercase tracking-[0.14em]">Onboarding</p>
          <h2 className="text-app-primary mt-1 text-2xl font-semibold">Open your account</h2>
          <p className="text-app-secondary mt-2 text-sm">
            Complete all {steps.length} steps to finish account onboarding.
          </p>

          {/* Progress */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-app-secondary text-sm font-medium">
                Step {stepIndex + 1} of {steps.length}
              </p>
              <p className="text-app-secondary text-sm">{steps[stepIndex]?.label}</p>
            </div>
            <div className="border-app bg-surface-2 h-2.5 rounded-full border">
              <div
                className="bg-app-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              {steps.map((item, index) => {
                const isCompleted = index < stepIndex;
                const isActive = index === stepIndex;
                return (
                  <div
                    key={item.key}
                    className={`flex-1 rounded-lg border px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] ${
                      isCompleted || isActive
                        ? "bg-app-accent text-app-accent-contrast border-transparent"
                        : "border-app bg-surface-2 text-app-muted"
                    }`}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step: Account Type */}
        {currentStepKey === "accountType" && (
          <div className="px-5 py-5 @md:px-7">
            <h3 className="text-app-primary text-lg font-semibold">Where do you want to start?</h3>
            <p className="text-app-secondary mt-1 text-sm">
              {clientOnboarded
                ? "Select a new account type to open."
                : "You can open a new account in just 5 minutes."}
            </p>

            <div className="mt-5 space-y-3">
              {ACCOUNT_TYPE_OPTIONS.map((option) => {
                const isOpened = openedAccountTypes.has(option.id);
                const isSelected = selectedAccountType === option.id;
                const externalId = openedAccountTypes.get(option.id);

                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => handleSelectAccountType(option.id)}
                    disabled={isOpened}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isOpened
                        ? "border-app bg-surface-2 cursor-not-allowed opacity-60"
                        : isSelected
                          ? "border-[color:var(--accent)] bg-surface-2 ring-1 ring-[color:var(--accent)]"
                          : "border-app bg-surface-2 hover:border-[color:var(--border-hover,var(--border))]"
                    }`}
                    aria-pressed={isSelected}
                    aria-disabled={isOpened}
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-surface-1 mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg">
                        {option.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${isOpened ? "text-app-muted" : "text-app-primary"}`}>
                            {option.title}
                          </p>
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                              isOpened
                                ? "border-positive bg-positive/15 text-positive"
                                : isSelected
                                  ? "bg-app-accent text-app-accent-contrast border-transparent"
                                  : "border-app text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </div>
                        <p className={`mt-1 text-sm ${isOpened ? "text-app-muted" : "text-app-secondary"}`}>
                          {option.description}
                        </p>
                        {isOpened && externalId && (
                          <p className="text-app-muted mt-2 font-mono text-xs">
                            Account ID: {externalId}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: Personal Info (only when client not yet onboarded) */}
        {currentStepKey === "personalInfo" && (
          <div className="px-5 py-5 @md:px-7">
            <h3 className="text-app-primary text-lg font-semibold">Personal Information</h3>
            <p className="text-app-secondary mt-1 text-sm">Tell us about yourself</p>

            <div className="mt-5 grid grid-cols-1 gap-4 @md:grid-cols-2">
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>First Name *</span>
                <input className={`${INPUT_CLASS} mt-2`} value={personalInfo.firstName} onChange={(e) => setPersonalField("firstName", e.target.value)} />
              </label>
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>M.I.</span>
                <input className={`${INPUT_CLASS} mt-2`} value={personalInfo.middleInitial} onChange={(e) => setPersonalField("middleInitial", e.target.value)} />
              </label>
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>Last Name *</span>
                <input className={`${INPUT_CLASS} mt-2`} value={personalInfo.lastName} onChange={(e) => setPersonalField("lastName", e.target.value)} />
              </label>
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>Suffix</span>
                <input className={`${INPUT_CLASS} mt-2`} placeholder="Jr., Sr...." value={personalInfo.suffix} onChange={(e) => setPersonalField("suffix", e.target.value)} />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Tax ID (SSN) *</span>
                <input className={`${INPUT_CLASS} mt-2`} value={personalInfo.taxId} onChange={(e) => setPersonalField("taxId", e.target.value)} />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Date of Birth *</span>
                <input className={`${INPUT_CLASS} mt-2`} type="date" value={personalInfo.dateOfBirth} onChange={(e) => setPersonalField("dateOfBirth", e.target.value)} />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Country of Legal Residence</span>
                <select className={`${SELECT_CLASS} mt-2`} value={personalInfo.country} onChange={(e) => setPersonalField("country", e.target.value)}>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                  <option>Australia</option>
                </select>
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Email Address *</span>
                <input className={`${INPUT_CLASS} mt-2`} type="email" value={personalInfo.email} onChange={(e) => setPersonalField("email", e.target.value)} />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Phone *</span>
                <input className={`${INPUT_CLASS} mt-2`} value={personalInfo.phone} onChange={(e) => setPersonalField("phone", e.target.value)} />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Legal Address *</span>
                <input className={`${INPUT_CLASS} mt-2`} value={personalInfo.legalAddress} onChange={(e) => setPersonalField("legalAddress", e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {/* Step: Suitability */}
        {currentStepKey === "suitability" && (
          <div className="px-5 py-5 @md:px-7">
            <h3 className="text-app-primary text-lg font-semibold">Suitability</h3>
            <p className="text-app-secondary mt-1 text-sm">Required for regulatory compliance</p>

            <div className="mt-5 grid grid-cols-1 gap-4 @md:grid-cols-2">
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Employment Type *</span>
                <select className={`${SELECT_CLASS} mt-2`} value={suitability.employmentType} onChange={(e) => setSuitabilityField("employmentType", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Employed</option>
                  <option>Self-employed</option>
                  <option>Student</option>
                  <option>Retired</option>
                  <option>Unemployed</option>
                </select>
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Occupation</span>
                <input className={`${INPUT_CLASS} mt-2`} placeholder="e.g., Software Engineer" value={suitability.occupation} onChange={(e) => setSuitabilityField("occupation", e.target.value)} />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Type of Business</span>
                <select className={`${SELECT_CLASS} mt-2`} value={suitability.businessType} onChange={(e) => setSuitabilityField("businessType", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Technology</option>
                  <option>Finance</option>
                  <option>Healthcare</option>
                  <option>Education</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Employer</span>
                <input className={`${INPUT_CLASS} mt-2`} placeholder="e.g., Acme Corporation" value={suitability.employer} onChange={(e) => setSuitabilityField("employer", e.target.value)} />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Business Phone</span>
                <input className={`${INPUT_CLASS} mt-2`} placeholder="+1 (555) 000-0000" value={suitability.businessPhone} onChange={(e) => setSuitabilityField("businessPhone", e.target.value)} />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Business Address</span>
                <input className={`${INPUT_CLASS} mt-2`} placeholder="123 Business Blvd" value={suitability.businessAddress} onChange={(e) => setSuitabilityField("businessAddress", e.target.value)} />
              </label>
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>Liquid Net Worth</span>
                <select className={`${SELECT_CLASS} mt-2`} value={suitability.liquidNetWorth} onChange={(e) => setSuitabilityField("liquidNetWorth", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Under $50,000</option>
                  <option>$50,000 - $250,000</option>
                  <option>$250,000 - $1,000,000</option>
                  <option>Above $1,000,000</option>
                </select>
              </label>
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>Total Net Worth</span>
                <select className={`${SELECT_CLASS} mt-2`} value={suitability.totalNetWorth} onChange={(e) => setSuitabilityField("totalNetWorth", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Under $100,000</option>
                  <option>$100,000 - $500,000</option>
                  <option>$500,000 - $2,000,000</option>
                  <option>Above $2,000,000</option>
                </select>
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Investment Objective *</span>
                <select className={`${SELECT_CLASS} mt-2`} value={suitability.investmentObjective} onChange={(e) => setSuitabilityField("investmentObjective", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Capital Preservation</option>
                  <option>Income</option>
                  <option>Growth</option>
                  <option>Speculation</option>
                </select>
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Risk Tolerance *</span>
                <select className={`${SELECT_CLASS} mt-2`} value={suitability.riskTolerance} onChange={(e) => setSuitabilityField("riskTolerance", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-app-soft border-t px-5 py-5 @md:px-7">
          {createAccountMutation.isError && (
            <p className="text-negative mb-3 text-sm font-medium">
              {createAccountMutation.error instanceof Error
                ? createAccountMutation.error.message
                : "Something went wrong. Please try again."}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 @md:flex-row @md:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                stepIndex === 0
                  ? "border-app bg-surface-2 text-app-muted cursor-not-allowed opacity-70"
                  : "border-app bg-surface-2 text-app-primary hover:opacity-90"
              }`}
            >
              Back
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canContinue || createAccountMutation.isPending}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  !canContinue || createAccountMutation.isPending
                    ? "border-app bg-surface-2 text-app-muted border cursor-not-allowed"
                    : "bg-app-accent text-app-accent-contrast hover:opacity-90"
                }`}
              >
                {createAccountMutation.isPending ? "Submitting..." : "Submit & Verify"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  !canContinue
                    ? "border-app bg-surface-2 text-app-muted border cursor-not-allowed"
                    : "bg-app-accent text-app-accent-contrast hover:opacity-90"
                }`}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
