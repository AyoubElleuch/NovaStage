import Link from "next/link";
import { ArrowLeft, Crown, LayoutTemplate, Plus, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/session";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireAuth("/login");
  const { slug } = await params;
  const adminClient = createAdminClient();

  const { data: project } = await adminClient
    .from("projects")
    .select("id, slug, name, description, invite_code, created_by, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  let members: Array<{ user_id: string; role: string }> = [];
  if (project) {
    const { data: memberRows } = await adminClient
      .from("project_members")
      .select("user_id, role, joined_at")
      .eq("project_id", project.id);
    members = memberRows || [];
  }

  const projectName = project?.name || slug.replace(/-/g, " ");
  const description = project?.description || "Your shared planning space is ready for the canvas.";
  const myMembership = members.find((m) => m.user_id === user.id);
  const isOwner = myMembership?.role === "owner" || project?.created_by === user.id;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to projects
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Project workspace
            </span>
            {(myMembership || project?.created_by === user.id) && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isOwner
                    ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200/60"
                }`}
              >
                {isOwner && <Crown className="h-3 w-3" aria-hidden="true" />}
                {isOwner ? "Owner" : "Collaborator"}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 capitalize">
            {projectName}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 max-w-2xl">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {project?.invite_code && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-xs">
              <span className="text-neutral-400">Invite code:</span>
              <span className="font-mono font-semibold text-neutral-900">{project.invite_code}</span>
            </div>
          )}

          {members.length > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 shadow-xs">
              <Users className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
              <span>{members.length} {members.length === 1 ? "collaborator" : "collaborators"}</span>
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-neutral-800"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add node
          </button>
        </div>
      </header>

      <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-20 text-center shadow-xs">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-100 text-neutral-600">
          <LayoutTemplate className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-base font-semibold text-neutral-900">
          The canvas comes next
        </h2>
        <p className="mt-1.5 max-w-md text-sm text-neutral-500 leading-relaxed">
          Your project shell and collaborative membership is connected. The next step is turning this space into your drag-and-drop planning canvas.
        </p>
      </section>
    </div>
  );
}