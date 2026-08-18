import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { dashboardProjects, type DashboardProjectsData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data: DashboardProjectsData = {
    projects: dashboardProjects,
    userName: session.profile?.full_name || session.user.email?.split("@")[0] || "Developer",
  };

  return NextResponse.json(data);
}
