"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "novastage-theme";

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Light mode is the default
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === "dark" || stored === "light") {
        setThemeState(stored);
        applyThemeToDocument(stored);
      } else {
        // Default is light mode
        applyThemeToDocument("light");
      }
    } catch {
      applyThemeToDocument("light");
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToDocument(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.cookie = `${STORAGE_KEY}=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const nextTheme: Theme = current === "dark" ? "light" : "dark";
      applyThemeToDocument(nextTheme);
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
        document.cookie = `${STORAGE_KEY}=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
      return nextTheme;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-xs transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
      )}
    </button>
  );
}
