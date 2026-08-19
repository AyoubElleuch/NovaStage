import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { getProjectBannedMembers, unbanProjectMember } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/projects/banned?projectId=xxx
 * Returns banned/removed members for a project (Owner only).
 */
export async function GET(request: Request) {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
  }

  try {
    const result = await getProjectBannedMembers({
      projectId,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fetch removed members." }, { status: 403 });
    }

    return NextResponse.json({ success: true, bannedMembers: result.bannedMembers || [] });
  } catch (error) {
    console.error("Error fetching removed members:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/dashboard/projects/banned
 * Unbans a removed collaborator (Owner only).
 */
export async function POST(request: Request) {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, targetUserId } = body;

    if (!projectId || !targetUserId) {
      return NextResponse.json({ error: "Project ID and target user ID are required." }, { status: 400 });
    }

    const result = await unbanProjectMember({
      projectId,
      targetUserId,
      requesterUserId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to unblock collaborator." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unbanning member:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
