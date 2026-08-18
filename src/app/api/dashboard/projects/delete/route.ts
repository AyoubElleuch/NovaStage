import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { deleteProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * POST /api/dashboard/projects/delete
 * Deletes a project by ID (Owner only).
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

    const result = await deleteProject({
      projectId,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Could not delete project." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Project deleted successfully." });
  } catch (error) {
    console.error("Error in delete project API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while deleting the project." },
      { status: 500 }
    );
  }
}
