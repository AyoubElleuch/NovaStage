import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { getProjectJoinRequests, resolveProjectJoinRequest } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/projects/requests?projectId=xxx
 * Returns pending join requests for a project (Owner only).
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
    const result = await getProjectJoinRequests({
      projectId,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fetch join requests." }, { status: 403 });
    }

    return NextResponse.json({ success: true, requests: result.requests || [] });
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/dashboard/projects/requests
 * Resolves a project join request (action: 'approve' | 'decline').
 */
export async function POST(request: Request) {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { requestId, projectId, action } = body;

    if (!requestId || !projectId || !action || !["approve", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const result = await resolveProjectJoinRequest({
      requestId,
      projectId,
      action,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to resolve join request." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      targetUserId: result.targetUserId,
      projectSlug: result.projectSlug,
    });
  } catch (error) {
    console.error("Error resolving join request:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
