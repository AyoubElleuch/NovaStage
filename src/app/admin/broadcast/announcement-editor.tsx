"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Info, Loader2, Megaphone, OctagonAlert, Save } from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { savePlatformAnnouncement } from "../actions";
import {
  AnnouncementSeverity,
  PlatformAnnouncement,
} from "@/lib/announcements/types";

interface AnnouncementEditorProps {
  initialAnnouncement: PlatformAnnouncement;
}

const severityOptions: Array<{
  value: AnnouncementSeverity;
  label: string;
  description: string;
  Icon: typeof Info;
  activeClasses: string;
}> = [
  {
    value: "low",
    label: "Low",
    description: "General information",
    Icon: Info,
    activeClasses: "border-sky-500 bg-sky-50 text-sky-950 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-100",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Needs attention",
    Icon: Megaphone,
    activeClasses: "border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100",
  },
  {
    value: "high",
    label: "High",
    description: "Important disruption",
    Icon: OctagonAlert,
    activeClasses: "border-red-500 bg-red-50 text-red-950 dark:border-red-400 dark:bg-red-950/40 dark:text-red-100",
  },
];

export default function AnnouncementEditor({ initialAnnouncement }: AnnouncementEditorProps) {
  const [message, setMessage] = useState(initialAnnouncement.message);
  const [severity, setSeverity] = useState<AnnouncementSeverity>(initialAnnouncement.severity);
  const [isActive, setIsActive] = useState(initialAnnouncement.is_active);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"activate" | "disable" | "draft" | null>(null);
  const { notify } = useNotifications();

  const save = (nextIsActive: boolean, action: "activate" | "disable" | "draft") => {
    setPendingAction(action);
    startTransition(async () => {
      try {
        const result = await savePlatformAnnouncement(message, severity, nextIsActive);

        if (!result.success) {
          notify({
            tone: "error",
            title: "Announcement not saved",
            message: result.error || "Could not update the platform announcement.",
          });
          return;
        }

        setMessage(message.trim());
        setIsActive(nextIsActive);
        notify({
          title: nextIsActive ? "Announcement activated" : "Announcement disabled",
          message: result.message,
        });
      } finally {
        setPendingAction(null);
      }
    });
  };

  const selectedSeverity = severityOptions.find((option) => option.value === severity) || severityOptions[0];
  const PreviewIcon = selectedSeverity.Icon;

  return (
    <div className="space-y-6">
      <section className="dash-enter rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-[#283548] dark:bg-[#161d27]">
        <div className="border-b border-neutral-100 px-5 py-4 dark:border-[#283548] sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Announcement message</h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                This message is visible across the entire platform when activated.
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-neutral-100 text-neutral-500 dark:bg-[#1e2634] dark:text-neutral-400"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-neutral-400"}`} />
              {isActive ? "Active" : "Disabled"}
            </span>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="platform-announcement-message" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Message
              </label>
              <span className={`text-[11px] ${message.length > 280 ? "text-red-600 dark:text-red-400" : "text-neutral-400 dark:text-neutral-500"}`}>
                {message.length}/280
              </span>
            </div>
            <textarea
              id="platform-announcement-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={280}
              rows={4}
              placeholder="Enter the message users should see…"
              className="mt-2 block min-h-28 w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm leading-6 text-neutral-900 shadow-xs outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/15"
            />
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Severity</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {severityOptions.map(({ value, label, description, Icon, activeClasses }) => {
                const isSelected = severity === value;
                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors ${
                      isSelected
                        ? activeClasses
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-400 dark:hover:border-[#384961]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="announcement-severity"
                      value={value}
                      checked={isSelected}
                      onChange={() => setSeverity(value)}
                      className="sr-only"
                    />
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">{label}</span>
                      <span className="mt-0.5 block text-[11px] opacity-70">{description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Preview</p>
            <div
              className={`mt-2 flex min-h-11 items-center justify-center gap-2 border px-4 py-2.5 text-center text-xs font-medium sm:text-sm ${
                severity === "low"
                  ? "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/45 dark:text-sky-100"
                  : severity === "medium"
                  ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/45 dark:text-amber-100"
                  : "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/45 dark:text-red-100"
              }`}
              role="status"
            >
              <PreviewIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 whitespace-pre-wrap wrap-break-word">
                {message.trim() || "Your announcement preview will appear here."}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-5 dark:border-[#283548]">
            <button
              type="button"
              onClick={() => save(false, "disable")}
              disabled={isPending}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-700 shadow-xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60 dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-300 dark:hover:border-[#384961] dark:hover:bg-[#1e2634]"
            >
              {isPending && pendingAction === "disable" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              Disable announcement
            </button>
            <button
              type="button"
              onClick={() => save(false, "draft")}
              disabled={isPending || message.trim().length === 0}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-800 shadow-xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-200 dark:hover:border-[#384961] dark:hover:bg-[#1e2634]"
            >
              {isPending && pendingAction === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save(true, "activate")}
              disabled={isPending || message.trim().length === 0}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {isPending && pendingAction === "activate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
              Activate for everyone
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}