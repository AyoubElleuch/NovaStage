"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { completeOnboarding } from "./actions";
import { TermsOfServiceContent } from "@/components/terms/terms-of-service-content";
import { ThemeToggle } from "@/lib/theme-context";

interface OnboardingFlowProps {
  initialFullName?: string;
  initialUsername?: string;
  destination?: string;
}

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
            className={`h-1 rounded-full ${password && test(password) ? barTone : "bg-neutral-200 dark:bg-[#283548]"}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400 dark:text-neutral-500">
        {passwordRequirements.map(({ label, test }) => (
          <span key={label} className={password && test(password) ? "text-neutral-700 dark:text-neutral-200" : undefined}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingFlow({
  initialFullName = "",
  initialUsername = "",
  destination = "/dashboard",
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fullName, setFullName] = useState(initialFullName);
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Step 4 state
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [fullNameError, setFullNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [termsError, setTermsError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Progress percentage calculation for 4 steps:
  // Step 1: 0% -> Step 2: 25% -> Step 3: 50% -> Step 4: 75% -> Complete: 100%
  const progressPercent = isCompleted
    ? 100
    : step === 4
      ? 75
      : step === 3
        ? 50
        : step === 2
          ? 25
          : 0;

  const handleStep1Submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      setFullNameError("Please enter your full name.");
      return;
    }
    setFullNameError("");
    setServerError("");
    setStep(2);
  };

  const handleStep2Submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setUsernameError("Please enter your username.");
      return;
    }
    setUsernameError("");
    setServerError("");
    setStep(3);
  };

  const handleStep3Submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setPasswordError("Your password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError("");
    setServerError("");
    setStep(4);
  };

  const handleTermsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    // Detect when user scrolled to the bottom (with a threshold for rounding & sub-pixels)
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 12;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleStep4Submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!agreedToTerms) {
      setTermsError("Please agree to the Terms of Service to continue.");
      return;
    }
    setTermsError("");
    setServerError("");

    startTransition(async () => {
      try {
        const result = await completeOnboarding(
          fullName,
          username,
          password,
          confirmation
        );
        if (result.error) {
          setServerError(result.error);
          return;
        }

        // Animate the bar to 100%
        setIsCompleted(true);

        // Transition smoothly to destination
        setTimeout(() => {
          router.push(destination);
          router.refresh();
        }, 500);
      } catch {
        setServerError("We could not save your information. Please try again.");
      }
    });
  };

  return (
    <main className="login-surface flex min-h-screen w-full flex-col items-center justify-center bg-[#fdfdfc] dark:bg-[#0f141c] px-4 py-8 sm:px-6 sm:py-12 selection:bg-neutral-200 selection:text-neutral-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* NovaStage Brand Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/logo.svg"
            alt="NovaStage"
            width={110}
            height={45}
            priority
            className="h-auto w-27.5 dark:brightness-0 dark:invert"
          />
        </div>

        {/* Dynamic Step View */}
        <div key={step} className="login-mode-transition">
          {step === 1 ? (
            <div>
              <header>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Welcome to NovaStage
                </h1>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Please enter your full name.
                </p>
              </header>

              <form onSubmit={handleStep1Submit} noValidate className="mt-8 space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    autoFocus
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      if (fullNameError) setFullNameError("");
                      if (serverError) setServerError("");
                    }}
                    placeholder="e.g. Alex Morgan"
                    aria-invalid={Boolean(fullNameError)}
                    aria-describedby={fullNameError ? "fullName-error" : undefined}
                    className={`h-11 w-full rounded-lg border px-3.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 dark:text-white dark:placeholder-neutral-500 ${
                      fullNameError
                        ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-950/20"
                        : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
                    }`}
                  />
                  {fullNameError && (
                    <p
                      id="fullName-error"
                      className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fullNameError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 active:scale-[0.99]"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : step === 2 ? (
            <div>
              <header>
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setUsernameError("");
                      setServerError("");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 rounded"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Choose your username
                </h1>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Please enter your username.
                </p>
              </header>

              <form onSubmit={handleStep2Submit} noValidate className="mt-8 space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      if (usernameError) setUsernameError("");
                      if (serverError) setServerError("");
                    }}
                    placeholder="e.g. alexmorgan"
                    aria-invalid={Boolean(usernameError)}
                    aria-describedby={usernameError ? "username-error" : undefined}
                    className={`h-11 w-full rounded-lg border px-3.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 dark:text-white dark:placeholder-neutral-500 ${
                      usernameError
                        ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-950/20"
                        : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
                    }`}
                  />
                  {usernameError && (
                    <p
                      id="username-error"
                      className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{usernameError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 active:scale-[0.99]"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : step === 3 ? (
            <div>
              <header>
                <div className="mb-2">
                  <button
                    type="button"
                    disabled={isPending || isCompleted}
                    onClick={() => {
                      setStep(2);
                      setPasswordError("");
                      setServerError("");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 rounded disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-[#1e2634] dark:text-neutral-300">
                    <LockKeyhole className="h-4 w-4" />
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    Update password
                  </h1>
                </div>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Keep your NovaStage account secure.
                </p>
              </header>

              <form onSubmit={handleStep3Submit} noValidate className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      autoFocus
                      disabled={isPending || isCompleted}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (passwordError) setPasswordError("");
                        if (serverError) setServerError("");
                      }}
                      placeholder="••••••••"
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={passwordError ? "password-error" : undefined}
                      className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 dark:text-white dark:placeholder-neutral-500 ${
                        passwordError || serverError
                          ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-950/20"
                          : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={isPending || isCompleted}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <label
                    htmlFor="confirmation"
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmation"
                      type={showConfirmation ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={isPending || isCompleted}
                      value={confirmation}
                      onChange={(event) => {
                        setConfirmation(event.target.value);
                        if (passwordError) setPasswordError("");
                        if (serverError) setServerError("");
                      }}
                      placeholder="••••••••"
                      aria-invalid={Boolean(passwordError)}
                      className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 dark:text-white dark:placeholder-neutral-500 ${
                        passwordError || serverError
                          ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-950/20"
                          : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={isPending || isCompleted}
                      aria-label={showConfirmation ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirmation((visible) => !visible)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showConfirmation ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <p
                    id="password-error"
                    className="login-error-transition flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordError}</span>
                  </p>
                )}

                {serverError && (
                  <div
                    role="alert"
                    className="login-error-transition flex items-center gap-2.5 rounded-lg border border-red-200/80 bg-red-50/70 px-3.5 py-2.5 text-[13px] font-medium leading-snug text-red-700 shadow-2xs dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span>{serverError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 active:scale-[0.99]"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : (
            <div>
              <header>
                <div className="mb-2">
                  <button
                    type="button"
                    disabled={isPending || isCompleted}
                    onClick={() => {
                      setStep(3);
                      setTermsError("");
                      setServerError("");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 rounded disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-[#1e2634] dark:text-neutral-300">
                    <FileText className="h-4 w-4" />
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    Terms of Service
                  </h1>
                </div>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Please review and agree to our terms to finish setup.
                </p>
              </header>

              <form onSubmit={handleStep4Submit} noValidate className="mt-6 space-y-4">
                {/* Scrollable Terms Box */}
                <div>
                  <div
                    tabIndex={0}
                    onScroll={handleTermsScroll}
                    aria-label="Terms of Service Agreement"
                    className="h-48 sm:h-52 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3.5 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 dark:border-[#283548] dark:bg-[#121721] dark:focus-visible:ring-neutral-700"
                  >
                    <TermsOfServiceContent />
                  </div>
                  {!hasScrolledToBottom ? (
                    <p className="mt-2 text-[11.5px] text-neutral-400 dark:text-neutral-500">
                      &darr; Please scroll to the bottom of the terms to enable the agreement checkbox.
                    </p>
                  ) : (
                    <p className="mt-2 flex items-center gap-1 text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                      <span>You have reviewed the terms.</span>
                    </p>
                  )}
                </div>

                {/* Native HTML Checkbox */}
                <div className="pt-1">
                  <div className="flex items-start gap-2.5">
                    <input
                      id="terms-agreement-checkbox"
                      type="checkbox"
                      checked={agreedToTerms}
                      disabled={!hasScrolledToBottom || isPending || isCompleted}
                      onChange={(event) => {
                        setAgreedToTerms(event.target.checked);
                        if (termsError) setTermsError("");
                        if (serverError) setServerError("");
                      }}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-300 text-neutral-900 accent-neutral-900 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#283548] dark:bg-[#121721] dark:accent-emerald-600"
                    />
                    <label
                      htmlFor="terms-agreement-checkbox"
                      className={`text-xs font-medium leading-tight select-none ${
                        !hasScrolledToBottom
                          ? "cursor-not-allowed text-neutral-400 dark:text-neutral-500"
                          : "cursor-pointer text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                      }`}
                    >
                      I have read and agree to the Terms of Service and Privacy Policy
                    </label>
                  </div>
                  {termsError && (
                    <p
                      id="terms-error"
                      className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{termsError}</span>
                    </p>
                  )}
                </div>

                {serverError && (
                  <div
                    role="alert"
                    className="login-error-transition flex items-center gap-2.5 rounded-lg border border-red-200/80 bg-red-50/70 px-3.5 py-2.5 text-[13px] font-medium leading-snug text-red-700 shadow-2xs dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span>{serverError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!agreedToTerms || isPending || isCompleted}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending || isCompleted ? (
                    isCompleted ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>All set! Loading dashboard...</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    )
                  ) : (
                    <>
                      <span>Finish</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Progress Bar at the Bottom */}
        <div className="mt-10 border-t border-neutral-100 dark:border-[#283548] pt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span>
              {isCompleted
                ? "Setup complete"
                : step === 1
                  ? "Step 1 of 4"
                  : step === 2
                    ? "Step 2 of 4"
                    : step === 3
                      ? "Step 3 of 4"
                      : "Step 4 of 4"}
            </span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1e2634]"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-neutral-900 dark:bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
