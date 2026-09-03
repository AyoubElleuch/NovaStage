"use client";

import { AlertCircle, Check, Eye, EyeOff, Loader2, LockKeyhole, Moon, Save, ShieldAlert, Sun, UserRound, X } from "lucide-react";
import { useActionState } from "react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { deleteAccount, updatePassword, updateProfile, type SettingsActionResult } from "./actions";
import { useTheme } from "@/lib/theme-context";
import UserAvatar from "@/components/ui/user-avatar";

const initialState: SettingsActionResult = {};

const fieldClass =
  "h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none disabled:opacity-50 dark:border-[#283548] dark:bg-[#121721] dark:text-white dark:placeholder:text-neutral-500 dark:hover:border-[#384961] dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20";

const labelClass = "mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300";

const submitButton =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-neutral-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500";

const passwordRequirements = [
  { label: "8+ characters", test: (password: string) => password.length >= 8 },
  { label: "Capital letter", test: (password: string) => /[A-Z]/.test(password) },
  { label: "Small letter", test: (password: string) => /[a-z]/.test(password) },
  { label: "Number", test: (password: string) => /\d/.test(password) },
  { label: "Special character", test: (password: string) => /[^A-Za-z0-9]/.test(password) },
];

function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
          disabled={disabled}
          className={`${fieldClass} pr-11`}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((visible) => !visible)}
          className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

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
            className={`h-1 rounded-full ${password && test(password) ? barTone : "bg-neutral-200 dark:bg-[#1e2634]"}`}
          />
        ))}
      </div>
    </div>
  );
}

