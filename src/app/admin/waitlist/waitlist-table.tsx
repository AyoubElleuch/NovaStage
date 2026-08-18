"use client";

import { useState, useTransition } from "react";
import {
  WaitlistRecord,
  approveWaitlistEntry,
  disapproveWaitlistEntry,
} from "../actions";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Loader2,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";

interface WaitlistTableProps {
  initialData: WaitlistRecord[];
}

export default function WaitlistTable({ initialData }: WaitlistTableProps) {
  const [data, setData] = useState<WaitlistRecord[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "disapproved">("all");
  const [isPending, startTransition] = useTransition();
  const [activeActionEmail, setActiveActionEmail] = useState<string | null>(null);
  const { notify } = useNotifications();

  const filteredData = data.filter((item) => {
    const matchesSearch = item.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (email: string) => {
    setActiveActionEmail(email);
    startTransition(async () => {
      const res = await approveWaitlistEntry(email);
      setActiveActionEmail(null);
      if (res.success) {
        notify({
          title: "User approved",
          message: `${email} was approved and user account created.`,
          detail: res.temporaryPassword ? `Temporary password: ${res.temporaryPassword}` : undefined,
          copyText: res.temporaryPassword,
        });
        setData((prev) =>
          prev.map((item) =>
            item.email === email
              ? { ...item, status: "approved", has_active_user: true, approved_at: new Date().toISOString() }
              : item
          )
        );
      } else {
        notify({ tone: "error", title: "Approval failed", message: res.error || "The user could not be approved." });
      }
    });
  };

  const handleDisapprove = (email: string) => {
    setActiveActionEmail(email);
    startTransition(async () => {
      const res = await disapproveWaitlistEntry(email);
      setActiveActionEmail(null);
      if (res.success) {
        notify({ title: "User disapproved", message: `${email} was marked as disapproved.` });
        setData((prev) =>
          prev.map((item) =>
            item.email === email
              ? { ...item, status: "disapproved", disapproved_at: new Date().toISOString() }
              : item
          )
        );
      } else {
        notify({ tone: "error", title: "Disapproval failed", message: res.error || "The user could not be disapproved." });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="dash-enter flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Filter waitlist by status"
        >
          {(["all", "pending", "approved", "disapproved"] as const).map((status) => {
            const count =
              status === "all" ? data.length : data.filter((item) => item.status === status).length;
            const isActive = statusFilter === status;

            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                role="tab"
                aria-selected={isActive}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all duration-150 ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <span>{status}</span>
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

        <div className="relative flex items-center w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search by email…"
            aria-label="Search by email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none"
          />
        </div>
      </div>

      <div
        className="dash-enter rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden"
        style={{ "--dash-delay": "80ms" } as React.CSSProperties}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[800px]">
            <thead className="border-b border-neutral-100 bg-neutral-50/70">
              <tr>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Email
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Source
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Status
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Account
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Submitted
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-400">
                        <UsersRound className="h-5 w-5" />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-neutral-900">
                        No waitlist records found
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {searchTerm
                          ? `No results matching "${searchTerm}".`
                          : "There are no registrations matching this filter."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const isRowPending = isPending && activeActionEmail === row.email;

                  return (
                    <tr key={row.email} className="transition-colors hover:bg-neutral-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">
                            {(row.email?.[0] || "U").toUpperCase()}
                          </span>
                          <span className="font-medium text-neutral-900 truncate max-w-xs">
                            {row.email}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-500 capitalize">
                        {row.provider}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.status === "approved"
                              ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700"
                              : row.status === "pending"
                              ? "border border-amber-200/80 bg-amber-50 text-amber-700"
                              : "border border-neutral-200 bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              row.status === "approved"
                                ? "bg-emerald-500"
                                : row.status === "pending"
                                ? "bg-amber-500"
                                : "bg-neutral-400"
                            }`}
                          />
                          <span className="capitalize">{row.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {row.has_active_user ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                            <UserRoundCheck className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                            <UserRoundX className="h-3.5 w-3.5" />
                            No account
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-500 whitespace-nowrap">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isRowPending ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Updating…
                            </span>
                          ) : (
                            <>
                              {row.status !== "approved" && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(row.email)}
                                  title="Approve applicant and create user account"
                                  className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white shadow-xs transition-all duration-150 hover:bg-neutral-700 active:scale-[0.98]"
                                >
                                  {row.status === "disapproved" ? (
                                    <RotateCcw className="h-3 w-3" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                  <span>{row.status === "disapproved" ? "Re-Approve" : "Approve"}</span>
                                </button>
                              )}

                              {row.status !== "disapproved" && (
                                <button
                                  type="button"
                                  onClick={() => handleDisapprove(row.email)}
                                  title="Mark registration as disapproved"
                                  className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 shadow-xs transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98]"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Disapprove</span>
                                </button>
                              )}
                            </>
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
    </div>
  );
}
