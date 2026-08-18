import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { joinProjectByInviteCode } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * POST /api/dashboard/projects/join
 * Joins an existing project using an invite code (NS-XXXXX).
 */
export async function POST(request: Request) {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const inviteCode = String(body.inviteCode || body.code || "").trim();

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Please enter an invite code." },
        { status: 400 }
      );
    }

    const result = await joinProjectByInviteCode({
      inviteCode,
      userId: session.user.id,
    });

    if (!result.success || !result.project) {
      return NextResponse.json(
        { error: result.error || "Could not join project." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      project: result.project,
      message: `Successfully joined ${result.project.name}!`,
    });
  } catch (error) {
    console.error("Error joining project:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while joining the project." },
      { status: 500 }
    );
  }
}