function FormMessage({ state }: { state: SettingsActionResult }) {
  if (!state.message && !state.error) return null;
  const isError = Boolean(state.error);

  return (
    <p
      role="status"
      className={`dash-fade inline-flex items-center gap-1.5 text-[13px] font-medium ${
        isError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {state.error || state.message}
    </p>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-[#1e2634] dark:text-neutral-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
    </div>
  );
}

export function AppearanceForm() {
  const { theme, setTheme } = useTheme();

  return (
    <section
      className="dash-enter rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27]"
      style={{ "--dash-delay": "100ms" } as React.CSSProperties}
    >
      <SectionHeader
        icon={Sun}
        title="Appearance & Theme"
        description="Select your preferred workspace theme. The default mode is light mode."
      />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Light Mode Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setTheme("light")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setTheme("light")}
          className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
            theme === "light"
              ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/30"
              : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#3a4a62]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${
                theme === "light" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-600 dark:bg-[#1e2634] dark:text-neutral-400"
              }`}>
                <Sun className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Light Mode</h3>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Default</span>
              </div>
            </div>
            <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
              theme === "light" ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-600"
            }`}>
              {theme === "light" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            Bright and clean daylight palette designed for high ambient light and daytime planning.
          </p>
        </div>

        {/* Dark Mode Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setTheme("dark")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setTheme("dark")}
          className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
            theme === "dark"
              ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/30"
              : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-[#283548] dark:bg-[#121721] dark:hover:border-[#3a4a62]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${
                theme === "dark" ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40" : "bg-neutral-100 text-neutral-600 dark:bg-[#1e2634] dark:text-neutral-400"
              }`}>
                <Moon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Dark Mode</h3>
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Eye-Friendly</span>
              </div>
            </div>
            <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
              theme === "dark" ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-600"
            }`}>
              {theme === "dark" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            Comfortable slate tones that avoid harsh pitch-black while preserving strong contrast.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ProfileForm({
  profile,
  email,
}: {
  profile: { full_name?: string | null; username?: string | null; avatar_url?: string | null };
  email: string;
}) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);
  const [avatarUrlInput, setAvatarUrlInput] = useState(profile.avatar_url || "");
  const { mutate } = useSWRConfig();

  useEffect(() => {
    setAvatarUrlInput(profile.avatar_url || "");
  }, [profile.avatar_url]);

  useEffect(() => {
    if (state.success) {
      void mutate("/api/dashboard/settings");
    }
  }, [mutate, state.success]);

  return (
    <form
      action={formAction}
      className="dash-enter rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27]"
      style={{ "--dash-delay": "140ms" } as React.CSSProperties}
    >
      <SectionHeader
        icon={UserRound}
        title="Profile"
        description="How you appear to people you collaborate with."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            defaultValue={profile.full_name || ""}
            autoComplete="name"
            required
            disabled={isPending}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="username" className={labelClass}>
            Username
          </label>
          <input
            id="username"
            name="username"
            defaultValue={profile.username || ""}
            placeholder="your-handle"
            autoComplete="username"
            disabled={isPending}
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            autoComplete="email"
            required
            disabled={isPending}
            className={fieldClass}
          />
          <p className="mt-1.5 text-xs text-neutral-400">Email changes require confirmation.</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="avatarUrl" className={labelClass}>
            Avatar URL <span className="ml-1 text-xs font-normal text-neutral-400">Optional</span>
          </label>
          <div className="flex items-center gap-3.5">
            <UserAvatar
              src={avatarUrlInput}
              name={profile.full_name}
              email={email}
              size="lg"
              className="ring-2 ring-neutral-200 dark:ring-[#283548] shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <input
                id="avatarUrl"
                name="avatarUrl"
                type="url"
                value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)}
                placeholder="https://..."
                disabled={isPending}
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                Direct image link (JPEG, PNG, WebP, SVG). Preview updates instantly as you type.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 dark:border-[#283548] pt-5">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${submitButton} ml-auto`}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  return (
    <form
      action={formAction}
      className="dash-enter rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27]"
      style={{ "--dash-delay": "210ms" } as React.CSSProperties}
    >
      <SectionHeader
        icon={LockKeyhole}
        title="Password"
        description="Keep your NovaStage account secure."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <PasswordInput
            id="password"
            name="password"
            label="New password"
            value={password}
            onChange={setPassword}
            disabled={isPending}
          />
          <PasswordStrength password={password} />
        </div>
        <PasswordInput
          id="confirmation"
          name="confirmation"
          label="Confirm password"
          value={confirmation}
          onChange={setConfirmation}
          disabled={isPending}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 dark:border-[#283548] pt-5">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${submitButton} ml-auto`}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ fullName }: { fullName?: string | null }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(deleteAccount, initialState);
  const [confirmation, setConfirmation] = useState("");
  const [nameConfirmation, setNameConfirmation] = useState("");
  const expectedName = fullName?.trim() || "";
  const canDelete =
    confirmation === "delete" &&
    Boolean(expectedName) &&
    nameConfirmation.trim().toLocaleLowerCase() === expectedName.toLocaleLowerCase();

  return (
    <>
      <section
        className="dash-enter rounded-xl border border-red-200 bg-red-50/40 p-5 sm:p-6 dark:border-red-900/40 dark:bg-red-950/20"
        style={{ "--dash-delay": "280ms" } as React.CSSProperties}
      >
        <SectionHeader
          icon={ShieldAlert}
          title="Delete account"
          description="Permanently remove your NovaStage account and its data."
        />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-red-100 dark:border-red-900/30 pt-5">
          <p className="max-w-lg text-[13px] leading-5 text-red-700/80 dark:text-red-400">
            This action cannot be undone. All data attached to your account will be deleted.
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmation("");
              setNameConfirmation("");
              setDialogOpen(true);
            }}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-sm font-medium text-red-700 shadow-sm transition-colors hover:border-red-400 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 dark:border-red-800 dark:bg-[#1c2433] dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Delete account
          </button>
        </div>
      </section>

      {dialogOpen && (
        <div
          className="dash-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm dark:bg-black/60"
          role="presentation"
          onMouseDown={() => {
            if (!isPending) setDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-dialog-title"
            className="dash-pop relative w-full max-w-md rounded-2xl border border-red-200 bg-white p-7 shadow-2xl dark:border-red-900/50 dark:bg-[#161d27]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
              aria-label="Close dialog"
              className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:hover:bg-[#1e2634] dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id="delete-account-dialog-title" className="mt-5 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              Delete your account?
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              This is irreversible. When you delete your account, we&apos;ll delete all data attached to your account, all of it.
            </p>

            <form action={formAction} className="mt-6 space-y-4">
              <div>
                <label htmlFor="delete-confirmation" className={labelClass}>
                  Type <span className="font-mono text-red-700">delete</span> to continue
                </label>
                <input
                  id="delete-confirmation"
                  name="confirmation"
                  autoComplete="off"
                  autoFocus
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={isPending}
                  className={`${fieldClass} focus:border-red-400 focus:ring-red-100`}
                />
              </div>
              <div>
                <label htmlFor="name-confirmation" className={labelClass}>
                  Enter your full name: <span className="font-medium text-neutral-900">{fullName || "your profile name"}</span>
                </label>
                <input
                  id="name-confirmation"
                  name="nameConfirmation"
                  autoComplete="name"
                  required
                  value={nameConfirmation}
                  onChange={(event) => setNameConfirmation(event.target.value)}
                  disabled={isPending}
                  className={`${fieldClass} focus:border-red-400 focus:ring-red-100`}
                />
              </div>
              {state.error && (
                <p role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {state.error}
                </p>
              )}
              <button
                type="submit"
                disabled={isPending || !canDelete}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? "Deleting account…" : "Delete account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
