"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type ThemeId = "light" | "dark" | "ocean" | "sunset" | "draftkings";

type ThemeOption = {
  id: ThemeId;
  name: string;
  description: string;
  previewColors: [string, string, string];
};

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  options: ThemeOption[];
};

const THEME_STORAGE_KEY = "qapital-theme";

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "light",
    name: "Light",
    description: "Clean neutral palette for bright environments.",
    previewColors: ["#ffffff", "#0f172a", "#059669"],
  },
  {
    id: "dark",
    name: "Dark",
    description: "Low-glare palette tuned for night usage.",
    previewColors: ["#111827", "#f8fafc", "#34d399"],
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool blue-cyan palette with crisp contrast.",
    previewColors: ["#0b172a", "#dbeafe", "#06b6d4"],
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm amber-rose palette with softer contrast.",
    previewColors: ["#1f1611", "#fde7d7", "#f59e0b"],
  },
  {
    id: "draftkings",
    name: "DraftKings",
    description: "Brand-inspired noir base with electric green highlights.",
    previewColors: ["#111111", "#9AE200", "#FF890B"],
  },
];

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(value: string): value is ThemeId {
  return THEME_OPTIONS.some((option) => option.id === value);
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeId>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme && isThemeId(storedTheme)) {
      setTheme(storedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      options: THEME_OPTIONS,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
