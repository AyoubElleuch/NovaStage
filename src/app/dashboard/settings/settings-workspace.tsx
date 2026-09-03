"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { DashboardSettingsData } from "@/lib/dashboard-data";
import UserAvatar from "@/components/ui/user-avatar";
import { AppearanceForm, DeleteAccountForm, ProfileForm, PasswordForm } from "./settings-forms";
import SettingsLoading from "./loading";

export default function SettingsWorkspace() {
  const { data, isLoading } = useSWR<DashboardSettingsData>(
    "/api/dashboard/settings",
    fetcher<DashboardSettingsData>
  );

  if (isLoading && !data) {
    return <SettingsLoading />;
  }

  const email = data?.email || "";
  const profile = data?.profile || {};
  const displayName = profile.full_name || email.split("@")[0] || "NovaStage member";
  const joinedDate = profile.created_at
    ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
        new Date(profile.created_at)
      )
    : "Recently";

  return (
    <div className="max-w-3xl space-y-6">
      <header className="dash-enter">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Your identity, security, appearance, and personal workspace details.
        </p>
      </header>

      <section
        className="dash-enter flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:gap-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27]"
        style={{ "--dash-delay": "70ms" } as React.CSSProperties}
      >
        <UserAvatar
          src={profile.avatar_url}
          name={displayName}
          email={email}
          size="lg"
          className="shadow-sm"
        />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{displayName}</h2>
          <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">{email}</p>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Member since {joinedDate}</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Active
        </span>
      </section>

      <div className="space-y-6">
        <AppearanceForm />
        <ProfileForm profile={profile} email={email} />
        <PasswordForm />
        <DeleteAccountForm fullName={profile.full_name} />
      </div>
    </div>
  );
}
