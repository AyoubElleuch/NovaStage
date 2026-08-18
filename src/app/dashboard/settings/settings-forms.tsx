"use client";

import { AlertCircle, Check, Loader2, LockKeyhole, Save, UserRound } from "lucide-react";
import { useActionState } from "react";
import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { updatePassword, updateProfile, type SettingsActionResult } from "./actions";

const initialState: SettingsActionResult = {};

const fieldClass =
  "h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none disabled:opacity-50";

const labelClass = "mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700";

const submitButton =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-neutral-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60";

function FormMessage({ state }: { state: SettingsActionResult }) {
  if (!state.error && !state.message) return null;
  const isError = Boolean(state.error);
  return (
    <p
      role="status"
      className={`dash-fade inline-flex items-center gap-1.5 text-[13px] font-medium ${
        isError ? "text-red-600" : "text-emerald-600"
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
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500">{description}</p>
      </div>
    </div>
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
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (state.success) {
      void mutate("/api/dashboard/settings");
    }
  }, [mutate, state.success]);

  return (
    <form
      action={formAction}
      className="dash-enter rounded-xl border border-neutral-200 bg-white p-5 sm:p-6"
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
          <input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            defaultValue={profile.avatar_url || ""}
            placeholder="https://…"
            disabled={isPending}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
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

  return (
    <form
      action={formAction}
      className="dash-enter rounded-xl border border-neutral-200 bg-white p-5 sm:p-6"
      style={{ "--dash-delay": "210ms" } as React.CSSProperties}
    >
      <SectionHeader
        icon={LockKeyhole}
        title="Password"
        description="Keep your NovaStage account secure."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className={labelClass}>
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            disabled={isPending}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="confirmation" className={labelClass}>
            Confirm password
          </label>
          <input
            id="confirmation"
            name="confirmation"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            disabled={isPending}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
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
