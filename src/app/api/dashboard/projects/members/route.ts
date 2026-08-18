import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { getProjectMembers } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/projects/members?projectId=...
 * Fetches all collaborators of a project.
 */
export async function GET(request: Request) {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || searchParams.get("id");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId query parameter." }, { status: 400 });
  }

  try {
    const result = await getProjectMembers({
      projectId,
      userId: session.user.id,
    });

    if (!result.success || !result.members) {
      return NextResponse.json(
        { error: result.error || "Failed to load project members." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, members: result.members });
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching members." },
      { status: 500 }
    );
  }
}
