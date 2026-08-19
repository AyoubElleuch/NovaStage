import { getWaitlistEntries } from "./actions";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Sparkles,
  UsersRound,
  XCircle,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const { data: waitlist = [] } = await getWaitlistEntries();

  const total = waitlist.length;
  const pending = waitlist.filter((w) => w.status === "pending").length;
  const approved = waitlist.filter((w) => w.status === "approved").length;
  const disapproved = waitlist.filter((w) => w.status === "disapproved").length;

  const statCards = [
    {
      label: "Total registrations",
      value: total,
      icon: UsersRound,
      iconBg: "bg-neutral-100 text-neutral-700",
    },
    {
      label: "Needs review",
      value: pending,
      icon: Clock3,
      iconBg: "bg-amber-50 text-amber-600 border border-amber-200/60",
    },
    {
      label: "Approved",
      value: approved,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/60",
    },
    {
      label: "Disapproved",
      value: disapproved,
      icon: XCircle,
      iconBg: "bg-neutral-100 text-neutral-500 border border-neutral-200/60",
    },
  ];

  return (
    <div className="space-y-10">
      <header className="dash-enter flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
            Good morning, admin.
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            A clear view of access requests across NovaStage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/admin/ai-limits"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-800 shadow-xs transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>AI Limits</span>
          </Link>
          <Link
            href="/admin/waitlist"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-neutral-700 active:scale-[0.98]"
          >
            <span>Review waitlist</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section
        aria-label="Waitlist summary"
        className="dash-enter grid gap-4 grid-cols-2 lg:grid-cols-4"
        style={{ "--dash-delay": "90ms" } as React.CSSProperties}
      >
        {statCards.map(({ label, value, icon: Icon, iconBg }) => (
          <div
            key={label}
            className="rounded-xl border border-neutral-200 bg-white p-5 transition-all duration-150 hover:border-neutral-300 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">{label}</span>
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${iconBg}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">{value}</p>
          </div>
        ))}
      </section>

      <section
        className="dash-enter rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs"
        style={{ "--dash-delay": "160ms" } as React.CSSProperties}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Latest activity
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-neutral-900">Recent registrations</h2>
          </div>
          <Link
            href="/admin/waitlist"
            className="group inline-flex items-center gap-1 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            <span>View all</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div>
          {waitlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-400">
                <UsersRound className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-neutral-900">No registrations recorded yet</p>
              <p className="mt-1 text-xs text-neutral-500">Waitlist applications will appear here as users sign up.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {waitlist.slice(0, 5).map((entry) => (
                <div
                  key={entry.email}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-neutral-50/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                      {(entry.email?.[0] || "U").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{entry.email}</p>
                      <p className="text-xs text-neutral-400 capitalize">Via {entry.provider}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        entry.status === "approved"
                          ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700"
                          : entry.status === "pending"
                          ? "border border-amber-200/80 bg-amber-50 text-amber-700"
                          : "border border-neutral-200 bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          entry.status === "approved"
                            ? "bg-emerald-500"
                            : entry.status === "pending"
                            ? "bg-amber-500"
                            : "bg-neutral-400"
                        }`}
                      />
                      <span className="capitalize">{entry.status}</span>
                    </span>

                    <time className="text-xs text-neutral-400 min-w-[70px] text-right">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
