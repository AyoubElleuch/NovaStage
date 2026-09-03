"use client";

import React from "react";

export const passwordRequirements = [
  { label: "8+ characters", test: (password: string) => password.length >= 8 },
  { label: "Capital letter", test: (password: string) => /[A-Z]/.test(password) },
  { label: "Small letter", test: (password: string) => /[a-z]/.test(password) },
  { label: "Number", test: (password: string) => /\d/.test(password) },
  { label: "Special character", test: (password: string) => /[^A-Za-z0-9]/.test(password) },
];

export default function PasswordStrength({ password }: { password: string }) {
  const passedRequirements = passwordRequirements.filter(({ test }) => test(password)).length;
  const strength = passedRequirements <= 2 ? "Weak" : passedRequirements <= 4 ? "Medium" : "Strong";
  const strengthTone =
    strength === "Strong"
      ? "text-emerald-600 dark:text-emerald-400"
      : strength === "Medium"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  const barTone =
    strength === "Strong" ? "bg-emerald-500" : strength === "Medium" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="mt-2.5 border-t border-neutral-100 dark:border-[#283548] pt-2.5" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-neutral-400 dark:text-neutral-500">Password strength</span>
        <span className={`font-semibold ${password ? strengthTone : "text-neutral-400 dark:text-neutral-500"}`}>
          {password ? strength : "Not set"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
        {passwordRequirements.map(({ label, test }) => (
          <span
            key={label}
            className={`h-1 rounded-full ${password && test(password) ? barTone : "bg-neutral-200 dark:bg-[#1e2634]"}`}
          />
        ))}
      </div>
    </div>
  );
}
