import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { getUserProjects, createProject } from "@/lib/projects";
import type { DashboardProjectsData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/projects
 * Returns real projects associated with the authenticated user.
 */
export async function GET() {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await getUserProjects(session.user.id);

  const data: DashboardProjectsData = {
    projects,
    userName: session.profile?.full_name || session.user.email?.split("@")[0] || "Developer",
  };

  return NextResponse.json(data);
}

/**
 * POST /api/dashboard/projects
 * Creates a new project and assigns current user as owner.
 */
export async function POST(request: Request) {
  const session = await getAuthenticatedProfile();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = body.description ? String(body.description).trim() : undefined;

    if (!name) {
      return NextResponse.json({ error: "Please enter a project name." }, { status: 400 });
    }

    if (name.length > 80) {
      return NextResponse.json(
        { error: "Project name cannot exceed 80 characters." },
        { status: 400 }
      );
    }

    const result = await createProject({
      name,
      description,
      userId: session.user.id,
    });

    if (!result.success || !result.project) {
      return NextResponse.json(
        { error: result.error || "Could not create project." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, project: result.project });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating the project." },
      { status: 500 }
    );
  }
}
