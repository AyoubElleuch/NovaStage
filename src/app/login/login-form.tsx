"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { joinWaitlist, signIn, signInWithOAuth, requestPasswordReset } from "@/app/auth/actions";
import { GitHubIcon } from "@/components/icons";
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Loader2 } from "lucide-react";

const MINIMUM_SUBMIT_TIME = 700;

interface LoginFormProps {
  initialWaitlistSuccess?: boolean;
}

export default function LoginForm({ initialWaitlistSuccess = false }: LoginFormProps) {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const errorParam = searchParams.get("error");
  const initialErrorMessage =
    errorParam === "not_approved"
      ? "Your account is pending review. Please join the waitlist first or wait for an invitation."
      : errorParam === "auth_callback_failed"
        ? "Authentication could not be completed. Please try again."
        : "";

  const [isLoginMode, setIsLoginMode] = useState(Boolean(errorParam));
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [isForgotSuccess, setIsForgotSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState(initialErrorMessage);
  const [isSuccess, setIsSuccess] = useState(initialWaitlistSuccess);
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
      // Audio is optional and can be unavailable in some browsers or settings.
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
    const nextPasswordError = isLoginMode && !password ? "Enter your password." : "";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setMessage("");
    setIsSuccess(false);

    if (nextEmailError || nextPasswordError) return;

    startTransition(async () => {
      try {
        const startedAt = Date.now();
        const formData = new FormData();
        formData.append("email", email);
        if (isLoginMode) {
          formData.append("password", password);
          formData.append("redirectTo", redirectTo);
        }
        const result = isLoginMode ? await signIn(formData) : await joinWaitlist(formData);
        const remainingTime = MINIMUM_SUBMIT_TIME - (Date.now() - startedAt);
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }
        if (result.retryAfterSeconds) setLockoutSeconds(result.retryAfterSeconds);
        setMessage(result.message || result.error || "");
        setIsSuccess(Boolean(result.success));
        if (result.success && !isLoginMode) playSuccessChime();
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.message.includes("NEXT_REDIRECT") ||
            (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
        ) {
          return;
        }
        setMessage(
          isLoginMode
            ? "We could not log you in right now. Please try again."
            : "We could not add you right now. Please try again."
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
        await signInWithOAuth(provider, isLoginMode ? "login" : "waitlist", redirectTo);
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
    : isLoginMode
      ? "login"
      : isSuccess
        ? "success"
        : "waitlist";

  return (
    <div className="w-full max-w-sm selection:bg-neutral-200 selection:text-neutral-900">
      <div key={contentKey} className="login-mode-transition">
        {isForgotPasswordMode ? (
          isForgotSuccess ? (
            <section className="login-success-transition flex min-h-72 flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)]">
                <Check className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <h1 className="mt-7 text-3xl font-semibold tracking-tight text-neutral-900">
                Check your email
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600">
                We&apos;ve sent a password reset link to{" "}
                <strong className="font-semibold text-neutral-900">{email}</strong>.
              </p>
              <p className="mt-1 text-sm text-neutral-500">The recovery link is valid for 1 hour.</p>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setIsForgotSuccess(false);
                  setIsLoginMode(true);
                  setMessage("");
                  setEmailError("");
                  setPasswordError("");
                }}
                className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 shadow-xs transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100"
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
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 rounded"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to log in</span>
                </button>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                Reset your password
              </h1>
              <p className="mt-2 text-sm text-neutral-500">
                Enter your email address and we&apos;ll send you a recovery link.
              </p>

              <form onSubmit={handleForgotPasswordSubmit} noValidate className="mt-8 space-y-4">
                <div>
                  <label
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700"
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
                    className={`h-11 w-full rounded-lg border px-3.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 ${
                      emailError || message
                        ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10"
                        : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100"
                    }`}
                  />
                  {emailError && (
                    <p
                      id="reset-email-error"
                      className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                {message && (
                  <div
                    role="alert"
                    className="login-error-transition flex items-center gap-2.5 rounded-lg border border-red-200/80 bg-red-50/70 px-3.5 py-2.5 text-[13px] font-medium leading-snug text-red-700 shadow-2xs"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Send reset link</span>
                </button>
              </form>
            </>
          )
        ) : isSuccess && !isLoginMode ? (
          <section className="login-success-transition flex min-h-72 flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)]">
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </div>
            <h1 className="mt-7 text-3xl font-semibold tracking-tight text-neutral-900">
              You&apos;re on the list
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600">
              Your email has been added to the waitlist. We&apos;ll be in touch soon.
            </p>
            <p className="mt-1 text-sm text-neutral-500">We&apos;re happy to have you with us.</p>
          </section>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              {isLoginMode ? "Log in" : "Join the waitlist"}
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {isLoginMode
                ? "Welcome back to NovaStage."
                : "Be the first to know when NovaStage is ready."}
            </p>

            <div className="mt-8">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleOAuth("github")}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GitHubIcon className="h-4 w-4" />
                {isLoginMode ? "Continue with GitHub" : "Join with GitHub"}
              </button>
            </div>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-neutral-200" />
              <span className="text-xs text-neutral-400">
                {isLoginMode ? "or continue with email" : "or join with email"}
              </span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700"
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
                  aria-invalid={Boolean(emailError || (message && !isLoginMode))}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className={`h-11 w-full rounded-lg border px-3.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 ${
                    emailError || (message && !isLoginMode)
                      ? "border-red-300 bg-red-50/15 focus:border-red-400 focus:ring-red-500/10"
                      : "border-neutral-200 bg-white hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-100"
                  }`}
                />
                {emailError && (
                  <p
                    id="email-error"
                    className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              {isLoginMode && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      className="cursor-pointer text-sm font-medium text-neutral-700"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordMode(true);
                        setIsForgotSuccess(false);
                        setEmailError("");
                        setPasswordError("");
                        setMessage("");
                      }}
                      className="cursor-pointer text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 rounded"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
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
                      className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs transition-colors duration-150 focus:outline-none focus:ring-4 disabled:opacity-50 ${
                        passwordError
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
                  {passwordError && (
                    <p
                      id="password-error"
                      className="login-error-transition mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>
              )}

              {message && (
                <div
                  role="alert"
                  className="login-error-transition flex items-center gap-2.5 rounded-lg border border-red-200/80 bg-red-50/70 px-3.5 py-2.5 text-[13px] font-medium leading-snug text-red-700 shadow-2xs"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isButtonDisabled}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoginMode
                  ? isLockedOut
                    ? `Try again in ${lockoutSeconds}s`
                    : "Log in"
                  : isLockedOut
                    ? `Try again in ${lockoutSeconds}s`
                    : "Join the waitlist"}
              </button>
            </form>
          </>
        )}

        {!isForgotPasswordMode && (
          <p className="mt-8 text-center text-[13px] leading-5 text-neutral-500">
            {isLoginMode ? "Not on the waitlist yet?" : "Already approved?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setEmailError("");
                setPasswordError("");
                setMessage("");
                if (lockoutSeconds !== null) setLockoutSeconds(null);
                setIsSuccess(false);
              }}
              className="cursor-pointer font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100"
            >
              {isLoginMode ? "Join the waitlist" : "Log in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
