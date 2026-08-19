import { createAdminClient } from "@/lib/supabase/admin";
import { CanvasNode, CanvasEdge, CanvasCheckpoint, CanvasClaimRequest, HandlePosition, NodeStatus } from "./types";

export async function getProjectCanvasData(projectId: string): Promise<{
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  claimRequests: CanvasClaimRequest[];
}> {
  const adminClient = createAdminClient();

  // Fetch nodes
  const { data: rawNodes, error: nodesErr } = await adminClient
    .from("canvas_nodes")
    .select(`
      id, project_id, title, description, status,
      position_x, position_y, width, height, color, sort_order,
      claimed_by, claimed_at, claim_expires_at, version, created_at, updated_at
    `)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (nodesErr) {
    console.error("Error loading canvas nodes:", nodesErr);
    return { nodes: [], edges: [], claimRequests: [] };
  }

  // Fetch checkpoints
  const { data: rawCheckpoints } = await adminClient
    .from("canvas_checkpoints")
    .select("id, node_id, project_id, title, is_completed, sort_order, completed_at, completed_by, created_at")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  // Fetch edges
  const { data: rawEdges } = await adminClient
    .from("canvas_edges")
    .select("id, project_id, source_node_id, target_node_id, source_handle, target_handle, created_at")
    .eq("project_id", projectId);

  // Fetch active claim requests
  const { data: rawClaims } = await adminClient
    .from("canvas_claim_requests")
    .select("id, project_id, node_id, requester_id, current_holder_id, status, created_at, resolved_at")
    .eq("project_id", projectId)
    .eq("status", "pending");

  // Fetch profiles for claimed users
  const claimedUserIds = Array.from(
    new Set(
      (rawNodes || [])
        .map((n) => n.claimed_by)
        .filter((id): id is string => Boolean(id))
    )
  );

  const profilesMap: Record<string, { fullName: string; email: string; avatarUrl: string | null }> = {};
  if (claimedUserIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", claimedUserIds);

    if (profiles) {
      for (const p of profiles) {
        profilesMap[p.id] = {
          fullName: p.full_name || p.email?.split("@")[0] || "Collaborator",
          email: p.email || "",
          avatarUrl: p.avatar_url || null,
        };
      }
    }
  }

  // Group checkpoints by node_id
  const checkpointMap: Record<string, CanvasCheckpoint[]> = {};
  for (const cp of rawCheckpoints || []) {
    if (!checkpointMap[cp.node_id]) {
      checkpointMap[cp.node_id] = [];
    }
    checkpointMap[cp.node_id].push(cp as CanvasCheckpoint);
  }

  // Assemble full nodes
  const nodes: CanvasNode[] = (rawNodes || []).map((n) => {
    const claimHolder = n.claimed_by && profilesMap[n.claimed_by]
      ? {
          id: n.claimed_by,
          email: profilesMap[n.claimed_by].email,
          fullName: profilesMap[n.claimed_by].fullName,
          avatarUrl: profilesMap[n.claimed_by].avatarUrl,
        }
      : n.claimed_by
      ? { id: n.claimed_by, email: "", fullName: "Collaborator", avatarUrl: null }
      : null;

    return {
      id: n.id,
      project_id: n.project_id,
      title: n.title,
      description: n.description || "",
      status: n.status as NodeStatus,
      position_x: Number(n.position_x),
      position_y: Number(n.position_y),
      width: Number(n.width) || 280,
      height: Number(n.height) || 170,
      color: n.color || "default",
      sort_order: n.sort_order || 0,
      claimed_by: n.claimed_by,
      claimed_at: n.claimed_at,
      claim_expires_at: n.claim_expires_at,
      claim_holder: claimHolder,
      version: n.version || 1,
      checkpoints: checkpointMap[n.id] || [],
      created_at: n.created_at,
      updated_at: n.updated_at,
    };
  });

  const edges: CanvasEdge[] = (rawEdges || []).map((e) => ({
    id: e.id,
    project_id: e.project_id,
    source_node_id: e.source_node_id,
    target_node_id: e.target_node_id,
    source_handle: (e.source_handle || "right") as HandlePosition,
    target_handle: (e.target_handle || "left") as HandlePosition,
    created_at: e.created_at,
  }));

  const claimRequests: CanvasClaimRequest[] = (rawClaims || []).map((c) => ({
    id: c.id,
    project_id: c.project_id,
    node_id: c.node_id,
    requester_id: c.requester_id,
    current_holder_id: c.current_holder_id,
    status: c.status,
    created_at: c.created_at,
    resolved_at: c.resolved_at,
  }));

  return { nodes, edges, claimRequests };
}

