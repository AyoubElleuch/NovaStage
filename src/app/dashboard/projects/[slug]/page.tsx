import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, getAuthenticatedProfile } from "@/lib/auth/session";
import { isProjectMember } from "@/lib/projects";
import { getProjectCanvasData } from "@/lib/canvas/server";
import ProjectCanvasClient from "./project-canvas-client";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireAuth("/login");
  const session = await getAuthenticatedProfile();
  const { slug } = await params;
  const adminClient = createAdminClient();

  const { data: project } = await adminClient
    .from("projects")
    .select("id, slug, name, description, invite_code, created_by, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const isMember = await isProjectMember(project.id, user.id);
  if (!isMember && project.created_by !== user.id) {
    redirect("/dashboard");
  }

  const canvasData = await getProjectCanvasData(project.id);

  const { data: memberRows } = await adminClient
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", project.id);

  const myMembership = (memberRows || []).find((m) => m.user_id === user.id);
  const isOwner = myMembership?.role === "owner" || project.created_by === user.id;

  const { data: profile } = await adminClient
    .from("profiles")
    .select("ai_requests_count, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const aiRequestsRemaining = Math.max(0, 10 - (profile?.ai_requests_count ?? 0));

  const currentUser = {
    id: user.id,
    email: user.email || "",
    fullName: profile?.full_name || session?.profile?.full_name || user.email?.split("@")[0] || "Developer",
    avatarUrl: profile?.avatar_url || session?.profile?.avatar_url || null,
  };

  return (
    <ProjectCanvasClient
      project={project}
      initialNodes={canvasData.nodes}
      initialEdges={canvasData.edges}
      initialClaimRequests={canvasData.claimRequests}
      currentUser={currentUser}
      isOwner={isOwner}
      initialAiRequestsRemaining={aiRequestsRemaining}
    />
  );
}