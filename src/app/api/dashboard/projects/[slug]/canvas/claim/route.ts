import { NextRequest, NextResponse } from "next/server";
import { getProjectBySlug, isProjectMember, isProjectOwner } from "@/lib/projects";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimCanvasNodeDirect, releaseCanvasNodeDirect } from "@/lib/canvas/server";

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
    const { action, node_id, request_id, accept } = body;
    const adminClient = createAdminClient();

    // 1. Direct Claim Acquisition
    if (action === "claim") {
      const result = await claimCanvasNodeDirect(node_id, project.id, session.user.id);
      return NextResponse.json(result);
    }

    // 2. Direct Claim Release
    if (action === "release") {
      const result = await releaseCanvasNodeDirect(node_id, project.id, session.user.id);
      return NextResponse.json(result);
    }

    // 3. Heartbeat Lease Renewal
    if (action === "heartbeat") {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error } = await adminClient
        .from("canvas_nodes")
        .update({
          claim_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", node_id)
        .eq("project_id", project.id)
        .eq("claimed_by", session.user.id);

      return NextResponse.json({ success: !error, expiresAt });
    }

    // 4. Request Claim Handoff from Holder
    if (action === "request_claim") {
      const { data: node } = await adminClient
        .from("canvas_nodes")
        .select("id, title, claimed_by")
        .eq("id", node_id)
        .eq("project_id", project.id)
        .maybeSingle();

      if (!node || !node.claimed_by) {
        // If node is actually unheld, claim it directly
        const claimRes = await claimCanvasNodeDirect(node_id, project.id, session.user.id);
        return NextResponse.json({ ...claimRes, autoClaimed: true });
      }

      if (node.claimed_by === session.user.id) {
        return NextResponse.json({ success: true, message: "You already own this claim" });
      }

      // Insert claim request
      const { data: claimReq, error: reqErr } = await adminClient
        .from("canvas_claim_requests")
        .insert({
          project_id: project.id,
          node_id: node.id,
          requester_id: session.user.id,
          current_holder_id: node.claimed_by,
          status: "pending",
        })
        .select()
        .single();

      if (reqErr) {
        return NextResponse.json({ error: reqErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        request: claimReq,
        current_holder_id: node.claimed_by,
        node_title: node.title,
      });
    }

    // 5. Resolve Claim Handoff (Grant / Decline)
    if (action === "resolve_claim") {
      const { data: claimReq } = await adminClient
        .from("canvas_claim_requests")
        .select("*")
        .eq("id", request_id)
        .eq("project_id", project.id)
        .maybeSingle();

      if (!claimReq || claimReq.status !== "pending") {
        return NextResponse.json({ error: "Claim request expired or invalid" }, { status: 400 });
      }

      const isOwner = await isProjectOwner(project.id, session.user.id);
      if (claimReq.current_holder_id !== session.user.id && !isOwner) {
        return NextResponse.json({ error: "Not authorized to resolve this request" }, { status: 403 });
      }

      const now = new Date();
      if (accept) {
        // Transfer node to requester
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
        await adminClient
          .from("canvas_nodes")
          .update({
            claimed_by: claimReq.requester_id,
            claimed_at: now.toISOString(),
            claim_expires_at: expiresAt,
            updated_at: now.toISOString(),
          })
          .eq("id", claimReq.node_id)
          .eq("project_id", project.id);

        await adminClient
          .from("canvas_claim_requests")
          .update({
            status: "granted",
            resolved_at: now.toISOString(),
          })
          .eq("id", request_id);

        return NextResponse.json({ success: true, status: "granted", new_holder_id: claimReq.requester_id });
      } else {
        await adminClient
          .from("canvas_claim_requests")
          .update({
            status: "declined",
            resolved_at: now.toISOString(),
          })
          .eq("id", request_id);

        return NextResponse.json({ success: true, status: "declined" });
      }
    }

    // 6. Force Owner Revoke / Unlock
    if (action === "force_unlock") {
      const isOwner = await isProjectOwner(project.id, session.user.id);
      if (!isOwner) {
        return NextResponse.json({ error: "Only project owners can force unlock nodes" }, { status: 403 });
      }

      await adminClient
        .from("canvas_nodes")
        .update({
          claimed_by: null,
          claimed_at: null,
          claim_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", node_id)
        .eq("project_id", project.id);

      return NextResponse.json({ success: true, unlocked: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Canvas Claim API error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
