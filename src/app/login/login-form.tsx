"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signUp, signIn, signInWithOAuth, requestPasswordReset } from "@/app/auth/actions";
import { GitHubIcon } from "@/components/icons";
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import PasswordStrength from "@/components/ui/password-strength";

const MINIMUM_SUBMIT_TIME = 700;

interface LoginFormProps {
  initialMode?: "login" | "signup";
  initialWaitlistSuccess?: boolean;
}

export default function LoginForm({
  initialMode = "login",
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const urlMode = searchParams.get("mode");
  const errorParam = searchParams.get("error");
  const initialErrorMessage =
    errorParam === "auth_callback_failed"
      ? "Authentication could not be completed. Please try again."
      : "";

  const [mode, setMode] = useState<"login" | "signup">(
    urlMode === "signup" || initialMode === "signup" ? "signup" : "login"
  );
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [isForgotSuccess, setIsForgotSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [message, setMessage] = useState(initialErrorMessage);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const playSuccessChime = () => {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, now);
      oscillator.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.25);
      oscillator.addEventListener("ended", () => void audioContext.close(), { once: true });
    } catch {
      // Audio is optional and can be unavailable in some environments.
    }
  };

  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((previous) => {
        if (previous === null || previous <= 1) {
          clearInterval(interval);
          setMessage("");
          return null;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lockoutSeconds && lockoutSeconds > 0) return;

    const trimmedEmail = email.trim();
    const nextEmailError = !trimmedEmail
      ? "Enter your email address."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
        ? "Enter a valid email address."
        : "";

    const nextPasswordError = !password
      ? "Enter your password."
      : mode === "signup" && password.length < 8
        ? "Password must be at least 8 characters long."
        : "";

    const nextConfirmPasswordError =
      mode === "signup"
        ? !confirmPassword
          ? "Confirm your password."
          : confirmPassword !== password
            ? "Passwords do not match."
            : ""
        : "";

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);
    setMessage("");
    setIsSuccess(false);

    if (nextEmailError || nextPasswordError || nextConfirmPasswordError) return;

    startTransition(async () => {
      try {
        const startedAt = Date.now();
        const formData = new FormData();
        formData.append("email", trimmedEmail);
        formData.append("password", password);

        if (mode === "signup") {
          formData.append("confirmPassword", confirmPassword);
        } else {
          formData.append("redirectTo", redirectTo);
        }

        const result = mode === "signup" ? await signUp(formData) : await signIn(formData);
        const remainingTime = MINIMUM_SUBMIT_TIME - (Date.now() - startedAt);
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        if (result.retryAfterSeconds) setLockoutSeconds(result.retryAfterSeconds);
        setMessage(result.message || result.error || "");
        setIsSuccess(Boolean(result.success));
        if (result.success) {
          playSuccessChime();
          router.push(mode === "signup" ? "/onboarding" : redirectTo || "/dashboard");
        }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.message.includes("NEXT_REDIRECT") ||
            (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
        ) {
          return;
        }
        setMessage(
          mode === "signup"
            ? "We could not create your account right now. Please try again."
            : "We could not log you in right now. Please try again."
        );
        setIsSuccess(false);
      }
    });
  };

  const handleForgotPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const nextEmailError = !trimmedEmail
      ? "Enter your email address."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
        ? "Enter a valid email address."
        : "";
    setEmailError(nextEmailError);
    setMessage("");

    if (nextEmailError) return;

    startTransition(async () => {
      try {
        const startedAt = Date.now();
        const formData = new FormData();
        formData.append("email", trimmedEmail);
        const result = await requestPasswordReset(formData);
        const remainingTime = MINIMUM_SUBMIT_TIME - (Date.now() - startedAt);
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }
        if (result.error) {
          setMessage(result.error);
          setIsForgotSuccess(false);
        } else {
          setIsForgotSuccess(true);
          playSuccessChime();
        }
      } catch {
        setMessage("We could not process your request. Please try again.");
        setIsForgotSuccess(false);
      }
    });
  };

  const handleOAuth = (provider: "github") => {
    startTransition(async () => {
      try {
        await signInWithOAuth(provider, mode, redirectTo);
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) return;
        setMessage(`We could not connect to ${provider}. Please try again.`);
        setIsSuccess(false);
      }
    });
  };

  const isLockedOut = lockoutSeconds !== null && lockoutSeconds > 0;
  const isButtonDisabled = isPending || isLockedOut;
  const contentKey = isForgotPasswordMode
    ? isForgotSuccess
      ? "forgot-success"
      : "forgot-form"
    : isSuccess && mode === "signup"
      ? "signup-success"
      : mode;

  const toggleMode = () => {
    const nextMode = mode === "login" ? "signup" : "login";
    setMode(nextMode);
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setMessage("");
    if (lockoutSeconds !== null) setLockoutSeconds(null);
    setIsSuccess(false);

    if (typeof window !== "undefined") {
      const search = window.location.search || "";
      window.history.replaceState(null, "", `/${nextMode}${search}`);
    }
  };

  return (
    <div className="w-full max-w-sm selection:bg-neutral-200 selection:text-neutral-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100">
      <div key={contentKey} className="login-mode-transition">
        {isForgotPasswordMode ? (
          isForgotSuccess ? (
            <section className="login-success-transition flex min-h-72 flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)]">
                <Check className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <h1 className="mt-7 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Check your email
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                We&apos;ve sent a password reset link to{" "}
                <strong className="font-semibold text-neutral-900 dark:text-white">{email}</strong>.
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">The recovery link is valid for 1 hour.</p>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setIsForgotSuccess(false);
                  setMode("login");
                  setMessage("");
                  setEmailError("");
                  setPasswordError("");
                }}
                className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 shadow-xs transition-colors hover:bg-neutral-50 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100"
              >
                Back to log in
              </button>
            </section>
          ) : (
            <>
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setMessage("");
                    setEmailError("");
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 rounded"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to log in</span>
                </button>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Reset your password
              </h1>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Enter your email address and we&apos;ll send you a recovery link.
              </p>

              <form onSubmit={handleForgotPasswordSubmit} noValidate className="mt-8 space-y-4">
                <div>
                  <label
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300"
                    htmlFor="reset-email"
                  >
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    disabled={isPending}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (emailError) setEmailError("");
                      if (message) setMessage("");
                    }}
                    placeholder="you@example.com"
                    aria-invalid={Boolean(emailError || message)}
                    aria-describedby={emailError ? "reset-email-error" : undefined}
                    className={`h-11 w-full rounded-lg border px-3.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 dark:text-white dark:placeholder-neutral-500 ${
                      emailError || message
                        ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-950/20"
                        : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
                    }`}
                  />
                  {emailError && (
                    <p
                      id="reset-email-error"
                      className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                {message && (
                  <div
                    role="alert"
                    className="login-error-transition flex items-center gap-2.5 rounded-lg border border-red-200/80 bg-red-50/70 px-3.5 py-2.5 text-[13px] font-medium leading-snug text-red-700 shadow-2xs dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span>{message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Send reset link</span>
                </button>
              </form>
            </>
          )
        ) : isSuccess && mode === "signup" ? (
          <section className="login-success-transition flex min-h-72 flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)]">
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </div>
            <h1 className="mt-7 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              Account created!
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              Welcome to NovaStage Beta! Directing you to your dashboard...
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>Entering workspace...</span>
            </div>
          </section>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              {mode === "login" ? "Log in" : "Create an account"}
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {mode === "login"
                ? "Welcome back to NovaStage."
                : "Get started with NovaStage Beta."}
            </p>

            <div className="mt-8">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleOAuth("github")}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-200 dark:hover:border-[#384961] dark:hover:bg-[#1e2634] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GitHubIcon className="h-4 w-4" />
                {mode === "login" ? "Continue with GitHub" : "Sign up with GitHub"}
              </button>
            </div>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-[#283548]" />
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {mode === "login" ? "or continue with email" : "or sign up with email"}
              </span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-[#283548]" />
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isPending}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (emailError) setEmailError("");
                    if (message) setMessage("");
                    if (lockoutSeconds !== null) setLockoutSeconds(null);
                    setIsSuccess(false);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(emailError || (message && mode === "signup"))}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className={`h-11 w-full rounded-lg border px-3.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 dark:text-white dark:placeholder-neutral-500 ${
                    emailError || (message && mode === "signup" && !isSuccess)
                      ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-950/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
                  }`}
                />
                {emailError && (
                  <p
                    id="email-error"
                    className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    className="cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordMode(true);
                        setIsForgotSuccess(false);
                        setEmailError("");
                        setPasswordError("");
                        setConfirmPasswordError("");
                        setMessage("");
                      }}
                      className="cursor-pointer text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 rounded"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    disabled={isPending}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (passwordError) setPasswordError("");
                      if (message) setMessage("");
                      if (lockoutSeconds !== null) setLockoutSeconds(null);
                    }}
                    placeholder="••••••••"
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={passwordError ? "password-error" : undefined}
                    className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 dark:text-white dark:placeholder-neutral-500 ${
                      passwordError
                        ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-950/20"
                        : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-md transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:hover:bg-[#1e2634] dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                      passwordError ? "text-red-500 dark:text-red-400" : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p
                    id="password-error"
                    className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordError}</span>
                  </p>
                )}
                {mode === "signup" && <PasswordStrength password={password} />}
              </div>

              {mode === "signup" && (
                <div>
                  <label
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300"
                    htmlFor="confirmPassword"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={isPending}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        if (confirmPasswordError) setConfirmPasswordError("");
                        if (message) setMessage("");
                      }}
                      placeholder="••••••••"
                      aria-invalid={Boolean(confirmPasswordError)}
                      aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
                      className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 dark:text-white dark:placeholder-neutral-500 ${
                        confirmPasswordError
                          ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-950/20"
                          : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-md transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:hover:bg-[#1e2634] dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                        confirmPasswordError ? "text-red-500 dark:text-red-400" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <p
                      id="confirm-password-error"
                      className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{confirmPasswordError}</span>
                    </p>
                  )}
                </div>
              )}

              {message && (
                <div
                  role="alert"
                  className={`login-error-transition flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium leading-snug shadow-2xs ${
                    isSuccess
                      ? "border-emerald-200/80 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-red-200/80 bg-red-50/70 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                  }`}
                >
                  {isSuccess ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  )}
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isButtonDisabled}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login"
                  ? isLockedOut
                    ? `Try again in ${lockoutSeconds}s`
                    : "Log in"
                  : isLockedOut
                    ? `Try again in ${lockoutSeconds}s`
                    : "Create account"}
              </button>
            </form>
          </>
        )}

        {!isForgotPasswordMode && (
          <p className="mt-8 text-center text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">
            {mode === "login" ? "Don't have an account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="inline-flex min-h-10 cursor-pointer items-center rounded px-1 font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900 dark:text-white dark:decoration-neutral-600 dark:hover:decoration-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