export async function createCanvasNode(
  projectId: string,
  data: {
    title: string;
    description?: string;
    position_x: number;
    position_y: number;
    width?: number;
    height?: number;
    checkpoints?: string[];
  },
  userId: string
): Promise<CanvasNode | null> {
  const adminClient = createAdminClient();

  const { data: node, error } = await adminClient
    .from("canvas_nodes")
    .insert({
      project_id: projectId,
      title: data.title || "New Milestone",
      description: data.description || "",
      position_x: data.position_x,
      position_y: data.position_y,
      width: data.width || 280,
      height: data.height || 170,
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
      claim_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error || !node) {
    console.error("Error creating canvas node:", error);
    return null;
  }

  // Insert initial checkpoints if provided (clean empty array by default)
  const initialCheckpoints = data.checkpoints || [];
  let createdCps: CanvasCheckpoint[] = [];

  if (initialCheckpoints.length > 0) {
    const checkpointInserts = initialCheckpoints.map((title, idx) => ({
      node_id: node.id,
      project_id: projectId,
      title,
      is_completed: false,
      sort_order: idx,
    }));

    const { data: cps } = await adminClient
      .from("canvas_checkpoints")
      .insert(checkpointInserts)
      .select();

    createdCps = (cps as CanvasCheckpoint[]) || [];
  }

  // Fetch profile for the creator to populate claim_holder accurately
  const { data: userProfile } = await adminClient
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const claimHolder = userProfile
    ? {
        id: userId,
        email: userProfile.email || null,
        fullName: userProfile.full_name || userProfile.email?.split("@")[0] || "Collaborator",
        avatarUrl: userProfile.avatar_url || null,
      }
    : {
        id: userId,
        email: null,
        fullName: "Collaborator",
        avatarUrl: null,
      };

  return {
    ...node,
    checkpoints: createdCps,
    claim_holder: claimHolder,
  };
}

export async function updateCanvasNode(
  nodeId: string,
  projectId: string,
  updates: Partial<CanvasNode>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  // Verify claim if editing content/position
  const { data: node } = await adminClient
    .from("canvas_nodes")
    .select("claimed_by, claim_expires_at")
    .eq("id", nodeId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!node) return { success: false, error: "Node not found" };

  const isExpired = Boolean(node.claim_expires_at && new Date(node.claim_expires_at) < new Date());
  const isContentUpdate =
    updates.title !== undefined ||
    updates.description !== undefined ||
    updates.status !== undefined ||
    updates.color !== undefined;

  if (isContentUpdate) {
    const isClaimedByMe = node.claimed_by === userId && !isExpired;
    if (!isClaimedByMe) {
      return { success: false, error: "You must claim this milestone box to edit its content" };
    }
  }

  const { error } = await adminClient
    .from("canvas_nodes")
    .update({
      title: updates.title,
      description: updates.description,
      status: updates.status,
      position_x: updates.position_x,
      position_y: updates.position_y,
      width: updates.width,
      height: updates.height,
      color: updates.color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", nodeId)
    .eq("project_id", projectId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteCanvasNode(
  nodeId: string,
  projectId: string,
  userId?: string,
  isOwner?: boolean
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  if (!isOwner && userId) {
    const { data: node } = await adminClient
      .from("canvas_nodes")
      .select("claimed_by")
      .eq("id", nodeId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (node && node.claimed_by !== userId) {
      return { success: false, error: "You must claim this milestone box to delete it" };
    }
  }

  const { error } = await adminClient
    .from("canvas_nodes")
    .delete()
    .eq("id", nodeId)
    .eq("project_id", projectId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function createCanvasEdge(
  projectId: string,
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle: HandlePosition = "right",
  targetHandle: HandlePosition = "left",
  userId?: string,
  isOwner?: boolean
): Promise<CanvasEdge | null> {
  if (sourceNodeId === targetNodeId) return null;
  const adminClient = createAdminClient();

  if (!isOwner && userId) {
    const { data: nodes } = await adminClient
      .from("canvas_nodes")
      .select("id, claimed_by, claim_expires_at")
      .in("id", [sourceNodeId, targetNodeId])
      .eq("project_id", projectId);

    const now = new Date();
    const ownsAny = nodes?.some((n) => {
      const isExpired = Boolean(n.claim_expires_at && new Date(n.claim_expires_at) < now);
      return n.claimed_by === userId && !isExpired;
    });
    if (!ownsAny) {
      return null;
    }
  }

  const { data: edge, error } = await adminClient
    .from("canvas_edges")
    .upsert(
      {
        project_id: projectId,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        source_handle: sourceHandle,
        target_handle: targetHandle,
      },
      { onConflict: "source_node_id,target_node_id,source_handle,target_handle" }
    )
    .select()
    .single();

  if (error || !edge) {
    console.error("Error creating canvas edge:", error);
    return null;
  }

  return edge as CanvasEdge;
}

export async function deleteCanvasEdge(
  edgeId: string,
  projectId: string,
  userId?: string,
  isOwner?: boolean
): Promise<{ success: boolean }> {
  const adminClient = createAdminClient();

  if (!isOwner && userId) {
    const { data: edge } = await adminClient
      .from("canvas_edges")
      .select("source_node_id, target_node_id")
      .eq("id", edgeId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (edge) {
      const { data: nodes } = await adminClient
        .from("canvas_nodes")
        .select("id, claimed_by, claim_expires_at")
        .in("id", [edge.source_node_id, edge.target_node_id])
        .eq("project_id", projectId);

      const now = new Date();
      const ownsAny = nodes?.some((n) => {
        const isExpired = Boolean(n.claim_expires_at && new Date(n.claim_expires_at) < now);
        return n.claimed_by === userId && !isExpired;
      });
      if (!ownsAny) {
        return { success: false };
      }
    }
  }

  const { error } = await adminClient
    .from("canvas_edges")
    .delete()
    .eq("id", edgeId)
  return { success: !error };
}

export async function claimCanvasNodeDirect(
  nodeId: string,
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string; expiresAt?: string }> {
  const adminClient = createAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  // Try atomic update
  const { data: updated, error } = await adminClient
    .from("canvas_nodes")
    .update({
      claimed_by: userId,
      claimed_at: now.toISOString(),
      claim_expires_at: expiresAt,
      updated_at: now.toISOString(),
    })
    .eq("id", nodeId)
    .eq("project_id", projectId)
    .or(`claimed_by.is.null,claimed_by.eq.${userId},claim_expires_at.lt.${now.toISOString()}`)
    .select()
    .maybeSingle();

  if (error || !updated) {
    return { success: false, error: "Box is currently claimed by another collaborator" };
  }

  return { success: true, expiresAt };
}

export async function releaseCanvasNodeDirect(
  nodeId: string,
  projectId: string,
  userId: string
): Promise<{ success: boolean }> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("canvas_nodes")
    .update({
      claimed_by: null,
      claimed_at: null,
      claim_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", nodeId)
    .eq("project_id", projectId)
    .eq("claimed_by", userId);

  return { success: !error };
}
