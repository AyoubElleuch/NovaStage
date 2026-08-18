import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { leaveProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * POST /api/dashboard/projects/leave
 * Allows a collaborator to leave a project.
 */
export async function POST(request: Request) {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projectId = String(body.projectId || body.id || "").trim();

    if (!projectId) {
      return NextResponse.json({ error: "Missing project ID." }, { status: 400 });
    }

    const result = await leaveProject({
      projectId,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Could not leave project." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "You have left the project." });
  } catch (error) {
    console.error("Error in leave project API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while leaving the project." },
      { status: 500 }
    );
  }
}
