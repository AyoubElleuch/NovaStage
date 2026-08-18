import { NextRequest, NextResponse } from "next/server";
import { getProjectBySlug, isProjectMember } from "@/lib/projects";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
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

    const body = await request.json();
    const { action, node_id, checkpoint_id, title, is_completed } = body;
    const adminClient = createAdminClient();

    // Verify claim lock on node before altering checkpoints
    let targetNodeId = node_id;
    if (!targetNodeId && checkpoint_id) {
      const { data: cp } = await adminClient
        .from("canvas_checkpoints")
        .select("node_id")
        .eq("id", checkpoint_id)
        .maybeSingle();
      targetNodeId = cp?.node_id;
    }

    if (targetNodeId) {
      const { data: node } = await adminClient
        .from("canvas_nodes")
        .select("claimed_by, claim_expires_at")
        .eq("id", targetNodeId)
        .eq("project_id", project.id)
        .maybeSingle();

      const isExpired = Boolean(node?.claim_expires_at && new Date(node.claim_expires_at) < new Date());
      const isClaimedByMe = node?.claimed_by === session.user.id && !isExpired;
      if (!isClaimedByMe) {
        return NextResponse.json(
          { error: "You must claim this milestone box to alter or check its steps" },
          { status: 423 }
        );
      }
    }

    // 1. Toggle Checkpoint
    if (action === "toggle") {
      const now = new Date().toISOString();
      const { data: updated, error } = await adminClient
        .from("canvas_checkpoints")
        .update({
          is_completed: is_completed,
          completed_at: is_completed ? now : null,
          completed_by: is_completed ? session.user.id : null,
          updated_at: now,
        })
        .eq("id", checkpoint_id)
        .eq("project_id", project.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Automatically update parent node status if all checkpoints completed
      const { data: allCps } = await adminClient
        .from("canvas_checkpoints")
        .select("is_completed")
        .eq("node_id", updated.node_id);

      const allDone = (allCps || []).length > 0 && allCps?.every((c) => c.is_completed);
      const anyDone = (allCps || []).some((c) => c.is_completed);
      const newStatus = allDone ? "completed" : anyDone ? "in_progress" : "draft";

      await adminClient
        .from("canvas_nodes")
        .update({ status: newStatus, updated_at: now })
        .eq("id", updated.node_id);

      return NextResponse.json({ success: true, checkpoint: updated, newStatus });
    }

    // 2. Add Checkpoint
    if (action === "add") {
      const { data: existing } = await adminClient
        .from("canvas_checkpoints")
        .select("sort_order")
        .eq("node_id", node_id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data: created, error } = await adminClient
        .from("canvas_checkpoints")
        .insert({
          node_id: node_id,
          project_id: project.id,
          title: title || "New Checkpoint",
          is_completed: false,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, checkpoint: created });
    }

    // 3. Edit Checkpoint Title
    if (action === "edit") {
      const { data: edited, error } = await adminClient
        .from("canvas_checkpoints")
        .update({
          title: title,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkpoint_id)
        .eq("project_id", project.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, checkpoint: edited });
    }

    // 4. Delete Checkpoint
    if (action === "delete") {
      const { error } = await adminClient
        .from("canvas_checkpoints")
        .delete()
        .eq("id", checkpoint_id)
        .eq("project_id", project.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Canvas Checkpoints API error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
