"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateAccountRequestPayload,
  CreateAccountResultPayload,
  OnboardingAccountTemplatesPayload,
  OnboardingStatusPayload,
} from "@/types/api";

type AccountTypeOption = {
  id: string;
  title: string;
  description: string;
  accountType: string;
  emoji: string;
};

const ACCOUNT_TEMPLATE_UI_META: Record<string, Omit<AccountTypeOption, "id">> = {
  RETAIL_SELF_DIRECTED_STANDARD: {
    title: "I want to invest in stocks",
    description: "Build a portfolio of stocks and ETFs with no commissions.",
    accountType: "Equity",
    emoji: "📈",
  },
  DIGITAL_ASSETS_STANDARD: {
    title: "I want to trade in crypto",
    description: "Buy and sell cryptocurrency in an individual taxable account.",
    accountType: "Crypto",
    emoji: "⚡",
  },
};

function formatTemplateCodeLabel(code: string) {
  return code
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function getAccountTypeDisplayLabel(templateCode: string) {
  const known = ACCOUNT_TEMPLATE_UI_META[templateCode];
  return known?.accountType ?? formatTemplateCodeLabel(templateCode);
}

function buildAccountTypeOption(templateCode: string): AccountTypeOption | undefined {
  const known = ACCOUNT_TEMPLATE_UI_META[templateCode];
  if (known) {
    return {
      id: templateCode,
      ...known,
    };
  }
  return undefined;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhoneCountryCode(value: string) {
  return /^\+[1-9]\d{0,4}$/.test(value.trim());
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeWholeNumberInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function isValidPhoneNumber(value: string) {
  const digits = normalizeDigits(value);
  return digits.length >= 7 && digits.length <= 10;
}

function isValidSsn(value: string) {
  return normalizeDigits(value).length === 9;
}

function isValidDob(value: string) {
  if (!value) return false;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  return dob <= today;
}

type SuitabilityState = {
  employmentType: string;
  occupation: string;
  businessType: string;
  employer: string;
  businessPhone: string;
  businessPhoneCountryCode: string;
  businessPhoneNumber: string;
  businessAddress: string;
  businessRegion: string;
  businessPostalCode: string;
  annualIncome: string;
  liquidNetWorth: string;
  totalNetWorth: string;
  sourceOfFunds: string;
  sourceOfFundsItems: string[];
  timeHorizonMinYears: string;
  timeHorizonMaxYears: string;
  dividendReinvestmentInstruction: string;
  investmentObjective: string;
  investmentObjectives: string[];
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
  phoneCountryCode: string;
  phoneNumber: string;
  legalAddressLine1: string;
  legalAddressCity: string;
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
  phoneCountryCode: "+1",
  phoneNumber: "",
  legalAddressLine1: "",
  legalAddressCity: "",
};

const INITIAL_SUITABILITY: SuitabilityState = {
  employmentType: "",
  occupation: "",
  businessType: "",
  employer: "",
  businessPhone: "",
  businessPhoneCountryCode: "+1",
  businessPhoneNumber: "",
  businessAddress: "",
  businessRegion: "",
  businessPostalCode: "",
  annualIncome: "",
  liquidNetWorth: "",
  totalNetWorth: "",
  sourceOfFunds: "",
  sourceOfFundsItems: [],
  timeHorizonMinYears: "",
  timeHorizonMaxYears: "",
  dividendReinvestmentInstruction: "",
  investmentObjective: "",
  investmentObjectives: [],
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
  const onboardingFormTopRef = useRef<HTMLDivElement | null>(null);

  const [selectedAccountType, setSelectedAccountType] = useState<string | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoState>(INITIAL_PERSONAL_INFO);
  const [suitability, setSuitability] = useState<SuitabilityState>(INITIAL_SUITABILITY);
  const [stepIndex, setStepIndex] = useState(0);
  const [useRequiredPrefill, setUseRequiredPrefill] = useState(false);

  const { data: onboardingStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<OnboardingStatusPayload>>("/api/v1/onboarding/status");
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
  });

  const { data: accountTemplatesData, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["onboarding-account-templates"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<OnboardingAccountTemplatesPayload>>(
        "/api/v1/onboarding/account-templates",
      );
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
  });

  const accountTypeOptions = useMemo(
    () =>
      (accountTemplatesData?.accountTemplates ?? []).map((template) =>
        buildAccountTypeOption(template.accountTemplateCode),
      ),
    [accountTemplatesData],
  );

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

  const maxStepIndex = Math.max(steps.length - 1, 0);
  const clampedStepIndex = Math.min(stepIndex, maxStepIndex);
  const currentStepKey = steps[clampedStepIndex]?.key ?? "accountType";
  const progressPercent = ((clampedStepIndex + 1) / steps.length) * 100;

  const canSelectAccount = useCallback(
    (accountId: string) => !openedAccountTypes.has(accountId),
    [openedAccountTypes],
  );

  const allAccountsOpened = useMemo(
    () => accountTypeOptions.length > 0 && accountTypeOptions.every((opt) => opt && openedAccountTypes.has(opt.id)),
    [accountTypeOptions, openedAccountTypes],
  );
  const noSelectableAccountTypeOptions = useMemo(() => {
    const availableOptions = accountTypeOptions.filter((opt): opt is AccountTypeOption => Boolean(opt));
    if (availableOptions.length === 0) return false;
    return availableOptions.every((opt) => !canSelectAccount(opt.id));
  }, [accountTypeOptions, canSelectAccount]);
  const firstSelectableAccountType = useMemo(() => {
    const availableOptions = accountTypeOptions.filter((opt): opt is AccountTypeOption => Boolean(opt));
    return availableOptions.find((opt) => canSelectAccount(opt.id)) ?? null;
  }, [accountTypeOptions, canSelectAccount]);

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
      setUseRequiredPrefill(false);
    },
  });

  const setPersonalField = <K extends keyof PersonalInfoState>(key: K, value: PersonalInfoState[K]) =>
    setPersonalInfo((c) => ({ ...c, [key]: value }));

  const setSuitabilityField = <K extends keyof SuitabilityState>(key: K, value: SuitabilityState[K]) =>
    setSuitability((c) => ({ ...c, [key]: value }));
  const toggleSuitabilityArrayValue = (
    key: "sourceOfFundsItems" | "investmentObjectives",
    value: string,
  ) =>
    setSuitability((current) => {
      const existing = current[key];
      return {
        ...current,
        [key]: existing.includes(value)
          ? existing.filter((item) => item !== value)
          : [...existing, value],
      };
    });

  const goNext = () => {
    const shouldScrollToTop = currentStepKey === "personalInfo";
    setStepIndex((current) => Math.min(Math.min(current, maxStepIndex) + 1, maxStepIndex));
    if (shouldScrollToTop) {
      requestAnimationFrame(() => {
        onboardingFormTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };
  const goBack = () => setStepIndex((current) => Math.max(Math.min(current, maxStepIndex) - 1, 0));
  const handleRequiredPrefillToggle = (checked: boolean) => {
    setUseRequiredPrefill(checked);
    if (!checked) {
      if (!clientOnboarded) {
        setPersonalInfo({ ...INITIAL_PERSONAL_INFO });
      }
      setSuitability({ ...INITIAL_SUITABILITY });
      return;
    }

    if (firstSelectableAccountType) {
      setSelectedAccountType(firstSelectableAccountType.id);
    }

    if (!clientOnboarded) {
      setPersonalInfo((current) => ({
        ...current,
        firstName: "Alex",
        middleInitial: "D",
        suffix: "Jr.",
        lastName: "Morgan",
        taxId: "123456789",
        dateOfBirth: "2000-01-15",
        email: "alex.morgan@example.com",
        phoneCountryCode: "+1",
        phoneNumber: "4155550199",
        legalAddressLine1: "123 Market Street",
        legalAddressCity: "San Francisco",
      }));
    }

    setSuitability((current) => ({
      ...current,
      employmentType: "Employed",
      occupation: "Software Engineer",
      businessType: "Technology",
      employer: "Google",
      businessPhone: "+14155550199",
      businessPhoneCountryCode: "+1",
      businessPhoneNumber: "4155550199",
      businessAddress: "123 Market Street",
      businessRegion: "US-CA",
      businessPostalCode: "94105",
      annualIncome: "120000",
      liquidNetWorth: "50000",
      totalNetWorth: "250000",
      sourceOfFundsItems: ["Wage Income"],
      timeHorizonMinYears: "1",
      timeHorizonMaxYears: "10",
      dividendReinvestmentInstruction: "Reinvest",
      investmentObjective: "Growth",
      investmentObjectives: ["Growth"],
      riskTolerance: "Moderate",
    }));
  };

  const canContinueFromAccountType = selectedAccountType !== null && canSelectAccount(selectedAccountType);
  const personalInfoHasValidEmail = isValidEmail(personalInfo.email);
  const personalInfoHasValidPhoneCountryCode = isValidPhoneCountryCode(personalInfo.phoneCountryCode);
  const personalInfoHasValidPhoneNumber = isValidPhoneNumber(personalInfo.phoneNumber);
  const personalInfoHasValidTaxId = isValidSsn(personalInfo.taxId);
  const personalInfoHasValidDob = isValidDob(personalInfo.dateOfBirth);
  const canContinueFromPersonalInfo =
    personalInfo.firstName.trim() !== "" &&
    personalInfo.lastName.trim() !== "" &&
    personalInfoHasValidTaxId &&
    personalInfoHasValidDob &&
    personalInfoHasValidEmail &&
    personalInfoHasValidPhoneCountryCode &&
    personalInfoHasValidPhoneNumber &&
    personalInfo.legalAddressLine1.trim() !== "" &&
    personalInfo.legalAddressCity.trim() !== "";
  const requiresPartySuitability = !clientOnboarded;
  const hasAnyBusinessAddressField =
    suitability.businessAddress.trim() !== "" ||
    suitability.businessRegion.trim() !== "" ||
    suitability.businessPostalCode.trim() !== "";
  const hasCompleteBusinessAddressFields =
    suitability.businessAddress.trim() !== "" &&
    suitability.businessRegion.trim() !== "" &&
    suitability.businessPostalCode.trim() !== "";
  const isBusinessAddressSectionValid = !hasAnyBusinessAddressField || hasCompleteBusinessAddressFields;
  const canSubmitSuitability =
    (!requiresPartySuitability ||
      (suitability.employmentType !== "" &&
        suitability.annualIncome.trim() !== "" &&
        suitability.liquidNetWorth.trim() !== "" &&
        suitability.totalNetWorth.trim() !== "" &&
        isBusinessAddressSectionValid)) &&
    suitability.investmentObjectives.length > 0 &&
    suitability.sourceOfFundsItems.length > 0 &&
    suitability.riskTolerance !== "";

  const handleSubmit = async () => {
    if (!selectedAccountType) return;

    const payload: CreateAccountRequestPayload = {
      accountType: selectedAccountType,
      suitability: {
        employmentType: suitability.employmentType,
        occupation: suitability.occupation || undefined,
        businessType: suitability.businessType || undefined,
        employer: suitability.employer || undefined,
        businessPhone:
          suitability.businessPhoneCountryCode.trim() !== "" || suitability.businessPhoneNumber.trim() !== ""
            ? `${suitability.businessPhoneCountryCode.trim()} ${suitability.businessPhoneNumber.trim()}`.trim()
            : suitability.businessPhone || undefined,
        businessPhoneCountryCode: suitability.businessPhoneCountryCode || undefined,
        businessPhoneNumber: suitability.businessPhoneNumber || undefined,
        businessAddress: suitability.businessAddress || undefined,
        businessRegion: suitability.businessRegion || undefined,
        businessPostalCode: suitability.businessPostalCode || undefined,
        annualIncome: suitability.annualIncome || undefined,
        liquidNetWorth: suitability.liquidNetWorth || undefined,
        totalNetWorth: suitability.totalNetWorth || undefined,
        sourceOfFunds: suitability.sourceOfFunds || undefined,
        sourceOfFundsItems:
          suitability.sourceOfFundsItems.length > 0 ? suitability.sourceOfFundsItems : undefined,
        timeHorizonMinYears: suitability.timeHorizonMinYears || undefined,
        timeHorizonMaxYears: suitability.timeHorizonMaxYears || undefined,
        dividendReinvestmentInstruction: suitability.dividendReinvestmentInstruction || undefined,
        investmentObjective: suitability.investmentObjectives[0] || suitability.investmentObjective,
        investmentObjectives:
          suitability.investmentObjectives.length > 0 ? suitability.investmentObjectives : undefined,
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
        phone: {
          countryCode: personalInfo.phoneCountryCode,
          phoneNumber: personalInfo.phoneNumber,
        },
        legalAddress: {
          line1: personalInfo.legalAddressLine1,
          city: personalInfo.legalAddressCity,
          countryCode: personalInfo.country,
        },
      };
    }

    createAccountMutation.mutate(payload);
  };

  const handleSelectAccountType = (accountId: string) => {
    if (!canSelectAccount(accountId)) return;
    setSelectedAccountType(accountId);
  };

  const isLastStep = clampedStepIndex === maxStepIndex;
  const canContinue =
    currentStepKey === "accountType"
      ? canContinueFromAccountType
      : currentStepKey === "personalInfo"
        ? canContinueFromPersonalInfo
        : canSubmitSuitability;
  const showRequiredPrefillControl =
    selectedAccountType !== null &&
    ((currentStepKey === "personalInfo" && !clientOnboarded) ||
      (currentStepKey === "suitability" && clientOnboarded));
  const showAccountTypeDashboardCta = currentStepKey === "accountType" && noSelectableAccountTypeOptions;

  if (isStatusLoading || isTemplatesLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl pb-10">
        <section className="border-app bg-surface-1 rounded-3xl border p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3 py-12">
            <div
              className="border-app-soft h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderTopColor: "var(--accent)" }}
            />
            <p className="text-app-secondary text-sm">Loading onboarding details...</p>
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
              Your{" "}
              <span className="font-semibold">{getAccountTypeDisplayLabel(result.accountType)}</span> account has been
              successfully opened.
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
    <div ref={onboardingFormTopRef} className="mx-auto w-full max-w-3xl pb-10">
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
                Step {clampedStepIndex + 1} of {steps.length}
              </p>
              <p className="text-app-secondary text-sm">{steps[clampedStepIndex]?.label}</p>
            </div>
            <div className="border-app bg-surface-2 h-2.5 rounded-full border">
              <div
                className="bg-app-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              {steps.map((item, index) => {
                const isCompleted = index < clampedStepIndex;
                const isActive = index === clampedStepIndex;
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
              {accountTypeOptions.map((option) => {
                if (!option) return null;
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
                          ? "border-(--accent) bg-surface-2 ring-1 ring-(--accent)"
                          : "border-app bg-surface-2 hover:border-(--border-hover,var(--border))"
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
            {accountTypeOptions.length === 0 && (
              <div className="border-app bg-surface-2 mt-4 rounded-xl border p-4 text-sm">
                <p className="text-app-primary font-medium">No account templates available.</p>
                <p className="text-app-secondary mt-1">
                  Please check Harbor account template configuration and try again.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step: Personal Info (only when client not yet onboarded) */}
        {currentStepKey === "personalInfo" && (
          <div className="px-5 py-5 @md:px-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-app-primary text-lg font-semibold">Personal Information</h3>
              {showRequiredPrefillControl && (
                <label className="inline-flex items-center gap-2">
                  <span className="text-app-primary text-sm font-medium">Auto fill</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-(--accent)"
                    checked={useRequiredPrefill}
                    onChange={(e) => handleRequiredPrefillToggle(e.target.checked)}
                  />
                </label>
              )}
            </div>
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
                {personalInfo.taxId.trim() !== "" && !personalInfoHasValidTaxId && (
                  <p className="text-negative mt-1 text-xs">Enter a valid 9-digit SSN.</p>
                )}
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Date of Birth *</span>
                <input className={`${INPUT_CLASS} mt-2`} type="date" value={personalInfo.dateOfBirth} onChange={(e) => setPersonalField("dateOfBirth", e.target.value)} />
                {personalInfo.dateOfBirth.trim() !== "" && !personalInfoHasValidDob && (
                  <p className="text-negative mt-1 text-xs">Enter a valid date of birth.</p>
                )}
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
                {personalInfo.email.trim() !== "" && !personalInfoHasValidEmail && (
                  <p className="text-negative mt-1 text-xs">Enter a valid email address.</p>
                )}
              </label>
              <div className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Phone *</span>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <input
                    className={INPUT_CLASS}
                    placeholder="+1"
                    value={personalInfo.phoneCountryCode}
                    onChange={(e) => setPersonalField("phoneCountryCode", e.target.value)}
                  />
                  <input
                    className={`${INPUT_CLASS} col-span-2`}
                    placeholder="1234567890"
                    value={personalInfo.phoneNumber}
                    onChange={(e) => setPersonalField("phoneNumber", e.target.value)}
                  />
                </div>
                {personalInfo.phoneCountryCode.trim() !== "" && !personalInfoHasValidPhoneCountryCode && (
                  <p className="text-negative mt-1 text-xs">
                    Country code must be in `+1` format.
                  </p>
                )}
                {personalInfo.phoneNumber.trim() !== "" && !personalInfoHasValidPhoneNumber && (
                  <p className="text-negative mt-1 text-xs">
                    Phone number must be 7 to 10 digits.
                  </p>
                )}
              </div>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Legal Address Line 1 *</span>
                <input
                  className={`${INPUT_CLASS} mt-2`}
                  value={personalInfo.legalAddressLine1}
                  onChange={(e) => setPersonalField("legalAddressLine1", e.target.value)}
                />
              </label>
              <label className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Legal Address City *</span>
                <input
                  className={`${INPUT_CLASS} mt-2`}
                  value={personalInfo.legalAddressCity}
                  onChange={(e) => setPersonalField("legalAddressCity", e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {/* Step: Suitability */}
        {currentStepKey === "suitability" && (
          <div className="px-5 py-5 @md:px-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-app-primary text-lg font-semibold">Suitability</h3>
              {showRequiredPrefillControl && (
                <label className="inline-flex items-center gap-2">
                  <span className="text-app-primary text-sm font-medium">Auto fill</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-(--accent)"
                    checked={useRequiredPrefill}
                    onChange={(e) => handleRequiredPrefillToggle(e.target.checked)}
                  />
                </label>
              )}
            </div>
            <p className="text-app-secondary mt-1 text-sm">Required for regulatory compliance</p>

            <div className="mt-5 grid grid-cols-1 gap-4 @md:grid-cols-2">
              {requiresPartySuitability ? (
                <>
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
                  <div className="block @md:col-span-2">
                    <span className={FIELD_LABEL_CLASS}>Business Phone</span>
                    <div className="mt-2 grid grid-cols-3 gap-3">
                      <input
                        className={INPUT_CLASS}
                        placeholder="+1"
                        value={suitability.businessPhoneCountryCode}
                        onChange={(e) => setSuitabilityField("businessPhoneCountryCode", e.target.value)}
                      />
                      <input
                        className={`${INPUT_CLASS} col-span-2`}
                        placeholder="1234567890"
                        value={suitability.businessPhoneNumber}
                        onChange={(e) => setSuitabilityField("businessPhoneNumber", e.target.value)}
                      />
                    </div>
                  </div>
                  <label className="block @md:col-span-2">
                    <span className={FIELD_LABEL_CLASS}>Business Address</span>
                    <input className={`${INPUT_CLASS} mt-2`} placeholder="123 Business Blvd" value={suitability.businessAddress} onChange={(e) => setSuitabilityField("businessAddress", e.target.value)} />
                  </label>
                  <label className="block">
                    <span className={FIELD_LABEL_CLASS}>Business Region</span>
                    <input
                      className={`${INPUT_CLASS} mt-2`}
                      placeholder="US-CA"
                      value={suitability.businessRegion}
                      onChange={(e) => setSuitabilityField("businessRegion", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className={FIELD_LABEL_CLASS}>Business Postal Code</span>
                    <input
                      className={`${INPUT_CLASS} mt-2`}
                      placeholder="94105"
                      value={suitability.businessPostalCode}
                      onChange={(e) => setSuitabilityField("businessPostalCode", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className={FIELD_LABEL_CLASS}>Annual Income (USD) *</span>
                    <input
                      className={`${INPUT_CLASS} mt-2`}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g., 120000"
                      value={suitability.annualIncome}
                      onChange={(e) => setSuitabilityField("annualIncome", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className={FIELD_LABEL_CLASS}>Liquid Net Worth (USD) *</span>
                    <input
                      className={`${INPUT_CLASS} mt-2`}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g., 50000"
                      value={suitability.liquidNetWorth}
                      onChange={(e) => setSuitabilityField("liquidNetWorth", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className={FIELD_LABEL_CLASS}>Total Net Worth (USD) *</span>
                    <input
                      className={`${INPUT_CLASS} mt-2`}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g., 250000"
                      value={suitability.totalNetWorth}
                      onChange={(e) => setSuitabilityField("totalNetWorth", e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <div className="border-app bg-surface-2 @md:col-span-2 rounded-xl border p-4">
                  <p className="text-app-primary text-sm font-semibold">Party suitability details</p>
                  <p className="text-app-secondary mt-1 text-sm">
                    Employment and financial details are already on file from party onboarding and are not editable here.
                  </p>
                </div>
              )}
              <div className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Source Of Funds *</span>
                <div className="mt-2 grid grid-cols-1 gap-2 @md:grid-cols-2">
                  {[
                    "Wage Income",
                    "Pension / Retirement",
                    "Funds From Another Account",
                    "Savings",
                    "Sale Of Business Or Property",
                    "Insurance Payout",
                    "Gift / Inheritance",
                    "Other",
                  ].map((option) => (
                    <label key={option} className="border-app bg-surface-2 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={suitability.sourceOfFundsItems.includes(option)}
                        onChange={() => toggleSuitabilityArrayValue("sourceOfFundsItems", option)}
                      />
                      <span className="text-app-primary">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>Dividend Instruction</span>
                <select
                  className={`${SELECT_CLASS} mt-2`}
                  value={suitability.dividendReinvestmentInstruction}
                  onChange={(e) => setSuitabilityField("dividendReinvestmentInstruction", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option>Reinvest</option>
                  <option>Cash in Account</option>
                  <option>Monthly Check</option>
                  <option>ACH</option>
                </select>
              </label>
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>Time Horizon Min (Years)</span>
                <input
                  className={`${INPUT_CLASS} mt-2`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g., 1"
                  value={suitability.timeHorizonMinYears}
                  onChange={(e) =>
                    setSuitabilityField("timeHorizonMinYears", normalizeWholeNumberInput(e.target.value))
                  }
                />
              </label>
              <label className="block">
                <span className={FIELD_LABEL_CLASS}>Time Horizon Max (Years)</span>
                <input
                  className={`${INPUT_CLASS} mt-2`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g., 10"
                  value={suitability.timeHorizonMaxYears}
                  onChange={(e) =>
                    setSuitabilityField("timeHorizonMaxYears", normalizeWholeNumberInput(e.target.value))
                  }
                />
              </label>
              <div className="block @md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Investment Objectives *</span>
                <div className="mt-2 grid grid-cols-1 gap-2 @md:grid-cols-2">
                  {["Income", "Growth", "Speculation", "Trading"].map((option) => (
                    <label key={option} className="border-app bg-surface-2 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={suitability.investmentObjectives.includes(option)}
                        onChange={() => toggleSuitabilityArrayValue("investmentObjectives", option)}
                      />
                      <span className="text-app-primary">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
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

          {showAccountTypeDashboardCta ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="bg-app-accent text-app-accent-contrast rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 @md:flex-row @md:justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={clampedStepIndex === 0}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  clampedStepIndex === 0
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
          )}
        </div>
      </section>
    </div>
  );
}
