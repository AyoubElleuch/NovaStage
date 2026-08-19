"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { resetPassword } from "@/app/auth/actions";

const passwordRequirements = [
  { label: "8+ characters", test: (password: string) => password.length >= 8 },
  { label: "Capital letter", test: (password: string) => /[A-Z]/.test(password) },
  { label: "Small letter", test: (password: string) => /[a-z]/.test(password) },
  { label: "Number", test: (password: string) => /\d/.test(password) },
  { label: "Special character", test: (password: string) => /[^A-Za-z0-9]/.test(password) },
];

function PasswordStrength({ password }: { password: string }) {
  const passedRequirements = passwordRequirements.filter(({ test }) => test(password)).length;
  const strength = passedRequirements <= 2 ? "Weak" : passedRequirements <= 4 ? "Medium" : "Strong";
  const strengthTone =
    strength === "Strong"
      ? "text-emerald-600"
      : strength === "Medium"
        ? "text-amber-600"
        : "text-red-600";
  const barTone =
    strength === "Strong" ? "bg-emerald-500" : strength === "Medium" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="mt-2.5 border-t border-neutral-100 pt-2.5" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-neutral-400">Password strength</span>
        <span className={`font-semibold ${password ? strengthTone : "text-neutral-400"}`}>
          {password ? strength : "Not set"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
        {passwordRequirements.map(({ label, test }) => (
          <span
            key={label}
            className={`h-1 rounded-full ${password && test(password) ? barTone : "bg-neutral-200"}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400">
        {passwordRequirements.map(({ label, test }) => (
          <span key={label} className={password && test(password) ? "text-neutral-700" : undefined}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("password", password);
        formData.append("confirmation", confirmation);

        const result = await resetPassword(formData);
        if (result?.error) {
          setError(result.error);
        } else {
          setIsSuccess(true);
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 800);
        }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.message.includes("NEXT_REDIRECT") ||
            (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
        ) {
          return;
        }
        setError("We could not update your password. Please try again.");
      }
    });
  };

  if (isSuccess) {
    return (
      <section className="login-success-transition flex min-h-72 flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)]">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight text-neutral-900">
          Password updated
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600">
          Your password has been changed successfully. Redirecting you to your workspace...
        </p>
      </section>
    );
  }

  return (
    <div className="w-full max-w-sm selection:bg-neutral-200 selection:text-neutral-900">
      <div className="login-mode-transition">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
            <LockKeyhole className="h-4 w-4" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Create new password
          </h1>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Enter and confirm your new secure password below.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700"
            >
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
                disabled={isPending}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError("");
                }}
                placeholder="••••••••"
                aria-invalid={Boolean(error)}
                className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 ${
                  error
                    ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10"
                    : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100"
                }`}
              />
              <button
                type="button"
                disabled={isPending}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmation ? "text" : "password"}
                autoComplete="new-password"
                disabled={isPending}
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value);
                  if (error) setError("");
                }}
                placeholder="••••••••"
                aria-invalid={Boolean(error)}
                className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 ${
                  error
                    ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10"
                    : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100"
                }`}
              />
              <button
                type="button"
                disabled={isPending}
                aria-label={showConfirmation ? "Hide password" : "Show password"}
                onClick={() => setShowConfirmation(!showConfirmation)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error-transition flex items-center gap-1.5 text-xs font-medium text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Update password</span>
          </button>
        </form>
      </div>
    </div>
  );
}
