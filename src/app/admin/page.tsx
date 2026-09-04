import { getAdminOverviewUsers } from "./actions";
import OverviewUsersTable from "./overview-users-table";
import Link from "next/link";
import {
  AlertCircle,
  Clock3,
  Flame,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const { data: users = [], error } = await getAdminOverviewUsers();

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const totalUsers = users.length;
  const activeRecently = users.filter((u) => {
    if (!u.last_sign_in_at) return false;
    const diff = now - new Date(u.last_sign_in_at).getTime();
    return diff >= 0 && diff <= sevenDaysMs;
  }).length;

  const newThisMonth = users.filter((u) => {
    if (!u.created_at) return false;
    const diff = now - new Date(u.created_at).getTime();
    return diff >= 0 && diff <= thirtyDaysMs;
  }).length;

  const neverSignedIn = users.filter((u) => !u.last_sign_in_at).length;

  const statCards = [
    {
      label: "Total users",
      value: totalUsers,
      subtext: "Signed up accounts",
      icon: UsersRound,
      iconBg: "bg-neutral-100 text-neutral-700 dark:bg-[#1e2634] dark:text-neutral-300",
    },
    {
      label: "Active recently",
      value: activeRecently,
      subtext: "Signed in past 7 days",
      icon: Flame,
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
    },
    {
      label: "New signups",
      value: newThisMonth,
      subtext: "Joined past 30 days",
      icon: UserPlus,
      iconBg: "bg-sky-50 text-sky-600 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60",
    },
    {
      label: "Never signed in",
      value: neverSignedIn,
      subtext: "Awaiting first session",
      icon: Clock3,
      iconBg: "bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
    },
  ];

  return (
    <div className="space-y-10">
      <header className="dash-enter flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Good morning, admin.
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Real-time overview of registered users, platform activity, and access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/admin/ai-limits"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-800 shadow-xs transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-200 dark:hover:border-[#384961] dark:hover:bg-[#1e2634] active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>AI Limits</span>
          </Link>
        </div>
      </header>

      {error ? (
        <div className="dash-enter flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Failed to load platform users</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <section
            aria-label="Platform users summary"
            className="dash-enter grid gap-4 grid-cols-2 lg:grid-cols-4"
            style={{ "--dash-delay": "90ms" } as React.CSSProperties}
          >
            {statCards.map(({ label, value, subtext, icon: Icon, iconBg }) => (
              <div
                key={label}
                className="rounded-xl border border-neutral-200 bg-white p-5 transition-all duration-150 hover:border-neutral-300 hover:shadow-xs dark:border-[#283548] dark:bg-[#161d27] dark:hover:border-[#384961]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${iconBg}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{value}</p>
                <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">{subtext}</p>
              </div>
            ))}
          </section>

          <OverviewUsersTable initialData={users} />
        </>
      )}
    </div>
  );
}
