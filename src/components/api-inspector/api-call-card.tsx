"use client";

import { useState } from "react";

import type { ApiLogEntry } from "@/types/api-log";

type ApiCallCardProps = {
  entry: ApiLogEntry;
};

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  POST: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  PATCH: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  PUT: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
};

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-emerald-600";
  if (status >= 400 && status < 500) return "text-amber-600";
  return "text-rose-600";
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncatePath(path: string, maxLen = 82): string {
  if (path.length <= maxLen) return path;
  return path.slice(0, maxLen - 1) + "\u2026";
}

export function ApiCallCard({ entry }: ApiCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const methodStyle = METHOD_STYLES[entry.method] ?? METHOD_STYLES.GET;
  const hasDetail = entry.requestBody !== undefined || entry.responseBody !== undefined || entry.description;

  return (
    <div
      className="inspector-card rounded-xl border transition-shadow"
      role="button"
      tabIndex={hasDetail ? 0 : undefined}
      onClick={hasDetail ? () => setExpanded((p) => !p) : undefined}
      onKeyDown={
        hasDetail
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((p) => !p);
              }
            }
          : undefined
      }
      style={{ cursor: hasDetail ? "pointer" : "default" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide ${methodStyle}`}
        >
          {entry.method}
        </span>

        <span className="inspector-path min-w-0 flex-1 truncate font-mono text-sm">
          {truncatePath(entry.path)}
        </span>

        <span className={`shrink-0 text-sm font-semibold tabular-nums ${statusColor(entry.status)}`}>
          {entry.status}
        </span>

        <span className="inspector-muted shrink-0 text-xs tabular-nums">
          {entry.durationMs}ms
        </span>

        {hasDetail && (
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`inspector-muted h-4 w-4 shrink-0 transition-transform duration-200 ${
              expanded ? "rotate-90" : ""
            }`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {expanded && (
        <div className="inspector-detail-section border-t px-4 pb-4 pt-3">
          <div className="mb-3">
            <p className="inspector-label mb-1.5 text-[11px] font-semibold uppercase tracking-wider">URL</p>
            <p className="inspector-code-block break-all rounded-lg p-3 font-mono text-xs leading-relaxed">
              {entry.path}
            </p>
          </div>

          {entry.description && (
            <p className="inspector-muted mb-3 text-[11px] font-medium uppercase tracking-widest">
              {entry.description}
            </p>
          )}

          {entry.requestBody !== undefined && (
            <div className="mb-3">
              <p className="inspector-label mb-1.5 text-[11px] font-semibold uppercase tracking-wider">
                Request
              </p>
              <pre className="inspector-code-block overflow-x-auto rounded-lg p-3 font-mono text-xs leading-relaxed">
                {formatJson(entry.requestBody)}
              </pre>
            </div>
          )}

          {entry.responseBody !== undefined && (
            <div>
              <p className="inspector-label mb-1.5 text-[11px] font-semibold uppercase tracking-wider">
                Response
              </p>
              <pre className="inspector-code-block overflow-x-auto rounded-lg p-3 font-mono text-xs leading-relaxed">
                {formatJson(entry.responseBody)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
