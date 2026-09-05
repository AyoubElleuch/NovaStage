import { NextRequest, NextResponse } from "next/server";
import { getProjectBySlug, isProjectMember } from "@/lib/projects";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { executeAIPipeline } from "@/lib/ai/pipeline";
import { CanvasAIContext } from "@/lib/ai/types";
import { getProjectCanvasData, applyAIWorkflowResult, applyAWSServiceNodes } from "@/lib/canvas/server";

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  let projectToUnlock: string | null = null;
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
    const mode = typeof body?.mode === "string" ? body.mode : "workflow";

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required to generate or update a workflow" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Acquire Project AI Generation Collision Lock
    const { data: lockResult, error: lockErr } = await supabase.rpc(
      "acquire_project_ai_lock",
      {
        p_project_id: project.id,
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
            "Another collaborator is currently using AI for this project. Please wait.",
          generatingUser: lockResult.generating_user || "A collaborator",
        },
        { status: 409 }
      );
    }

    // Set lock tracking for cleanup in finally block
    projectToUnlock = project.id;

    // 2. Atomically consume user AI quota (hard 10 requests limit enforced at DB level)
    const { data: quotaResult, error: quotaErr } = await supabase.rpc(
      "consume_user_ai_quota"
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
            "You have reached your limit of 10 AI workflow requests.",
          requests_used: quotaResult.requests_used ?? 10,
          requests_remaining: quotaResult.requests_remaining ?? 0,
        },
        { status: 403 }
      );
    }

    quotaConsumed = true;

    // 3. Load current canvas graph state to provide as context
    const currentCanvasData = await getProjectCanvasData(project.id);
    const aiContext: CanvasAIContext = {
      existingMilestones: currentCanvasData.nodes.map((n, idx) => ({
        id: n.id,
        order: n.sort_order ?? idx,
        title: n.title,
        description: n.description,
        color: n.color,
        status: n.status,
        checkpoints: (n.checkpoints || []).map((cp) => ({
          id: cp.id,
          title: cp.title,
          is_completed: cp.is_completed,
          sort_order: cp.sort_order,
        })),
      })),
      existingEdges: currentCanvasData.edges.map((e) => ({
        id: e.id,
        sourceId: e.source_node_id,
        targetId: e.target_node_id,
      })),
    };

    // 4. Call Multi-Phase AI Pipeline to generate or update structured DAG workflow
    let workflowResult;
    try {
      workflowResult = await executeAIPipeline(prompt, mode, aiContext);
    } catch (aiErr: unknown) {
      console.error("Gemini AI Processing failed:", aiErr);

      // Rollback consumed quota on AI API failure
      if (quotaConsumed) {
        await supabase.rpc("restore_user_ai_quota");
        quotaConsumed = false;
      }

      const errMsg =
        aiErr instanceof Error
          ? aiErr.message
          : "Failed to process workflow with AI";
      return NextResponse.json(
        { error: "AI_GENERATION_FAILED", message: errMsg },
        { status: 502 }
      );
    }

    // 5. Apply graph mutations, insertions, rewiring, or parallel generation
    let finalNodes = currentCanvasData.nodes;
    let finalEdges = currentCanvasData.edges;

    // Apply milestone changes if present
    let milestoneTempIdMap: Record<string, string> = {};
    if (workflowResult.milestones && workflowResult.milestones.length > 0) {
      const reconciled = await applyAIWorkflowResult(
        project.id,
        workflowResult,
        currentCanvasData
      );
      finalNodes = reconciled.nodes;
      finalEdges = reconciled.edges;
      milestoneTempIdMap = reconciled.tempIdToUuid || {};
    }

    // Apply AWS architecture nodes if present
    const hasAWSContent =
      (workflowResult.serviceNodes && workflowResult.serviceNodes.length > 0) ||
      (workflowResult.groups && workflowResult.groups.length > 0);

    if (hasAWSContent) {
      const awsReconciled = await applyAWSServiceNodes(
        project.id,
        workflowResult,
        { nodes: finalNodes, edges: finalEdges },
        milestoneTempIdMap
      );
      finalNodes = awsReconciled.nodes;
      finalEdges = awsReconciled.edges;
    }

    return NextResponse.json({
      success: true,
      intent: workflowResult.intent,
      mode: workflowResult.mode,
      summary: workflowResult.summary,
      nodes: finalNodes,
      edges: finalEdges,
      requests_used: quotaResult.requests_used,
      requests_remaining: quotaResult.requests_remaining,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("AI Workflow route error:", err);

    // Rollback quota if error happened after consumption
    if (quotaConsumed) {
      try {
        const supabase = await createClient();
        await supabase.rpc("restore_user_ai_quota");
      } catch (restoreErr) {
        console.error("Failed to restore AI quota on error:", restoreErr);
      }
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  } finally {
    // 6. Always release project lock when done
    if (projectToUnlock) {
      try {
        const supabase = await createClient();
        await supabase.rpc("release_project_ai_lock", {
          p_project_id: projectToUnlock,
        });
      } catch (releaseErr) {
        console.error("Failed to release AI lock on complete:", releaseErr);
      }
    }
  }
}
