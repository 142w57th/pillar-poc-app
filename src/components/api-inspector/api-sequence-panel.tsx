"use client";

import { useEffect, useRef } from "react";

import { ApiCallCard } from "@/components/api-inspector/api-call-card";
import { useApiLog } from "@/lib/api-log";

export function ApiSequencePanel() {
  const { entries, clearLog, isConnected } = useApiLog();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="inspector-panel flex h-full flex-col">
      <header className="inspector-header flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="inspector-icon text-base font-medium opacity-60">&lt;&gt;</span>
          <h2 className="inspector-title text-base font-semibold tracking-tight">API Sequence</h2>
        </div>

        <div className="flex items-center gap-3">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearLog();
              }}
              className="inspector-clear-btn rounded-md px-2 py-1 text-xs font-medium transition hover:opacity-80"
            >
              Clear
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            <span className="inspector-muted text-sm tabular-nums">
              {entries.length} {entries.length === 1 ? "call" : "calls"}
            </span>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-20">
            <span className="inspector-muted text-3xl opacity-40">&lt;/&gt;</span>
            <p className="inspector-muted text-sm">
              API calls will appear here as you interact with the app
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <ApiCallCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
