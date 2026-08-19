"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  UserAiLimitRecord,
  resetUserAiQuota,
  resetAllUsersAiQuota,
} from "../actions";
import {
  Sparkles,
  RotateCcw,
  Search,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";

interface AiLimitsTableProps {
  initialData: UserAiLimitRecord[];
}

export default function AiLimitsTable({ initialData }: AiLimitsTableProps) {
  const [data, setData] = useState<UserAiLimitRecord[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "depleted" | "in_use" | "full">("all");
  const [isPending, startTransition] = useTransition();
  const [activeResetUserId, setActiveResetUserId] = useState<string | null>(null);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [resetAllConfirmationText, setResetAllConfirmationText] = useState("");
  const { notify } = useNotifications();

  // Summary counts
  const totalUsers = data.length;
  const depletedUsers = data.filter((u) => u.ai_requests_remaining === 0).length;
  const inUseUsers = data.filter((u) => u.ai_requests_remaining < 10 && u.ai_requests_remaining > 0).length;
  const fullUsers = data.filter((u) => u.ai_requests_remaining === 10).length;
  const totalAvailableRequests = data.reduce((acc, u) => acc + u.ai_requests_remaining, 0);

  const filteredData = data.filter((user) => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchLower)) ||
      (user.username && user.username.toLowerCase().includes(searchLower));

    let matchesStatus = true;
    if (statusFilter === "depleted") {
      matchesStatus = user.ai_requests_remaining === 0;
    } else if (statusFilter === "in_use") {
      matchesStatus = user.ai_requests_remaining < 10 && user.ai_requests_remaining > 0;
    } else if (statusFilter === "full") {
      matchesStatus = user.ai_requests_remaining === 10;
    }

    return matchesSearch && matchesStatus;
  });

  const handleResetUser = (user: UserAiLimitRecord) => {
    setActiveResetUserId(user.id);
    startTransition(async () => {
      const res = await resetUserAiQuota(user.id);
      setActiveResetUserId(null);

      if (res.success) {
        notify({
          title: "AI Quota Reset",
          message: `Reset AI requests to 10/10 for ${user.email}.`,
        });
        setData((prev) =>
          prev.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  ai_requests_count: 0,
                  ai_requests_remaining: 10,
                  updated_at: new Date().toISOString(),
                }
              : item
          )
        );
      } else {
        notify({
          tone: "error",
          title: "Reset failed",
          message: res.error || "Could not reset AI quota for this user.",
        });
      }
    });
  };

  const requiredConfirmPhrase = "reset AI for all";
  const isConfirmationIdentical =
    resetAllConfirmationText.trim().toLowerCase() === requiredConfirmPhrase.toLowerCase() ||
    resetAllConfirmationText.trim().toLowerCase() === "reset ai tokens";

  const handleResetAll = () => {
    if (!isConfirmationIdentical) return;

    startTransition(async () => {
      const res = await resetAllUsersAiQuota();
      if (res.success) {
        notify({
          title: "All AI Quotas Reset",
          message: "All users have been reset to 10/10 AI requests.",
        });
        setData((prev) =>
          prev.map((item) => ({
            ...item,
            ai_requests_count: 0,
            ai_requests_remaining: 10,
            updated_at: new Date().toISOString(),
          }))
        );
        setIsResetAllModalOpen(false);
        setResetAllConfirmationText("");
      } else {
        notify({
          tone: "error",
          title: "Bulk reset failed",
          message: res.error || "Failed to reset AI quota for all users.",
        });
      }
    });
  };

  const closeModal = useCallback(() => {
    if (!isPending) {
      setIsResetAllModalOpen(false);
      setResetAllConfirmationText("");
    }
  }, [isPending]);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isResetAllModalOpen) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isResetAllModalOpen, closeModal]);

  return (
    <div className="space-y-6">
      {/* Stat Summary Cards */}
      <section
        aria-label="AI limits summary"
        className="dash-enter grid gap-4 grid-cols-2 lg:grid-cols-4"
        style={{ "--dash-delay": "60ms" } as React.CSSProperties}
      >
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs transition-all duration-150 hover:border-neutral-300">
          <p className="text-xs font-medium text-neutral-500">Total Users</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">{totalUsers}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Registered platform profiles</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs transition-all duration-150 hover:border-neutral-300">
          <p className="text-xs font-medium text-neutral-500">In Active Use</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">{inUseUsers}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Users with 1–9 requests left</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs transition-all duration-150 hover:border-neutral-300">
          <p className="text-xs font-medium text-neutral-500">Exhausted Quota</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">{depletedUsers}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Users at 0 / 10 remaining</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs transition-all duration-150 hover:border-neutral-300">
          <p className="text-xs font-medium text-neutral-500">Available Prompts</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">
            {totalAvailableRequests} <span className="text-sm font-normal text-neutral-400">/ {totalUsers * 10}</span>
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">Across all platform users</p>
        </div>
      </section>


      {/* Action Bar: Filters, Search & Reset All Button */}
      <div className="dash-enter flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ "--dash-delay": "100ms" } as React.CSSProperties}>
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Filter users by AI quota status"
        >
          {[
            { id: "all" as const, label: "All Users", count: totalUsers },
            { id: "depleted" as const, label: "Depleted (0)", count: depletedUsers },
            { id: "in_use" as const, label: "In Use (<10)", count: inUseUsers },
            { id: "full" as const, label: "Full (10/10)", count: fullUsers },
          ].map(({ id, label, count }) => {
            const isActive = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                role="tab"
                aria-selected={isActive}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "bg-neutral-800 text-neutral-200"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex items-center w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search by name, username, email…"
              aria-label="Search users by name, username, or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsResetAllModalOpen(true)}
            title="Reset AI requests to 10/10 for all users"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 text-xs font-medium text-white shadow-xs transition-all duration-150 hover:bg-neutral-800 active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            <span>Reset for all</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div
        className="dash-enter rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden"
        style={{ "--dash-delay": "140ms" } as React.CSSProperties}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[850px]">
            <thead className="border-b border-neutral-100 bg-neutral-50/70">
              <tr>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  User
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Full Name
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Username
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  AI Quota Remaining
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Role
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 px-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-400">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-neutral-900">
                        No users found
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {searchTerm
                          ? `No results matching "${searchTerm}".`
                          : "There are no users matching the selected filter."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((user) => {
                  const isUserPending = isPending && activeResetUserId === user.id;
                  const remaining = user.ai_requests_remaining;
                  const used = user.ai_requests_count;
                  const isFull = remaining === 10;
                  const isDepleted = remaining === 0;

                  return (
                    <tr key={user.id} className="transition-colors hover:bg-neutral-50/60">
                      {/* User & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                            {(user.email?.[0] || "U").toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900 max-w-xs">
                              {user.email}
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              Joined {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Full Name */}
                      <td className="px-5 py-4 text-xs font-medium text-neutral-800">
                        {user.full_name || <span className="text-neutral-400 italic">Not set</span>}
                      </td>

                      {/* Username */}
                      <td className="px-5 py-4 text-xs font-mono text-neutral-600">
                        {user.username ? `@${user.username}` : <span className="text-neutral-400 italic font-sans">Not set</span>}
                      </td>

                      {/* AI Quota Remaining Progress */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5 min-w-[170px] max-w-[210px]">
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                isFull
                                  ? "text-emerald-700"
                                  : isDepleted
                                  ? "text-red-600"
                                  : "text-amber-700"
                              }`}
                            >
                              {isFull ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span>{remaining} / 10 left</span>
                            </span>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              ({used} used)
                            </span>
                          </div>

                          {/* 10-step visual indicator */}
                          <div className="grid grid-cols-10 gap-1 h-1.5 w-full bg-neutral-100 rounded-full p-0.5 overflow-hidden">
                            {Array.from({ length: 10 }).map((_, i) => {
                              const isRemainingSlot = i < remaining;
                              let slotColor = "bg-neutral-200";
                              if (isRemainingSlot) {
                                if (isFull) slotColor = "bg-emerald-500";
                                else if (remaining > 3) slotColor = "bg-emerald-500";
                                else slotColor = "bg-amber-500";
                              } else {
                                slotColor = "bg-neutral-200/70";
                              }

                              return (
                                <span
                                  key={i}
                                  className={`h-full rounded-sm transition-colors ${slotColor}`}
                                  title={`${remaining} of 10 requests remaining`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 capitalize">
                          {user.role.replace("_", " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isUserPending ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Resetting…
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleResetUser(user)}
                              title={
                                isFull
                                  ? "Already at maximum quota (10/10)"
                                  : "Reset quota back to 10 out of 10"
                              }
                              className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all duration-150 active:scale-[0.98] ${
                                isFull
                                  ? "border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                                  : "border border-neutral-200 bg-white text-neutral-800 shadow-xs hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
                              }`}
                            >
                              <RotateCcw className="h-3 w-3 text-neutral-600" />
                              <span>Reset to 10/10</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Reset All */}
      {isResetAllModalOpen && (
        <div
          className="dash-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-all-modal-title"
            aria-describedby="reset-all-modal-description"
            className="dash-pop relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeModal}
              disabled={isPending}
              aria-label="Close dialog"
              className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Modal Icon & Header */}
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="reset-all-modal-title" className="text-lg font-semibold tracking-tight text-neutral-900">
                  Reset AI for all users?
                </h2>
                <p className="text-xs text-neutral-500">Bulk platform quota reset</p>
              </div>
            </div>

            <p id="reset-all-modal-description" className="mt-4 text-sm leading-6 text-neutral-600">
              This will reset the AI prompt quota back to <strong className="font-semibold text-neutral-900">10 out of 10</strong> for all <strong className="font-semibold text-neutral-900">{totalUsers} registered users</strong> across NovaStage.
            </p>

            {/* Strict Confirmation Input */}
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="reset-all-confirm-input" className="block text-xs font-medium text-neutral-700">
                  Type <span className="font-mono font-semibold text-neutral-950 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 select-all">{requiredConfirmPhrase}</span> to confirm:
                </label>
                <input
                  id="reset-all-confirm-input"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  required
                  placeholder={`Type "${requiredConfirmPhrase}"`}
                  value={resetAllConfirmationText}
                  onChange={(e) => setResetAllConfirmationText(e.target.value)}
                  disabled={isPending}
                  className="mt-2 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isConfirmationIdentical && !isPending) {
                      e.preventDefault();
                      handleResetAll();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-700 shadow-xs transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleResetAll}
                  disabled={!isConfirmationIdentical || isPending}
                  className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-xs font-medium text-white shadow-sm transition-all hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Resetting all…</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Reset AI for all</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
