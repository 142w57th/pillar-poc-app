"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { ApiResponse } from "@/types/api";

type AuthMode = "login" | "signup";

type AuthResponsePayload = {
  user: {
    id: string;
    email: string;
    status: "ACTIVE" | "DISABLED";
  };
};

const CLIENT_ID_KEY = "pillar_client_id";

function getOrCreateClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMemoryMode, setIsMemoryMode] = useState(false);

  useEffect(() => {
    fetch("/api/v1/status")
      .then((r) => r.json())
      .then((payload: ApiResponse<{ storageMode: string }>) => {
        if (payload.success && payload.data.storageMode === "memory") {
          setIsMemoryMode(true);
        }
      })
      .catch(() => {});
  }, []);

  const actionLabel = useMemo(() => (mode === "login" ? "Sign in" : "Create account"), [mode]);

  const DEMO_EMAIL = "demo@pillar.app";

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = {
        email: isMemoryMode ? DEMO_EMAIL : email,
        password,
      };
      if (isMemoryMode) {
        body.clientId = getOrCreateClientId();
      }
      const response = await fetch(`/api/v1/auth/${isMemoryMode ? "login" : mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiResponse<AuthResponsePayload>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Authentication failed." : payload.error.message);
      }
      window.location.href = "/";
      return;
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md items-center px-4 py-10">
      <section className="border-app bg-surface-1 w-full rounded-2xl border p-6 shadow-sm">
        <p className="text-app-muted text-xs uppercase tracking-[0.14em]">Trading POC</p>
        <h1 className="text-app-primary mt-2 text-2xl font-semibold">
          {isMemoryMode ? "Sign in" : actionLabel}
        </h1>
        <p className="text-app-secondary mt-2 text-sm">
          {isMemoryMode
            ? "Enter the demo password to continue."
            : "Use your app credentials to continue."}
        </p>

        {isMemoryMode ? null : (
          <div className="mt-5 grid grid-cols-2 rounded-lg bg-surface-2 p-1">
            {(["login", "signup"] as const).map((option) => {
              const active = option === mode;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-app-accent text-app-accent-contrast" : "text-app-secondary"
                  }`}
                >
                  {option === "login" ? "Sign in" : "Sign up"}
                </button>
              );
            })}
          </div>
        )}

        <form onSubmit={submitAuth} className="mt-5 space-y-4">
          {isMemoryMode ? null : (
            <label className="block">
              <span className="text-app-secondary text-sm">Email</span>
              <input
                type="email"
                className="border-app bg-surface-2 text-app-primary mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-app-accent"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
          )}

          <label className="block">
            <span className="text-app-secondary text-sm">Password</span>
            <input
              type="password"
              className="border-app bg-surface-2 text-app-primary mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-app-accent"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            {!isMemoryMode && mode === "signup" ? (
              <p className="text-app-muted mt-1 text-xs">Password must be at least 8 characters.</p>
            ) : null}
          </label>

          {errorMessage ? <p className="text-negative text-sm">{errorMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-app-accent text-app-accent-contrast w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : isMemoryMode ? "Sign in" : actionLabel}
          </button>
        </form>
      </section>
    </main>
  );
}
