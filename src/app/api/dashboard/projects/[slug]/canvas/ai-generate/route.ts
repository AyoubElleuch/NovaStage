import { NextRequest, NextResponse } from "next/server";
import { getProjectBySlug, isProjectMember } from "@/lib/projects";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWorkflowWithGemini } from "@/lib/ai/gemini";
import { createBatchCanvasWorkflow } from "@/lib/canvas/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  let projectToUnlock: string | null = null;
  let userToUnlock: string | null = null;
  let quotaConsumed = false;

  try {
    const session = await getAuthenticatedProfile();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const project = await getProjectBySlug(slug);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = await isProjectMember(project.id, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required to generate a workflow" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Acquire Project AI Generation Collision Lock
    const { data: lockResult, error: lockErr } = await adminClient.rpc(
      "acquire_project_ai_lock",
      {
        p_project_id: project.id,
        p_user_id: session.user.id,
      }
    );

    if (lockErr) {
      console.error("Lock RPC error:", lockErr);
      return NextResponse.json(
        { error: "Failed to verify project AI availability" },
        { status: 500 }
      );
    }

    if (lockResult && !lockResult.success) {
      return NextResponse.json(
        {
          error: "COLLISION_LOCKED",
          message:
            lockResult.error ||
            "Another collaborator is currently generating a workflow for this project. Please wait.",
          generatingUser: lockResult.generating_user || "A collaborator",
        },
        { status: 409 }
      );
    }

    // Set lock tracking for cleanup in finally block
    projectToUnlock = project.id;
    userToUnlock = session.user.id;

    // 2. Atomically consume user AI quota (hard 10 requests limit enforced at DB level)
    const { data: quotaResult, error: quotaErr } = await adminClient.rpc(
      "consume_user_ai_quota",
      {
        p_user_id: session.user.id,
      }
    );

    if (quotaErr) {
      console.error("Quota RPC error:", quotaErr);
      return NextResponse.json(
        { error: "Failed to verify AI request quota" },
        { status: 500 }
      );
    }

    if (quotaResult && !quotaResult.success) {
      return NextResponse.json(
        {
          error: "QUOTA_EXCEEDED",
          message:
            quotaResult.error ||
            "You have reached your limit of 10 AI workflow generation requests.",
          requests_used: quotaResult.requests_used ?? 10,
          requests_remaining: quotaResult.requests_remaining ?? 0,
        },
        { status: 403 }
      );
    }

    quotaConsumed = true;

    // 3. Call Google Gemini to generate structured DAG workflow
    let workflow;
    try {
      workflow = await generateWorkflowWithGemini(prompt);
    } catch (aiErr: unknown) {
      console.error("Gemini Generation failed:", aiErr);

      // Rollback consumed quota on AI API failure
      if (quotaConsumed) {
        await adminClient.rpc("restore_user_ai_quota", {
          p_user_id: session.user.id,
        });
        quotaConsumed = false;
      }

      const errMsg =
        aiErr instanceof Error
          ? aiErr.message
          : "Failed to generate workflow with AI";
      return NextResponse.json(
        { error: "AI_GENERATION_FAILED", message: errMsg },
        { status: 502 }
      );
    }

    // 4. Batch insert nodes, checkpoints, and edges with DAG auto-layout
    const { nodes, edges } = await createBatchCanvasWorkflow(
      project.id,
      workflow
    );

    return NextResponse.json({
      success: true,
      summary: workflow.summary,
      nodes,
      edges,
      requests_used: quotaResult.requests_used,
      requests_remaining: quotaResult.requests_remaining,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("AI Generation route error:", err);

    // Rollback quota if error happened after consumption
    if (quotaConsumed && userToUnlock) {
      const adminClient = createAdminClient();
      await adminClient.rpc("restore_user_ai_quota", {
        p_user_id: userToUnlock,
      });
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  } finally {
    // 5. Always release project lock when done
    if (projectToUnlock && userToUnlock) {
      const adminClient = createAdminClient();
      await adminClient.rpc("release_project_ai_lock", {
        p_project_id: projectToUnlock,
        p_user_id: userToUnlock,
      });
    }
  }
}
