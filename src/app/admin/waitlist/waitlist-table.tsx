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
          message: `${email} was approved and the user account was created.`,
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
    <div className="admin-waitlist">
      <div className="admin-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filter waitlist by status">
          {(["all", "pending", "approved", "disapproved"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`admin-tab ${statusFilter === status ? "admin-tab--active" : ""}`}
              role="tab"
              aria-selected={statusFilter === status}
            >
              {status}
              <span>{status === "all" ? data.length : data.filter((item) => item.status === status).length}</span>
            </button>
          ))}
        </div>

        <label className="admin-search">
          <Search aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by email"
            aria-label="Search by email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <colgroup>
            <col className="admin-table__column--email" />
            <col className="admin-table__column--source" />
            <col className="admin-table__column--status" />
            <col className="admin-table__column--account" />
            <col className="admin-table__column--submitted" />
            <col className="admin-table__column--actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Email</th>
              <th>Source</th>
              <th>Status</th>
              <th>Account</th>
              <th>Submitted</th>
              <th className="admin-table__actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-table__empty">
                  No waitlist records found.
                </td>
              </tr>
            ) : (
              filteredData.map((row) => {
                const isRowPending = isPending && activeActionEmail === row.email;

                return (
                  <tr key={row.email}>
                    <td className="admin-table__email">
                      {row.email}
                    </td>

                    <td className="admin-table__muted">
                      {row.provider}
                    </td>

                    <td>
                      <span className={`admin-status admin-status--${row.status}`}>
                        <i aria-hidden="true" />
                        {row.status}
                      </span>
                    </td>

                    <td>
                      {row.has_active_user ? (
                        <span className="admin-account admin-account--active">
                          <UserRoundCheck aria-hidden="true" />
                          Active
                        </span>
                      ) : (
                        <span className="admin-account">
                          <UserRoundX aria-hidden="true" />
                          No account
                        </span>
                      )}
                    </td>

                    <td className="admin-table__muted">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                    </td>

                    <td className="admin-table__actions">
                      <div className="admin-row-actions">
                        {isRowPending ? (
                          <span className="admin-loading">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Updating...
                          </span>
                        ) : (
                          <>
                            {row.status !== "approved" && (
                              <button
                                type="button"
                                onClick={() => handleApprove(row.email)}
                                title="Approve applicant and create user account"
                                className="admin-action admin-action--primary"
                              >
                                {row.status === "disapproved" ? (
                                  <RotateCcw className="h-3 w-3" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                {row.status === "disapproved" ? "Re-Approve" : "Approve"}
                              </button>
                            )}

                            {row.status !== "disapproved" && (
                              <button
                                type="button"
                                onClick={() => handleDisapprove(row.email)}
                                title="Mark registration as disapproved"
                                className="admin-action"
                              >
                                <XCircle className="h-3 w-3" />
                                Disapprove
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
  );
}
