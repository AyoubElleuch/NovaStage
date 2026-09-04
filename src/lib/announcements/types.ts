export type AnnouncementSeverity = "low" | "medium" | "high";

export interface PlatformAnnouncement {
  id: "platform";
  message: string;
  severity: AnnouncementSeverity;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

export function isAnnouncementSeverity(value: unknown): value is AnnouncementSeverity {
  return value === "low" || value === "medium" || value === "high";
}

export function parsePlatformAnnouncement(value: unknown): PlatformAnnouncement | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  if (
    row.id !== "platform" ||
    typeof row.message !== "string" ||
    !isAnnouncementSeverity(row.severity) ||
    typeof row.is_active !== "boolean" ||
    typeof row.updated_at !== "string"
  ) {
    return null;
  }

  return {
    id: "platform",
    message: row.message,
    severity: row.severity,
    is_active: row.is_active,
    updated_at: row.updated_at,
    updated_by: typeof row.updated_by === "string" ? row.updated_by : null,
  };
}