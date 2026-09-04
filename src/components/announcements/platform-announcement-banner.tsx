"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  parsePlatformAnnouncement,
  PlatformAnnouncement,
} from "@/lib/announcements/types";

interface PlatformAnnouncementBannerProps {
  initialAnnouncement: PlatformAnnouncement | null;
}

const severityStyles = {
  low: {
    container: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/45 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-300",
    label: "Notice",
    Icon: Info,
  },
  medium: {
    container: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/45 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-300",
    label: "Attention",
    Icon: AlertTriangle,
  },
  high: {
    container: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/45 dark:text-red-100",
    icon: "text-red-600 dark:text-red-300",
    label: "Important",
    Icon: OctagonAlert,
  },
} as const;

export default function PlatformAnnouncementBanner({
  initialAnnouncement,
}: PlatformAnnouncementBannerProps) {
  const [announcement, setAnnouncement] = useState(initialAnnouncement);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const refreshAnnouncement = async () => {
      const { data, error } = await supabase
        .from("platform_announcements")
        .select("id, message, severity, is_active, updated_at, updated_by")
        .eq("id", "platform")
        .eq("is_active", true)
        .maybeSingle();

      if (!isMounted || error) return;
      setAnnouncement(parsePlatformAnnouncement(data));
    };

    const channel = supabase
      .channel("platform-announcement")
      .on("broadcast", { event: "announcement:changed" }, () => {
        void refreshAnnouncement();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "platform_announcements",
          filter: "id=eq.platform",
        },
        () => {
          void refreshAnnouncement();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!announcement?.is_active || !announcement.message.trim()) return null;

  const style = severityStyles[announcement.severity];
  const Icon = style.Icon;

  return (
    <div
      className={`w-full border-b px-4 py-2.5 ${style.container}`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex min-h-5 w-full max-w-7xl items-center justify-center gap-2 text-center text-xs font-medium sm:text-sm">
        <Icon className={`h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
        <span className="sr-only">{style.label}: </span>
        <p className="min-w-0 whitespace-pre-wrap wrap-break-word">{announcement.message}</p>
      </div>
    </div>
  );
}