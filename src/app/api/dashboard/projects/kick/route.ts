import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { kickProjectMember } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * POST /api/dashboard/projects/kick
 * Removes a collaborator from a project (Owner only).
 */
export async function POST(request: Request) {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projectId = String(body.projectId || "").trim();
    const memberId = String(body.memberId || body.targetUserId || "").trim();

    if (!projectId || !memberId) {
      return NextResponse.json(
        { error: "Both projectId and memberId are required." },
        { status: 400 }
      );
    }

    const result = await kickProjectMember({
      projectId,
      targetUserId: memberId,
      requesterUserId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Could not remove member from project." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Collaborator removed successfully.",
    });
  } catch (error) {
    console.error("Error kicking member:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while removing the member." },
      { status: 500 }
    );
  }
}
