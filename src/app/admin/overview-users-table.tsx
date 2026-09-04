"use client";

import { useState, useMemo } from "react";
import { AdminOverviewUser } from "./actions";
import UserAvatar from "@/components/ui/user-avatar";
import { Search, X, Users, Clock, Shield } from "lucide-react";

interface OverviewUsersTableProps {
  initialData: AdminOverviewUser[];
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never signed in";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds)) return "Never signed in";
  if (diffInSeconds < 0) return "Just now";
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffInSeconds < 86400 * 7) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isWithinPast7Days(dateString: string | null): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  return diffInMs >= 0 && diffInMs <= 7 * 24 * 60 * 60 * 1000;
}

export default function OverviewUsersTable({ initialData }: OverviewUsersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "never">("all");

  const counts = useMemo(() => {
    const total = initialData.length;
    const active = initialData.filter((u) => isWithinPast7Days(u.last_sign_in_at)).length;
    const never = initialData.filter((u) => !u.last_sign_in_at).length;
    return { total, active, never };
  }, [initialData]);

  const filteredUsers = useMemo(() => {
    return initialData.filter((user) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        user.email.toLowerCase().includes(term) ||
        (user.full_name && user.full_name.toLowerCase().includes(term)) ||
        (user.username && user.username.toLowerCase().includes(term)) ||
        user.role.toLowerCase().includes(term) ||
        user.provider.toLowerCase().includes(term);

      let matchesTab = true;
      if (filterTab === "active") {
        matchesTab = isWithinPast7Days(user.last_sign_in_at);
      } else if (filterTab === "never") {
        matchesTab = !user.last_sign_in_at;
      }

      return matchesSearch && matchesTab;
    });
  }, [initialData, searchTerm, filterTab]);

  return (
    <section
      className="dash-enter rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs dark:border-[#283548] dark:bg-[#161d27]"
      style={{ "--dash-delay": "160ms" } as React.CSSProperties}
    >
      {/* Header with Search and Filter Tabs */}
      <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between dark:border-[#283548]">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
              Users directory
            </p>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-[#1e2634] dark:text-neutral-300">
              {counts.total} signed up
            </span>
          </div>
          <h2 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
            All registered users
          </h2>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Filter Tabs */}
          <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-[#283548] dark:bg-[#121721]">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === "all"
                  ? "bg-white text-neutral-900 shadow-2xs dark:bg-[#1e2634] dark:text-white"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              All ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("active")}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === "active"
                  ? "bg-white text-neutral-900 shadow-2xs dark:bg-[#1e2634] dark:text-white"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              Active (7d) ({counts.active})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("never")}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === "never"
                  ? "bg-white text-neutral-900 shadow-2xs dark:bg-[#1e2634] dark:text-white"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              Never signed in ({counts.never})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users…"
              className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-9 pr-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-hidden dark:border-[#283548] dark:bg-[#121721] dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-[#384961]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-[#283548] dark:bg-[#121721]/50 dark:text-neutral-400">
              <th scope="col" className="px-5 py-3.5">
                User
              </th>
              <th scope="col" className="px-5 py-3.5">
                Role
              </th>
              <th scope="col" className="px-5 py-3.5">
                Provider
              </th>
              <th scope="col" className="px-5 py-3.5">
                Last Signed In
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Joined Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-[#283548]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-[#1e2634] dark:text-neutral-500">
                      <Users className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                      {searchTerm || filterTab !== "all"
                        ? "No users match your criteria"
                        : "No registered users found"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {searchTerm || filterTab !== "all"
                        ? "Try adjusting your search terms or filter selection."
                        : "New sign-ups will appear automatically in this list."}
                    </p>
                    {(searchTerm || filterTab !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterTab("all");
                        }}
                        className="mt-3 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300 dark:hover:bg-[#283548]"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const hasSignedIn = Boolean(user.last_sign_in_at);
                const activeRecently = isWithinPast7Days(user.last_sign_in_at);
                const relativeLastSeen = formatRelativeTime(user.last_sign_in_at);
                const fullLastSeen = user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : null;

                const joinedFormatted = user.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-neutral-50/60 dark:hover:bg-[#121721]/60"
                  >
                    {/* User Identity Column */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={user.avatar_url}
                          name={user.full_name}
                          email={user.email}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                            {user.full_name || user.email.split("@")[0]}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                              {user.email}
                            </span>
                            {user.username && (
                              <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                                @{user.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Column */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                          user.role === "super_admin" || user.role === "admin"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                            : "bg-neutral-100 text-neutral-700 dark:bg-[#1e2634] dark:text-neutral-300"
                        }`}
                      >
                        {(user.role === "super_admin" || user.role === "admin") && (
                          <Shield className="h-3 w-3" />
                        )}
                        {user.role.replace("_", " ")}
                      </span>
                    </td>

                    {/* Provider Column */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-[#1e2634] dark:text-neutral-400 capitalize">
                        {user.provider || "email"}
                      </span>
                    </td>

                    {/* Last Signed In Column */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {hasSignedIn ? (
                        <div
                          className="flex flex-col"
                          title={fullLastSeen || undefined}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                activeRecently
                                  ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                                  : "bg-neutral-300 dark:bg-neutral-600"
                              }`}
                              aria-hidden="true"
                            />
                            <span className="text-xs font-medium text-neutral-900 dark:text-white">
                              {relativeLastSeen}
                            </span>
                          </div>
                          {fullLastSeen && (
                            <span className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                              {fullLastSeen}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs text-neutral-400 dark:border-[#283548] dark:bg-[#1e2634]/60 dark:text-neutral-500">
                          <Clock className="h-3 w-3" />
                          <span>Never signed in</span>
                        </span>
                      )}
                    </td>

                    {/* Joined Date Column */}
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs text-neutral-500 dark:text-neutral-400">
                      {joinedFormatted}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
