"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import type { ApiLogEntry } from "@/types/api-log";

type ApiLogContextValue = {
  entries: ApiLogEntry[];
  clearLog: () => void;
  isConnected: boolean;
};

const ApiLogContext = createContext<ApiLogContextValue>({
  entries: [],
  clearLog: () => {},
  isConnected: false,
});

const DESKTOP_QUERY = "(min-width: 1024px)";
const MAX_ENTRIES = 200;

export function ApiLogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname.startsWith("/login");
  const [entries, setEntries] = useState<ApiLogEntry[]>([]);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const isDesktop = useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(DESKTOP_QUERY);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isDesktop || isLoginRoute) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const es = new EventSource("/api/v1/api-log/stream");
      esRef.current = es;

      es.onopen = () => setConnectionOpen(true);

      es.onmessage = (event) => {
        try {
          const entry = JSON.parse(event.data) as ApiLogEntry;
          setEntries((prev) => {
            const next = [...prev, entry];
            return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;
          });
        } catch {
          // skip malformed data
        }
      };

      es.onerror = () => {
        setConnectionOpen(false);
        es.close();
        esRef.current = null;
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [isDesktop, isLoginRoute]);

  const clearLog = useCallback(() => {
    setEntries([]);
    fetch("/api/v1/api-log/stream", { method: "DELETE" }).catch(() => {});
  }, []);

  const isConnected = isDesktop && !isLoginRoute && connectionOpen;
  const visibleEntries = isLoginRoute ? [] : entries;

  return (
    <ApiLogContext.Provider
      value={{ entries: visibleEntries, clearLog, isConnected }}
    >
      {children}
    </ApiLogContext.Provider>
  );
}

export function useApiLog() {
  return useContext(ApiLogContext);
}
