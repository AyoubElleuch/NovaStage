"use client";

import { useState, useMemo, useTransition } from "react";
import {
  AdminSubscriptionUser,
  SubscriptionPlan,
  updateUserSubscriptionPlan,
} from "../actions";
import UserAvatar from "@/components/ui/user-avatar";
import {
  Search,
  Users,
  Sparkles,
  Shield,
  Check,
  Loader2,
  AlertCircle,
  Crown,
} from "lucide-react";

interface SubscriptionsTableProps {
  initialData: AdminSubscriptionUser[];
}

const PLAN_CONFIG: Record<
  SubscriptionPlan,
  { label: string; maxAi: number; badgeClass: string; borderClass: string }
> = {
  free: {
    label: "Free",
    maxAi: 10,
    badgeClass:
      "border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300",
    borderClass: "border-neutral-200 dark:border-[#2b374a]",
  },
  plus: {
    label: "Plus ($1.99)",
    maxAi: 30,
    badgeClass:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300",
    borderClass: "border-blue-300 dark:border-blue-800",
  },
  pro: {
    label: "Pro ($4.99)",
    maxAi: 50,
    badgeClass:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-300",
    borderClass: "border-purple-300 dark:border-purple-800",
  },
  enterprise: {
    label: "Enterprise",
    maxAi: 999,
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300",
    borderClass: "border-emerald-300 dark:border-emerald-800",
  },
};

export default function SubscriptionsTable({ initialData }: SubscriptionsTableProps) {
  const [users, setUsers] = useState<AdminSubscriptionUser[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | SubscriptionPlan>("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const total = users.length;
    const free = users.filter((u) => u.plan === "free").length;
    const plus = users.filter((u) => u.plan === "plus").length;
    const pro = users.filter((u) => u.plan === "pro").length;
    const enterprise = users.filter((u) => u.plan === "enterprise").length;
    return { total, free, plus, pro, enterprise };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        user.email.toLowerCase().includes(term) ||
        (user.full_name && user.full_name.toLowerCase().includes(term)) ||
        (user.username && user.username.toLowerCase().includes(term)) ||
        user.role.toLowerCase().includes(term);

      const matchesPlan = filterPlan === "all" || user.plan === filterPlan;
      return matchesSearch && matchesPlan;
    });
  }, [users, searchTerm, filterPlan]);

  const handlePlanChange = (userId: string, newPlan: SubscriptionPlan) => {
    setUpdatingUserId(userId);
    setNotification(null);

    startTransition(async () => {
      const result = await updateUserSubscriptionPlan(userId, newPlan);
      setUpdatingUserId(null);

      if (result.error) {
        setNotification({ type: "error", message: result.error });
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
        );
        setNotification({
          type: "success",
          message: result.message || "Plan updated successfully.",
        });
      }

      setTimeout(() => {
        setNotification((current) =>
          current?.message === (result.message || result.error) ? null : current
        );
      }, 4000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-[#283548] dark:bg-[#161d27]">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {counts.total}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-[#283548] dark:bg-[#161d27]">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <span className="h-2 w-2 rounded-full bg-neutral-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Free Tier</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {counts.free}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-xs dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Plus ($1.99)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-950 dark:text-blue-100">
            {counts.plus}
          </p>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 shadow-xs dark:border-purple-900/50 dark:bg-purple-950/20">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Pro ($4.99)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-950 dark:text-purple-100">
            {counts.pro}
          </p>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {notification && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-xl border p-4 text-sm transition-all ${
            notification.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {notification.type === "success" ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Main Table Section */}
      <section className="dash-enter rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs dark:border-[#283548] dark:bg-[#161d27]">
        {/* Controls: Search & Tabs */}
        <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between dark:border-[#283548]">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              User Subscription Directory
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Super Admins can assign user tiers directly to test features before public billing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search user or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-[#2b374a] dark:bg-[#111722] dark:text-white dark:focus:border-blue-400"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 dark:border-[#2b374a] dark:bg-[#111722]">
              {(["all", "free", "plus", "pro", "enterprise"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterPlan(tab)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    filterPlan === tab
                      ? "bg-white text-neutral-900 shadow-2xs dark:bg-[#1e2634] dark:text-white"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-300">
            <thead className="border-b border-neutral-100 bg-neutral-50/70 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-[#283548] dark:bg-[#1e2634]/50 dark:text-neutral-400">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-4 py-3">System Role</th>
                <th className="px-4 py-3">Current Tier</th>
                <th className="px-4 py-3">AI Quota</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Assign Plan (Super Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#283548]/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-neutral-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isUpdating = updatingUserId === user.id;
                  const currentPlanConfig = PLAN_CONFIG[user.plan] || PLAN_CONFIG.free;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-neutral-50/50 dark:hover:bg-[#1a2230]/40"
                    >
                      {/* User Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={user.avatar_url}
                            name={user.full_name || user.username || user.email}
                            email={user.email}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900 truncate max-w-[220px] dark:text-white">
                              {user.full_name || user.username || user.email.split("@")[0]}
                            </p>
                            <p className="text-[11px] text-neutral-400 truncate max-w-[220px] dark:text-neutral-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* System Role */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-700 dark:bg-[#1e2634] dark:text-neutral-300">
                          {user.role === "super_admin" && (
                            <Shield className="h-3 w-3 text-amber-500" />
                          )}
                          {user.role.replace("_", " ")}
                        </span>
                      </td>

                      {/* Current Plan Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${currentPlanConfig.badgeClass}`}
                        >
                          {user.plan === "pro" && <Crown className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                          {user.plan === "plus" && <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
                          {user.plan.toUpperCase()}
                        </span>
                      </td>

                      {/* AI Quota Usage */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px]">
                          {user.ai_requests_count} / {currentPlanConfig.maxAi === 999 ? "∞" : currentPlanConfig.maxAi}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-3.5 text-[11px] text-neutral-400">
                        {new Date(user.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Super Admin Quick Tier Dropdown */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isUpdating && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                          )}
                          <select
                            disabled={isUpdating}
                            value={user.plan}
                            onChange={(e) =>
                              handlePlanChange(user.id, e.target.value as SubscriptionPlan)
                            }
                            aria-label={`Change plan for ${user.email}`}
                            className="h-8 cursor-pointer rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-800 transition-colors hover:border-neutral-300 focus:border-blue-500 focus:outline-none dark:border-[#2b374a] dark:bg-[#1a2230] dark:text-neutral-200 dark:hover:border-[#3b4b66] disabled:opacity-50"
                          >
                            <option value="free">Free ($0)</option>
                            <option value="plus">Plus ($1.99)</option>
                            <option value="pro">Pro ($4.99)</option>
                            <option value="enterprise">Enterprise (Custom)</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
