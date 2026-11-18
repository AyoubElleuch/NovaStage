"use client";

import React from "react";

export const passwordRequirements = [
  { label: "8+ characters", test: (password: string) => password.length >= 8 },
  { label: "Capital letter", test: (password: string) => /[A-Z]/.test(password) },
  { label: "Small letter", test: (password: string) => /[a-z]/.test(password) },
  { label: "Number", test: (password: string) => /\d/.test(password) },
  { label: "Special character", test: (password: string) => /[^A-Za-z0-9]/.test(password) },
];

const strengthStyles = {
  Weak: { compact: "text-red-600 dark:text-red-400", detailed: "text-red-600", bar: "bg-red-500" },
  Medium: {
    compact: "text-amber-600 dark:text-amber-400",
    detailed: "text-amber-600",
    bar: "bg-amber-500",
  },
  Strong: {
    compact: "text-emerald-600 dark:text-emerald-400",
    detailed: "text-emerald-600",
    bar: "bg-emerald-500",
  },
};

export default function PasswordStrength({
  password,
  variant = "compact",
}: {
  password: string;
  variant?: "compact" | "detailed";
}) {
  const passedRequirements = passwordRequirements.filter(({ test }) => test(password)).length;
  const strength = passedRequirements <= 2 ? "Weak" : passedRequirements <= 4 ? "Medium" : "Strong";
  const strengthTone = strengthStyles[strength][variant];
  const barTone = strengthStyles[strength].bar;
  const emptyBarTone =
    variant === "detailed"
      ? "bg-neutral-200 dark:bg-[#283548]"
      : "bg-neutral-200 dark:bg-[#1e2634]";

  return (
    <div
      className="mt-2.5 border-t border-neutral-100 dark:border-[#283548] pt-2.5"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-neutral-400 dark:text-neutral-500">Password strength</span>
        <span
          className={`font-semibold ${password ? strengthTone : "text-neutral-400 dark:text-neutral-500"}`}
        >
          {password ? strength : "Not set"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
        {passwordRequirements.map(({ label, test }) => (
          <span
            key={label}
            className={`h-1 rounded-full ${password && test(password) ? barTone : emptyBarTone}`}
          />
        ))}
      </div>
      {variant === "detailed" && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400 dark:text-neutral-500">
          {passwordRequirements.map(({ label, test }) => (
            <span
              key={label}
              className={
                password && test(password) ? "text-neutral-700 dark:text-neutral-200" : undefined
              }
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
