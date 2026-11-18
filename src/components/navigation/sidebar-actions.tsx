"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggleButton({ collapsed }: { collapsed: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={collapsed ? (isDark ? "Switch to light mode" : "Switch to dark mode") : undefined}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2736] dark:hover:text-white ${
        collapsed ? "justify-center px-0" : ""
      }`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon
          className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400"
          aria-hidden="true"
        />
      )}
      {!collapsed && (
        <div className="flex w-full items-center justify-between">
          <span className="truncate">{isDark ? "Light mode" : "Dark mode"}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {isDark ? "Dark" : "Light"}
          </span>
        </div>
      )}
    </button>
  );
}

export function SignOutButton({ collapsed }: { collapsed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title={collapsed ? "Sign out" : undefined}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2736] dark:hover:text-white disabled:cursor-wait disabled:opacity-60 ${
        collapsed ? "justify-center px-0" : ""
      }`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {!collapsed && <span className="truncate">{pending ? "Signing out…" : "Sign out"}</span>}
    </button>
  );
}
