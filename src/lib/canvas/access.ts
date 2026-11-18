import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { getProjectBySlug, isProjectMember } from "@/lib/projects";

export type CanvasRouteContext = { params: Promise<{ slug: string }> };

/** Shared member gate; owner, claim and mutation checks stay in each handler. */
export async function requireCanvasAccess(
  context: CanvasRouteContext,
  missingProjectStatus: 403 | 404 = 404,
) {
  const session = await getAuthenticatedProfile();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { slug } = await context.params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return {
      response: NextResponse.json(
        { error: missingProjectStatus === 404 ? "Project not found" : "Forbidden" },
        { status: missingProjectStatus },
      ),
    };
  }
  if (!(await isProjectMember(project.id, session.user.id))) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { response: null, session, project };
}
