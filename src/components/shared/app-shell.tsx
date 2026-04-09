"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { InstrumentSearchBar } from "@/components/shared/instrument-search-bar";
import { apiFetch } from "@/lib/api-client";
import { ApiResponse, InstrumentsCatalogPayload, OnboardingStatusPayload } from "@/types/api";

type AppShellProps = {
  children: ReactNode;
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Onboarding", href: "/onboarding" },
  { label: "Transfer", href: "/transfer" },
  { label: "Settings", href: "/settings" },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 350);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const shouldFetchInstruments = debouncedSearchQuery.length > 0;
  const isSearchDebouncing =
    searchQuery.trim().length > 0 && searchQuery.trim() !== debouncedSearchQuery;

  const { data: instrumentsData, isLoading: isInstrumentsLoading } = useQuery({
    queryKey: ["instruments-catalog", debouncedSearchQuery],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<InstrumentsCatalogPayload>>(
        `/api/v1/instruments?q=${encodeURIComponent(debouncedSearchQuery)}`,
      );
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    enabled: shouldFetchInstruments,
  });

  const { data: onboardingStatus, isLoading: isOnboardingStatusLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<OnboardingStatusPayload>>("/api/v1/onboarding/status");
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (isOnboardingStatusLoading || pathname.startsWith("/onboarding")) {
      return;
    }
    const hasLinkedAccounts = (onboardingStatus?.accounts.length ?? 0) > 0;
    if (!onboardingStatus?.clientOnboarded || !hasLinkedAccounts) {
      router.replace("/onboarding");
    }
  }, [isOnboardingStatusLoading, onboardingStatus, pathname, router]);

  const instrumentSearchOptions = useMemo(
    () =>
      (instrumentsData?.instruments ?? []).map((instrument) => ({
        symbol: instrument.symbol,
        name: instrument.name,
        assetClass: instrument.assetClass,
      })),
    [instrumentsData],
  );

  const toggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="@container bg-app-shell text-app-primary relative min-h-svh">
      {isSidebarOpen ? (
        <button
          type="button"
          className="bg-app-overlay fixed inset-0 z-20 backdrop-blur-sm"
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        />
      ) : null}

      <div className="mx-auto flex min-h-svh w-full max-w-7xl">
        <main className="relative z-10 min-w-0 flex-1 px-4 py-4 @md:px-6">
          <header className="border-app bg-surface-overlay sticky top-0 z-20 mb-6 flex items-center gap-3 rounded-[1.4rem] border px-3 py-3 shadow-sm backdrop-blur @md:px-4">
            <Link
              href="/"
              className="border-app bg-surface-2 text-app-primary inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition hover:opacity-90"
              aria-label="Go to dashboard"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12L12 3L21 12" />
                <path d="M6.75 10.5V21H17.25V10.5" />
                <path d="M10 21V14.5H14V21" />
              </svg>
            </Link>

            <InstrumentSearchBar
              instruments={instrumentSearchOptions}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onInstrumentSelect={(instrument) => {
                setSearchQuery("");
                setDebouncedSearchQuery("");
                const assetClassQuery = instrument.assetClass
                  ? `?assetClass=${encodeURIComponent(instrument.assetClass)}`
                  : "";
                router.push(`/instruments/${encodeURIComponent(instrument.symbol)}${assetClassQuery}`);
              }}
              isLoading={isSearchDebouncing || isInstrumentsLoading}
            />

            <button
              type="button"
              onClick={toggleSidebar}
              className="border-app bg-surface-2 text-app-primary inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition hover:opacity-90"
              aria-controls="app-navigation"
              aria-expanded={isSidebarOpen}
              aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 7H20" />
                <path d="M4 12H20" />
                <path d="M4 17H20" />
              </svg>
            </button>
          </header>

          <section>{children}</section>
        </main>

        <aside
          id="app-navigation"
          className={`border-app bg-surface-1 fixed inset-y-0 right-0 z-30 flex w-72 flex-col border-l p-5 shadow-xl transition-transform duration-300 ${
            isSidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-app-muted text-xs uppercase tracking-[0.14em]">Workspace</p>
              <h2 className="text-lg font-semibold">Navigation</h2>
            </div>
            <button
              type="button"
              className="text-app-secondary hover:bg-surface-2 rounded-md px-2 py-1 text-sm"
              onClick={closeSidebar}
              aria-label="Close sidebar"
            >
              Close
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-app-accent text-app-accent-contrast"
                      : "text-app-secondary hover:bg-surface-2 hover:text-app-primary"
                  }`}
                  onClick={closeSidebar}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-app bg-surface-2 mt-auto rounded-xl border p-4">
            <p className="text-app-muted text-xs uppercase tracking-[0.14em]">Status</p>
            <p className="text-app-primary mt-1 text-sm font-medium">Market data connection healthy</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
