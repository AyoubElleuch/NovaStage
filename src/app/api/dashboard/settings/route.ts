import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import type { DashboardSettingsData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data: DashboardSettingsData = {
    email: session.user.email || session.profile?.email || "",
    profile: session.profile
      ? {
          full_name: session.profile.full_name,
          username: session.profile.username,
          avatar_url: session.profile.avatar_url,
          role: session.profile.role,
          created_at: session.profile.created_at,
        }
      : null,
  };

  return NextResponse.json(data);
}
