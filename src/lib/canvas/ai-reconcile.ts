/**
 * AI Canvas Graph Reconciliation Engine
 * Intelligently applies AI results: creating new pipelines, inserting intermediate steps,
 * shifting sort orders & coordinates, rewiring edges, and reconciling checkpoints.
 * Extended to support AWS service nodes, group containers, and data flow edges.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { CanvasNode, CanvasEdge, CanvasCheckpoint, CanvasNodeType, HandlePosition } from "./types";
import { autoLayoutNodes } from "./auto-layout";
import { layoutAWSArchitecture } from "./aws-layout";
import { AIWorkflowResult } from "@/lib/ai/types";
import { getProjectCanvasData } from "./server";

export async function applyAIWorkflowResult(
  projectId: string,
  result: AIWorkflowResult,
  existingData: { nodes: CanvasNode[]; edges: CanvasEdge[] }
): Promise<{
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  summary: string;
  intent: string;
  tempIdToUuid?: Record<string, string>;
}> {
  const adminClient = createAdminClient();
  const tempIdToUuid: Record<string, string> = {};
  const isUpdate =
    result.intent === "update_pipeline" &&
    existingData.nodes.length > 0 &&
    result.milestones.some((m) => Boolean(m.id));

  // =========================================================================
  // PATH A: CREATE NEW PIPELINE (Empty canvas or distinct parallel pipeline)
  // =========================================================================
  if (!isUpdate) {
    // 1. Calculate X offset if there are already existing nodes
    let offsetX = 100;
    const offsetY = 100;
    if (existingData.nodes.length > 0) {
      const maxX = Math.max(
        ...existingData.nodes.map((n) => (n.position_x || 0) + (n.width || 280))
      );
      offsetX = maxX + 180;
    }

    // 2. Insert new nodes
    const nodesToInsert = result.milestones.map((m, idx) => ({
      project_id: projectId,
      title: m.title || "Milestone",
      description: m.description || "",
      position_x: offsetX + idx * 380,
      position_y: offsetY,
      width: 280,
      height: 170,
      color: m.color || "default",
      sort_order: m.sortOrder ?? idx,
      claimed_by: null,
    }));

    const { data: insertedNodes, error: nodesErr } = await adminClient
      .from("canvas_nodes")
      .insert(nodesToInsert)
      .select();

    if (nodesErr || !insertedNodes) {
      console.error("Error creating AI pipeline nodes:", nodesErr);
      throw new Error("Failed to insert AI workflow nodes");
    }

    result.milestones.forEach((m, idx) => {
      if (insertedNodes[idx]) {
        const key = m.tempId || m.id || `m_${idx}`;
        tempIdToUuid[key] = insertedNodes[idx].id;
        if (m.tempId) tempIdToUuid[m.tempId] = insertedNodes[idx].id;
        if (m.id) tempIdToUuid[m.id] = insertedNodes[idx].id;
      }
    });

    // 3. Insert checkpoints
    const checkpointInserts: Array<{
      node_id: string;
      project_id: string;
      title: string;
      is_completed: boolean;
      sort_order: number;
    }> = [];

    result.milestones.forEach((m, mIdx) => {
      const key = m.tempId || m.id || `m_${mIdx}`;
      const nodeId = tempIdToUuid[key];
      if (nodeId && Array.isArray(m.checkpoints)) {
        m.checkpoints.forEach((cp, cpIdx) => {
          checkpointInserts.push({
            node_id: nodeId,
            project_id: projectId,
            title: cp.title,
            is_completed: Boolean(cp.isCompleted),
            sort_order: cpIdx,
          });
        });
      }
    });

    let createdCheckpoints: CanvasCheckpoint[] = [];
    if (checkpointInserts.length > 0) {
      const { data: cps, error: cpErr } = await adminClient
        .from("canvas_checkpoints")
        .insert(checkpointInserts)
        .select();
      if (!cpErr && cps) {
        createdCheckpoints = cps as CanvasCheckpoint[];
      }
    }

    // 4. Insert edges
    const edgeInserts: Array<{
      project_id: string;
      source_node_id: string;
      target_node_id: string;
      source_handle: string;
      target_handle: string;
    }> = [];

    for (const edge of result.edges || []) {
      const sourceId = tempIdToUuid[edge.fromId] || edge.fromId;
      const targetId = tempIdToUuid[edge.toId] || edge.toId;
      if (sourceId && targetId && sourceId !== targetId) {
        edgeInserts.push({
          project_id: projectId,
          source_node_id: sourceId,
          target_node_id: targetId,
          source_handle: "right",
          target_handle: "left",
        });
      }
    }

    let createdEdges: CanvasEdge[] = [];
    if (edgeInserts.length > 0) {
      const { data: edges, error: edgeErr } = await adminClient
        .from("canvas_edges")
        .insert(edgeInserts)
        .select();
      if (!edgeErr && edges) {
        createdEdges = edges.map((e) => ({
          id: e.id,
          project_id: e.project_id,
          source_node_id: e.source_node_id,
          target_node_id: e.target_node_id,
          source_handle: (e.source_handle || "right") as HandlePosition,
          target_handle: (e.target_handle || "left") as HandlePosition,
          created_at: e.created_at,
        }));
      }
    }

    // 5. Layout new nodes
    const cpMap: Record<string, CanvasCheckpoint[]> = {};
    createdCheckpoints.forEach((cp) => {
      if (!cpMap[cp.node_id]) cpMap[cp.node_id] = [];
      cpMap[cp.node_id].push(cp);
    });

    const rawNewNodes: CanvasNode[] = insertedNodes.map((n) => ({
      id: n.id,
      project_id: n.project_id,
      title: n.title,
      description: n.description || "",
      status: n.status || "draft",
      position_x: n.position_x,
      position_y: n.position_y,
      width: n.width || 280,
      height: n.height || 170,
      color: n.color || "default",
      sort_order: n.sort_order || 0,
      claimed_by: n.claimed_by || null,
      claim_holder: null,
      version: n.version ?? 1,
      checkpoints: cpMap[n.id] || [],
      node_type: (n.node_type || "milestone") as CanvasNodeType,
      created_at: n.created_at,
      updated_at: n.updated_at,
    }));

    const layoutedNewNodes = autoLayoutNodes(rawNewNodes, createdEdges, {
      startX: offsetX,
      startY: offsetY,
    });

    for (const node of layoutedNewNodes) {
      await adminClient
        .from("canvas_nodes")
        .update({
          position_x: node.position_x,
          position_y: node.position_y,
          width: node.width,
          height: node.height,
          sort_order: node.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", node.id);
    }

    const allNodes = [...existingData.nodes, ...layoutedNewNodes];
    const allEdges = [...existingData.edges, ...createdEdges];

    return {
      nodes: allNodes,
      edges: allEdges,
      summary: result.summary,
      intent: result.intent,
    };
  }

  // =========================================================================
  // PATH B: IN-PLACE PIPELINE UPDATE (Insertion, order shifting, rewiring)
  // =========================================================================

  // 1. Handle explicit node deletions
  if (result.deletedMilestoneIds && result.deletedMilestoneIds.length > 0) {
    await adminClient
      .from("canvas_nodes")
      .delete()
      .in("id", result.deletedMilestoneIds)
      .eq("project_id", projectId);
  }

  // 2. Identify newly inserted nodes vs existing nodes
  const idMap: Record<string, string> = {};
  const existingNodeIds = new Set(existingData.nodes.map((n) => n.id));

  // Determine base anchor coordinate (startX, startY)
  const minX = Math.min(...existingData.nodes.map((n) => n.position_x || 100));
  const minY = Math.min(...existingData.nodes.map((n) => n.position_y || 100));
  const anchorX = Number.isFinite(minX) ? minX : 100;
  const anchorY = Number.isFinite(minY) ? minY : 100;

  // Insert brand new nodes
  for (let i = 0; i < result.milestones.length; i++) {
    const m = result.milestones[i];
    const isNew = !m.id || !existingNodeIds.has(m.id);

    if (isNew) {
      const { data: createdNode, error: createErr } = await adminClient
        .from("canvas_nodes")
        .insert({
          project_id: projectId,
          title: m.title || "Milestone",
          description: m.description || "",
          position_x: anchorX + i * 380,
          position_y: anchorY,
          width: 280,
          height: 170,
          color: m.color || "amber",
          sort_order: m.sortOrder ?? i,
          claimed_by: null,
        })
        .select()
        .single();

      if (createErr || !createdNode) {
        console.error("Error inserting intermediate milestone:", createErr);
        continue;
      }

      if (m.tempId) idMap[m.tempId] = createdNode.id;
      if (m.id) idMap[m.id] = createdNode.id;

      // Insert checkpoints for the newly created node
      if (m.checkpoints && m.checkpoints.length > 0) {
        const cpInserts = m.checkpoints.map((cp, cpIdx) => ({
          node_id: createdNode.id,
          project_id: projectId,
          title: cp.title,
          is_completed: Boolean(cp.isCompleted),
          sort_order: cpIdx,
        }));

        await adminClient.from("canvas_checkpoints").insert(cpInserts);
      }
    } else if (m.id) {
      idMap[m.id] = m.id;
      if (m.tempId) idMap[m.tempId] = m.id;

      // Update existing milestone details & sort order
      await adminClient
        .from("canvas_nodes")
        .update({
          title: m.title,
          description: m.description || "",
          color: m.color || "default",
          sort_order: m.sortOrder ?? i,
          updated_at: new Date().toISOString(),
        })
        .eq("id", m.id)
        .eq("project_id", projectId);

      // Reconcile checkpoints for this existing node
      if (m.checkpoints && Array.isArray(m.checkpoints)) {
        const { data: existingCps } = await adminClient
          .from("canvas_checkpoints")
          .select("id, title, is_completed, sort_order")
          .eq("node_id", m.id)
          .eq("project_id", projectId);

        const existingCpMap = new Map((existingCps || []).map((cp) => [cp.id, cp]));
        const targetCpIds = new Set<string>();

        for (let cpIdx = 0; cpIdx < m.checkpoints.length; cpIdx++) {
          const cp = m.checkpoints[cpIdx];
          if (cp.id && existingCpMap.has(cp.id)) {
            targetCpIds.add(cp.id);
            await adminClient
              .from("canvas_checkpoints")
              .update({
                title: cp.title,
                is_completed: cp.isCompleted ?? existingCpMap.get(cp.id)!.is_completed,
                sort_order: cpIdx,
              })
              .eq("id", cp.id);
          } else {
            // New checkpoint for existing node
            const { data: newCp } = await adminClient
              .from("canvas_checkpoints")
              .insert({
                node_id: m.id,
                project_id: projectId,
                title: cp.title,
                is_completed: Boolean(cp.isCompleted),
                sort_order: cpIdx,
              })
              .select()
              .single();

            if (newCp) targetCpIds.add(newCp.id);
          }
        }

        // Delete any omitted checkpoints
        for (const [oldId] of existingCpMap) {
          if (!targetCpIds.has(oldId)) {
            await adminClient.from("canvas_checkpoints").delete().eq("id", oldId);
          }
        }
      }
    }
  }

  // 3. Edge Re-wiring
  // Delete existing edges that connect the modified nodes
  const affectedNodeIds = Object.values(idMap);
  if (affectedNodeIds.length > 0) {
    await adminClient
      .from("canvas_edges")
      .delete()
      .eq("project_id", projectId)
      .or(
        `source_node_id.in.(${affectedNodeIds.join(",")}),target_node_id.in.(${affectedNodeIds.join(",")})`
      );
  }

  // Insert updated edges
  const newEdgeInserts: Array<{
    project_id: string;
    source_node_id: string;
    target_node_id: string;
    source_handle: string;
    target_handle: string;
  }> = [];

  for (const edge of result.edges || []) {
    const sourceUuid = idMap[edge.fromId] || edge.fromId;
    const targetUuid = idMap[edge.toId] || edge.toId;

    if (
      sourceUuid &&
      targetUuid &&
      sourceUuid !== targetUuid &&
      affectedNodeIds.includes(sourceUuid) &&
      affectedNodeIds.includes(targetUuid)
    ) {
      newEdgeInserts.push({
        project_id: projectId,
        source_node_id: sourceUuid,
        target_node_id: targetUuid,
        source_handle: "right",
        target_handle: "left",
      });
    }
  }

  if (newEdgeInserts.length > 0) {
    await adminClient.from("canvas_edges").insert(newEdgeInserts);
  }

  // 4. Run topological DAG auto-layout & shift coordinates
  const refreshedCanvas = await getProjectCanvasData(projectId);
  const layoutedNodes = autoLayoutNodes(refreshedCanvas.nodes, refreshedCanvas.edges, {
    startX: anchorX,
    startY: anchorY,
  });

  // Persist shifted coordinates
  for (const node of layoutedNodes) {
    await adminClient
      .from("canvas_nodes")
      .update({
        position_x: node.position_x,
        position_y: node.position_y,
        width: node.width,
        height: node.height,
        sort_order: node.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", node.id);
  }

  // 5. Return complete updated canvas graph
  const finalCanvas = await getProjectCanvasData(projectId);
  return {
    nodes: finalCanvas.nodes,
    edges: finalCanvas.edges,
    summary: result.summary,
    intent: result.intent,
    tempIdToUuid,
  };
}

// =========================================================================
// AWS Service Node & Group Reconciliation
// =========================================================================

/**
 * Applies AI-generated AWS service nodes, groups, and data flow edges to the canvas.
 * Implements a hierarchical spatial layout with interlocking bridges to milestones.
 */
