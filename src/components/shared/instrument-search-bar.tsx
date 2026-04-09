"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type InstrumentSearchItem = {
  symbol: string;
  name: string;
  assetClass?: string;
};

type InstrumentSearchBarProps = {
  instruments: InstrumentSearchItem[];
  query: string;
  onQueryChange: (value: string) => void;
  onInstrumentSelect?: (instrument: InstrumentSearchItem) => void;
  isLoading?: boolean;
};

function matchesInstrument(instrument: InstrumentSearchItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    instrument.symbol.toLowerCase().includes(normalized) || instrument.name.toLowerCase().includes(normalized)
  );
}

export function InstrumentSearchBar({
  instruments,
  query,
  onQueryChange,
  onInstrumentSelect,
  isLoading = false,
}: InstrumentSearchBarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredInstruments = useMemo(
    () => instruments.filter((instrument) => matchesInstrument(instrument, query)).slice(0, 10),
    [instruments, query],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const shouldShowResults = isDropdownOpen && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <label className="relative block">
        <span className="sr-only">Search by instrument name or symbol</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="text-app-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20L16.65 16.65" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsDropdownOpen(false);
            }
          }}
          placeholder="Search by symbol or instrument name"
          className="border-app bg-surface-1 text-app-primary placeholder:text-app-muted focus:border-app-accent focus:ring-app-accent/30 h-11 w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2"
        />
      </label>

      {shouldShowResults ? (
        <div className="border-app bg-surface-1 absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-lg border shadow-lg">
          {isLoading ? (
            <p className="text-app-secondary px-3 py-2.5 text-sm">Loading instruments...</p>
          ) : filteredInstruments.length > 0 ? (
            <ul className="max-h-60 overflow-auto py-1">
              {filteredInstruments.map((instrument) => (
                <li key={`${instrument.symbol}-${instrument.name}`}>
                  <button
                    type="button"
                    className="text-app-primary hover:bg-surface-2 flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                    onClick={() => {
                      onInstrumentSelect?.(instrument);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <span className="font-medium">{instrument.symbol}</span>
                    <span className="text-app-secondary truncate">{instrument.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-app-secondary px-3 py-2.5 text-sm">No instruments found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
