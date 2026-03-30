"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  const [entries, setEntries] = useState<ApiLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const es = new EventSource("/api/v1/api-log/stream");
      esRef.current = es;

      es.onopen = () => setIsConnected(true);

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
        setIsConnected(false);
        es.close();
        esRef.current = null;
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isDesktop]);

  const clearLog = useCallback(() => {
    setEntries([]);
    fetch("/api/v1/api-log/stream", { method: "DELETE" }).catch(() => {});
  }, []);

  return (
    <ApiLogContext.Provider value={{ entries, clearLog, isConnected }}>
      {children}
    </ApiLogContext.Provider>
  );
}

export function useApiLog() {
  return useContext(ApiLogContext);
}