export async function applyAWSServiceNodes(
  projectId: string,
  result: AIWorkflowResult,
  existingData: { nodes: CanvasNode[]; edges: CanvasEdge[] },
  initialTempIdToUuid?: Record<string, string>
): Promise<{
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}> {
  const adminClient = createAdminClient();
  const tempIdToUuid: Record<string, string> = { ...(initialTempIdToUuid || {}) };

  const groups = result.groups || [];
  const serviceNodes = result.serviceNodes || [];
  const layout = layoutAWSArchitecture(result, existingData.nodes);
  const placements = new Map(layout.map((node) => [node.id, node]));

  // 2. Insert Groups
  for (const group of groups) {
    const pos = placements.get(group.tempId)!;
    const { data: createdGroup, error: groupErr } = await adminClient
      .from("canvas_nodes")
      .insert({
        project_id: projectId,
        title: group.label,
        description: "",
        node_type: "group",
        position_x: pos.position_x,
        position_y: pos.position_y,
        width: pos.width || 400,
        height: pos.height || 280,
        color: "default",
        sort_order: 0,
        claimed_by: null,
        group_metadata: {
          label: group.label,
          style: group.style,
          childNodeIds: [],
        },
      })
      .select()
      .single();

    if (!groupErr && createdGroup) {
      tempIdToUuid[group.tempId] = createdGroup.id;
    }
  }

  // 3. Insert AWS Service Nodes
  for (let sIdx = 0; sIdx < serviceNodes.length; sIdx++) {
    const svc = serviceNodes[sIdx];
    const pos = placements.get(svc.tempId)!;
    const parentGroupUuid = pos.parent_group_id
      ? tempIdToUuid[pos.parent_group_id]
      : null;

    const { data: createdNode, error: nodeErr } = await adminClient
      .from("canvas_nodes")
      .insert({
        project_id: projectId,
        title: svc.name || svc.serviceId.toUpperCase(),
        description: svc.description || "",
        node_type: "aws_service",
        position_x: pos.position_x,
        position_y: pos.position_y,
        width: pos.width || 200,
        height: pos.height || 140,
        color: "default",
        sort_order: sIdx,
        claimed_by: null,
        parent_group_id: parentGroupUuid,
        aws_metadata: {
          serviceId: svc.serviceId,
          category: getServiceCategory(svc.serviceId),
          region: svc.region || "us-east-1",
          config: svc.config || {},
        },
      })
      .select()
      .single();

    if (!nodeErr && createdNode) {
      tempIdToUuid[svc.tempId] = createdNode.id;
    }
  }

  // Update group childNodeIds
  for (const group of groups) {
    const groupUuid = tempIdToUuid[group.tempId];
    if (!groupUuid) continue;
    const resolvedChildIds = layout.filter((node) => node.parent_group_id === group.tempId)
      .map((node) => tempIdToUuid[node.id])
      .filter(Boolean);
    const parentId = placements.get(group.tempId)?.parent_group_id;
    {
      await adminClient
        .from("canvas_nodes")
        .update({
          parent_group_id: parentId ? tempIdToUuid[parentId] || null : null,
          group_metadata: {
            label: group.label,
            style: group.style,
            childNodeIds: resolvedChildIds,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", groupUuid);
    }
  }

  // 5. Insert Data Flow & Interlocking Bridges
  if (result.dataFlowEdges && result.dataFlowEdges.length > 0) {
    const edgeInserts: Array<{
      project_id: string;
      source_node_id: string;
      target_node_id: string;
      source_handle: string;
      target_handle: string;
      edge_type: string;
      label: string | null;
    }> = [];

    for (const edge of result.dataFlowEdges) {
      const sourceUuid = tempIdToUuid[edge.fromId] || edge.fromId;
      const targetUuid = tempIdToUuid[edge.toId] || edge.toId;

      if (sourceUuid && targetUuid && sourceUuid !== targetUuid) {
        // Determine handles: if source is a milestone and target is an infra resource, flow top-to-bottom!
        const isSourceMilestone = result.milestones?.some(
          (m) => tempIdToUuid[m.tempId || m.id || ""] === sourceUuid
        );
        const sourceHandle = isSourceMilestone ? "bottom" : "right";
        const targetHandle = isSourceMilestone ? "top" : "left";

        edgeInserts.push({
          project_id: projectId,
          source_node_id: sourceUuid,
          target_node_id: targetUuid,
          source_handle: sourceHandle,
          target_handle: targetHandle,
          edge_type: edge.edgeType || "data_flow",
          label: edge.label || edge.protocol || null,
        });
      }
    }

    if (edgeInserts.length > 0) {
      await adminClient.from("canvas_edges").insert(edgeInserts);
    }
  }

  // 6. Return complete refreshed canvas graph
  const finalCanvas = await getProjectCanvasData(projectId);
  return {
    nodes: finalCanvas.nodes,
    edges: finalCanvas.edges,
  };
}

/**
 * Resolve AWS service category from serviceId
 */
function getServiceCategory(serviceId: string): string {
  const CATEGORY_MAP: Record<string, string> = {
    ec2: "compute", lambda: "compute", ecs: "compute", eks: "compute",
    fargate: "compute", elastic_beanstalk: "compute",
    s3: "storage", ebs: "storage", efs: "storage", glacier: "storage",
    rds: "database", dynamodb: "database", aurora: "database",
    elasticache: "database", redshift: "database", documentdb: "database",
    vpc: "networking", cloudfront: "networking", route53: "networking",
    api_gateway: "networking", elb: "networking", direct_connect: "networking",
    iam: "security", kms: "security", secrets_manager: "security",
    waf: "security", shield: "security", cognito: "security",
    certificate_manager: "security",
    sqs: "integration", sns: "integration", eventbridge: "integration",
    step_functions: "integration", mq: "integration",
    cloudwatch: "management", cloudtrail: "management",
    cloudformation: "management", systems_manager: "management",
    sagemaker: "ai_ml", bedrock: "ai_ml", rekognition: "ai_ml",
    comprehend: "ai_ml",
  };
  return CATEGORY_MAP[serviceId] || "compute";
}
