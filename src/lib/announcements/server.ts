import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePlatformAnnouncement, PlatformAnnouncement } from "./types";

export async function getActivePlatformAnnouncement(): Promise<PlatformAnnouncement | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_announcements")
      .select("id, message, severity, is_active, updated_at, updated_by")
      .eq("id", "platform")
      .eq("is_active", true)
      .maybeSingle();

    if (error) return null;
    return parsePlatformAnnouncement(data);
  } catch {
    return null;
  }
}

export async function broadcastPlatformAnnouncementChange(): Promise<void> {
  const supabase = createAdminClient();
  const channel = supabase.channel("platform-announcement");

  try {
    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(resolve, 5000);

      channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED") {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            clearTimeout(timeoutId);
            resolve();
          }
          return;
        }

        await channel.send({
          type: "broadcast",
          event: "announcement:changed",
          payload: { changedAt: new Date().toISOString() },
        });
        clearTimeout(timeoutId);
        resolve();
      });
    });
  } finally {
    await supabase.removeChannel(channel);
  }
}