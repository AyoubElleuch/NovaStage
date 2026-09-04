import { AlertCircle } from "lucide-react";
import { getPlatformAnnouncement } from "../actions";
import AnnouncementEditor from "./announcement-editor";
import type { PlatformAnnouncement } from "@/lib/announcements/types";

const emptyAnnouncement: PlatformAnnouncement = {
  id: "platform",
  message: "",
  severity: "low",
  is_active: false,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

export default async function AdminBroadcastPage() {
  const { data, error } = await getPlatformAnnouncement();

  return (
    <div className="space-y-8">
      <header className="dash-enter">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Super Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Platform announcement
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Publish a high-visibility message to every NovaStage user.
        </p>
      </header>

      {error ? (
        <div className="dash-enter flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Could not load platform announcement</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      ) : (
        <AnnouncementEditor initialAnnouncement={data || emptyAnnouncement} />
      )}
    </div>
  );
}