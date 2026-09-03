"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  CanvasNode,
  CanvasEdge,
  CanvasClaimRequest,
  CanvasTool,
  CanvasViewport,
  CollaboratorPresence,
  HandlePosition,
  CanvasNetworkStatus,
} from "@/lib/canvas/types";
import {
  snapToGrid,
  getUserColor,
  getNodeHandlePosition,
  canConnectMilestones,
  detectCycle,
  findNearestHandle,
  getClosestHandleToPoint,
  exportToMermaid,
} from "@/lib/canvas/coordinate-math";
import { autoLayoutNodes } from "@/lib/canvas/auto-layout";
import CanvasViewportContainer from "@/components/canvas/canvas-viewport";
import CanvasNodeComponent from "@/components/canvas/canvas-node";
import CanvasEdgeLayer from "@/components/canvas/canvas-edge-layer";
import CanvasDock from "@/components/canvas/canvas-dock";
import CanvasDrawer from "@/components/canvas/canvas-drawer";
import CanvasMobileNodeBar from "@/components/canvas/canvas-mobile-node-bar";
import CanvasHud from "@/components/canvas/canvas-hud";
import CanvasCursors from "@/components/canvas/canvas-cursors";
import CanvasClaimModal from "@/components/canvas/canvas-claim-modal";
import CanvasAIAssistant from "@/components/canvas/canvas-ai-assistant";
import CanvasAIAura from "@/components/canvas/canvas-ai-aura";
import CanvasMinimap from "@/components/canvas/canvas-minimap";
import CanvasNotebook from "@/components/canvas/canvas-notebook";
import CanvasReleasePulse from "@/components/canvas/canvas-release-pulse";
import CanvasServicePalette from "@/components/canvas/canvas-service-palette";
import { AWS_SERVICE_REGISTRY } from "@/components/canvas/aws-icons";
import { useNotifications } from "@/components/notifications/notification-provider";
import { canvasSounds } from "@/lib/canvas/sound-effects";

interface ProjectCanvasClientProps {
  project: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    invite_code?: string;
    created_by?: string | null;
  };
  initialNodes: CanvasNode[];
  initialEdges: CanvasEdge[];
  initialClaimRequests: CanvasClaimRequest[];
  currentUser: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  isOwner: boolean;
  initialAiRequestsRemaining?: number;
}

type DragState = {
  nodeId: string;
  startPos: { x: number; y: number };
  pointerStartScreen: { x: number; y: number };
  lastPosition: { x: number; y: number };
  initialPositions?: Map<string, { x: number; y: number }>;
  lastPositions?: Map<string, { x: number; y: number }>;
};

type DraftEdgeState = {
  sourceNode: CanvasNode;
  sourceHandle: HandlePosition;
  currentPos: { x: number; y: number };
};

type HistorySnapshot = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

const MAX_HISTORY_STEPS = 30;

export default function ProjectCanvasClient({
  project,
  initialNodes,
  initialEdges,
  currentUser,
  isOwner,
  initialAiRequestsRemaining = 10,
}: ProjectCanvasClientProps) {
  const { notify } = useNotifications();
  const supabase = useMemo(() => createClient(), []);
  const canvasChannelRef = useRef<RealtimeChannel | null>(null);
  const [canvasRootElement, setCanvasRootElement] = useState<HTMLDivElement | null>(null);
  const [isEvicted, setIsEvicted] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [aiRequestsRemaining, setAiRequestsRemaining] = useState(initialAiRequestsRemaining);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiGeneratingUser, setAiGeneratingUser] = useState<string | null>(null);
  const [isAuraExiting, setIsAuraExiting] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [isReleasePulseOpen, setIsReleasePulseOpen] = useState(false);

  const handleEviction = useCallback(() => {
    setIsEvicted(true);
    notify({
      tone: "error",
      title: "Access Revoked",
      message: "You have been removed from this project by the owner. Redirecting to workspace...",
    });
    if (canvasChannelRef.current) {
      try {
        supabase.removeChannel(canvasChannelRef.current);
      } catch {}
      canvasChannelRef.current = null;
    }
    // Hard redirect immediately to projects dashboard
    window.location.replace("/dashboard");
  }, [notify, supabase]);

  // Core Canvas State
  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [snapGrid, setSnapGrid] = useState(true);
  const [isMinimapOpen, setIsMinimapOpen] = useState(true);
  const [isServicePaletteOpen, setIsServicePaletteOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setIsMobile(mq.matches);
      if (mq.matches) {
        setIsMinimapOpen(false);
      }
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Sync edges into browser cache
  useEffect(() => {
    try {
      const cacheKey = `novastage:canvas:${project.id}:edges`;
      window.localStorage.setItem(cacheKey, JSON.stringify(edges));
    } catch {}
  }, [edges, project.id]);

  // Marquee Selection State
  const [selectionMarquee, setSelectionMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const selectionMarqueeRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Network & Connection Quality State
  const [networkStatus, setNetworkStatus] = useState<CanvasNetworkStatus>("online");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const lastOutboundCursorTimeRef = useRef<number>(0);
  const lastOutboundPosRef = useRef<{ x: number; y: number } | null>(null);

  // Viewport State
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 100,
    y: 100,
    zoom: 1.0,
  });

  // Dragging & Linking State
  const [draggingNode, setDraggingNode] = useState<DragState | null>(null);
  const draggingNodeRef = useRef<DragState | null>(null);

  const [draftEdge, setDraftEdge] = useState<DraftEdgeState | null>(null);
  const draftEdgeRef = useRef<DraftEdgeState | null>(null);
  const [snappedHandle, setSnappedHandle] = useState<{
    node: CanvasNode;
    handle: HandlePosition;
  } | null>(null);
  const [isCycleDetected, setIsCycleDetected] = useState(false);

  // Multiplayer Presence & Claims State
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const collaboratorsRef = useRef<CollaboratorPresence[]>([]);
  const [incomingClaimModal, setIncomingClaimModal] = useState<CanvasClaimRequest | null>(null);

  // Undo / Redo Local History Stack
  const historyRef = useRef<HistorySnapshot[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const historyIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistorySnapshot = useCallback(
    (newNodes: CanvasNode[], newEdges: CanvasEdge[]) => {
      const idx = historyIndexRef.current;
      const sliced = historyRef.current.slice(0, idx + 1);
      sliced.push({ nodes: newNodes, edges: newEdges });
      if (sliced.length > MAX_HISTORY_STEPS) {
        sliced.shift();
      }
      historyRef.current = sliced;
      historyIndexRef.current = sliced.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
    },
    []
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // ---------------------------------------------------------------------------
  // Canvas CRUD & Concurrency Methods
  // ---------------------------------------------------------------------------

  // Broadcast Helper to notify peers immediately over Realtime channel
  const broadcastEvent = useCallback((event: string, payload: unknown) => {
    try {
      canvasChannelRef.current?.send({
        type: "broadcast",
        event,
        payload,
      });
    } catch (e) {
      console.warn("Failed to broadcast canvas event:", e);
    }
  }, []);

  // Secure fetch helper that immediately triggers eviction if user lost access
  const secureFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetch(input, init);
      if (res.status === 401 || res.status === 403) {
        handleEviction();
        throw new Error("Access Revoked");
      }
      return res;
    },
    [handleEviction]
  );

  // Resync full canvas state on reconnection
  const resyncCanvasState = useCallback(async () => {
    try {
      const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`);
      if (res.ok) {
        const data = await res.json();
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        notify({ title: "Canvas Synced", message: "Refreshed latest roadmap changes" });
      }
    } catch (e) {
      console.warn("Failed to resync canvas state:", e);
    }
  }, [notify, project.slug, secureFetch]);

  // Add Milestone Box (Optimistic Instant Pop)
  const handleAddNode = useCallback(
    (customPos?: { x: number; y: number }) => {
      if (isAIGenerating) return;
      const posX = customPos ? customPos.x : (400 - viewport.x) / viewport.zoom;
      const posY = customPos ? customPos.y : (250 - viewport.y) / viewport.zoom;
      const finalX = snapGrid ? snapToGrid(posX) : posX;
      const finalY = snapGrid ? snapToGrid(posY) : posY;

      const stepNum = nodes.length + 1;
      const defaultTitle = `Milestone Step ${stepNum}`;
      const clientNodeId = crypto.randomUUID();

      const myHolder = {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      };

      const optimisticNode: CanvasNode = {
        id: clientNodeId,
        project_id: project.id,
        title: defaultTitle,
        description: "",
        status: "draft",
        position_x: finalX,
        position_y: finalY,
        width: 280,
        height: 170,
        color: "default",
        sort_order: nodes.length,
        claimed_by: currentUser.id,
        claim_holder: myHolder,
        version: 1,
        checkpoints: [],
        node_type: "milestone",
      };

      // 0ms instant local insertion
      setNodes((prev) => [...prev, optimisticNode]);
      setSelectedNodeId(clientNodeId);
      setSelectedNodeIds(new Set([clientNodeId]));
      pushHistorySnapshot([...nodes, optimisticNode], edges);
      canvasSounds.addNode();
      broadcastEvent("node:created", { node: optimisticNode });
      notify({ title: "Milestone Created", message: `Added "${defaultTitle}" to canvas` });

      // Background persistence
      secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_node",
          id: clientNodeId,
          title: defaultTitle,
          position_x: finalX,
          position_y: finalY,
          checkpoints: [],
        }),
      }).catch((e) => {
        console.error("Failed to persist milestone node:", e);
        setNodes((prev) => prev.filter((n) => n.id !== clientNodeId));
        notify({ tone: "error", title: "Error", message: "Failed to create milestone box" });
      });
    },
    [
      broadcastEvent,
      currentUser.avatarUrl,
      currentUser.email,
      currentUser.fullName,
      currentUser.id,
      edges,
      isAIGenerating,
      nodes,
      notify,
      project.id,
      project.slug,
      pushHistorySnapshot,
      secureFetch,
      snapGrid,
      viewport.x,
      viewport.y,
      viewport.zoom,
    ]
  );

  // Add AWS Service Node (Optimistic Instant Pop)
  const handleAddAWSService = useCallback(
    (serviceId: string, customPos?: { x: number; y: number }) => {
      if (isAIGenerating) return;
      const posX = customPos ? customPos.x : (400 - viewport.x) / viewport.zoom;
      const posY = customPos ? customPos.y : (250 - viewport.y) / viewport.zoom;
      const finalX = snapGrid ? snapToGrid(posX) : posX;
      const finalY = snapGrid ? snapToGrid(posY) : posY;

      const serviceDef = AWS_SERVICE_REGISTRY[serviceId.toLowerCase()];
      const serviceName = serviceDef ? serviceDef.name : serviceId.toUpperCase();
      const category = serviceDef ? serviceDef.category : "compute";
      const clientNodeId = crypto.randomUUID();

      const myHolder = {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      };

      const optimisticNode: CanvasNode = {
        id: clientNodeId,
        project_id: project.id,
        title: serviceName,
        description: "",
        status: "draft",
        position_x: finalX,
        position_y: finalY,
        width: 200,
        height: 140,
        color: "default",
        sort_order: nodes.length,
        claimed_by: currentUser.id,
        claim_holder: myHolder,
        version: 1,
        checkpoints: [],
        node_type: "aws_service",
        aws_metadata: {
          serviceId,
          category,
          region: "us-east-1",
          config: serviceDef?.defaultConfig || {},
        },
      };

      // 0ms instant local insertion & close palette
      setIsServicePaletteOpen(false);
      setNodes((prev) => [...prev, optimisticNode]);
      setSelectedNodeId(clientNodeId);
      setSelectedNodeIds(new Set([clientNodeId]));
      pushHistorySnapshot([...nodes, optimisticNode], edges);
      canvasSounds.addNode();
      broadcastEvent("node:created", { node: optimisticNode });
      notify({ title: "AWS Service Added", message: `Added "${serviceName}" to canvas` });

      // Background persistence
      secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_node",
          id: clientNodeId,
          title: serviceName,
          node_type: "aws_service",
          width: 200,
          height: 140,
          position_x: finalX,
          position_y: finalY,
          aws_metadata: {
            serviceId,
            category,
            region: "us-east-1",
            config: serviceDef?.defaultConfig || {},
          },
          checkpoints: [],
        }),
      }).catch((e) => {
        console.error("Failed to persist AWS service node:", e);
        setNodes((prev) => prev.filter((n) => n.id !== clientNodeId));
        notify({ tone: "error", title: "Error", message: "Failed to add AWS service node" });
      });
    },
    [
      broadcastEvent,
      currentUser.avatarUrl,
      currentUser.email,
      currentUser.fullName,
      currentUser.id,
      edges,
      isAIGenerating,
      nodes,
      notify,
      project.id,
      project.slug,
      pushHistorySnapshot,
      secureFetch,
      snapGrid,
      viewport.x,
      viewport.y,
      viewport.zoom,
    ]
  );

  // Add Group Container (Optimistic Instant Pop)
  const handleAddGroup = useCallback(
    (customPos?: { x: number; y: number }) => {
      if (isAIGenerating) return;
      const posX = customPos ? customPos.x : (350 - viewport.x) / viewport.zoom;
      const posY = customPos ? customPos.y : (200 - viewport.y) / viewport.zoom;
      const finalX = snapGrid ? snapToGrid(posX) : posX;
      const finalY = snapGrid ? snapToGrid(posY) : posY;

      const defaultTitle = "VPC Network";
      const clientNodeId = crypto.randomUUID();

      const myHolder = {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      };

      const optimisticNode: CanvasNode = {
        id: clientNodeId,
        project_id: project.id,
        title: defaultTitle,
        description: "",
        status: "draft",
        position_x: finalX,
        position_y: finalY,
        width: 440,
        height: 320,
        color: "default",
        sort_order: nodes.length,
        claimed_by: currentUser.id,
        claim_holder: myHolder,
        version: 1,
        checkpoints: [],
        node_type: "group",
        group_metadata: {
          label: defaultTitle,
          style: "vpc",
          childNodeIds: [],
        },
      };

      // 0ms instant local insertion
      setNodes((prev) => [...prev, optimisticNode]);
      setSelectedNodeId(clientNodeId);
      setSelectedNodeIds(new Set([clientNodeId]));
      pushHistorySnapshot([...nodes, optimisticNode], edges);
      canvasSounds.addNode();
      broadcastEvent("node:created", { node: optimisticNode });
      notify({ title: "Group Created", message: `Added "${defaultTitle}" to canvas` });

      // Background persistence
      secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_node",
          id: clientNodeId,
          title: defaultTitle,
          node_type: "group",
          width: 440,
          height: 320,
          position_x: finalX,
          position_y: finalY,
          group_metadata: {
            label: defaultTitle,
            style: "vpc",
            childNodeIds: [],
          },
          checkpoints: [],
        }),
      }).catch((e) => {
        console.error("Failed to persist group container:", e);
        setNodes((prev) => prev.filter((n) => n.id !== clientNodeId));
        notify({ tone: "error", title: "Error", message: "Failed to create group container" });
      });
    },
    [
      broadcastEvent,
      currentUser.avatarUrl,
      currentUser.email,
      currentUser.fullName,
      currentUser.id,
      edges,
      isAIGenerating,
      nodes,
      notify,
      project.id,
      project.slug,
      pushHistorySnapshot,
      secureFetch,
      snapGrid,
      viewport.x,
      viewport.y,
      viewport.zoom,
    ]
  );

  // Update Milestone Content
  const handleUpdateNode = useCallback(
    async (nodeId: string, updates: Partial<CanvasNode>) => {
      setNodes((prev) => {
        const next = prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n));
        pushHistorySnapshot(next, edges);
        return next;
      });

      // Instant broadcast to collaborators
      broadcastEvent("node:updated", { nodeId, updates });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_node",
            node_id: nodeId,
            updates,
          }),
        });
      } catch (e) {
        console.error("Failed to update node:", e);
      }
    },
    [broadcastEvent, edges, project.slug, pushHistorySnapshot, secureFetch]
  );

  // Delete Milestone Box
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (target && target.claimed_by !== currentUser.id && !isOwner) {
        notify({ tone: "error", title: "Action Denied", message: "You must claim this milestone box to delete it" });
        return;
      }

      const nextNodes = nodes.filter((n) => n.id !== nodeId);
      const nextEdges = edges.filter(
        (e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId
      );

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId((current) => (current === nodeId ? null : current));
      setSelectedNodeIds((current) => {
        const copy = new Set(current);
        copy.delete(nodeId);
        return copy;
      });

      pushHistorySnapshot(nextNodes, nextEdges);
      canvasSounds.deleteNode();
      broadcastEvent("node:deleted", { nodeId });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete_node", node_id: nodeId }),
        });
        notify({ title: "Milestone Deleted" });
      } catch (e) {
        console.error("Failed to delete node:", e);
      }
    },
    [broadcastEvent, currentUser.id, edges, isOwner, nodes, notify, project.slug, pushHistorySnapshot, secureFetch]
  );

  // Delete All Selected Nodes (Atomic Batch Delete)
  const handleDeleteSelectedNodes = useCallback(async () => {
    const idsToDelete = new Set(selectedNodeIds);
    if (selectedNodeId) idsToDelete.add(selectedNodeId);
    if (idsToDelete.size === 0) return;

    // Filter nodes permitted to be deleted
    const deletableNodeIds = new Set<string>();
    for (const id of idsToDelete) {
      const target = nodes.find((n) => n.id === id);
      if (target && (target.claimed_by === currentUser.id || isOwner)) {
        deletableNodeIds.add(id);
      }
    }

    if (deletableNodeIds.size === 0) {
      notify({
        tone: "error",
        title: "Action Denied",
        message: "You must claim the selected nodes or be the project owner to delete them",
      });
      return;
    }

    // Atomic local state update
    const nextNodes = nodes.filter((n) => !deletableNodeIds.has(n.id));
    const nextEdges = edges.filter(
      (e) => !deletableNodeIds.has(e.source_node_id) && !deletableNodeIds.has(e.target_node_id)
    );

    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());

    pushHistorySnapshot(nextNodes, nextEdges);
    canvasSounds.deleteNode();

    // Broadcast deletions to collaborators
    for (const nodeId of deletableNodeIds) {
      broadcastEvent("node:deleted", { nodeId });
    }

    notify({
      title: "Deleted",
      message: `Deleted ${deletableNodeIds.size} ${deletableNodeIds.size === 1 ? "item" : "items"} from canvas`,
    });

    // Delete in database in parallel
    try {
      await Promise.all(
        Array.from(deletableNodeIds).map((nodeId) =>
          secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_node", node_id: nodeId }),
          })
        )
      );
    } catch (e) {
      console.error("Failed to delete batch nodes from database:", e);
    }
  }, [broadcastEvent, currentUser.id, edges, isOwner, nodes, notify, project.slug, pushHistorySnapshot, secureFetch, selectedNodeId, selectedNodeIds]);

  // Toggle Checkpoint Checkbox
  const handleToggleCheckpoint = useCallback(
    async (checkpointId: string, nodeId: string, nextCompleted: boolean) => {
      setNodes((prev) => {
        const next = prev.map((n) => {
          if (n.id !== nodeId) return n;
          const updatedCps = n.checkpoints.map((cp) =>
            cp.id === checkpointId ? { ...cp, is_completed: nextCompleted } : cp
          );
          const allDone = updatedCps.every((c) => c.is_completed);
          const anyDone = updatedCps.some((c) => c.is_completed);
          const nextStatus = allDone ? "completed" : anyDone ? "in_progress" : "draft";

          return {
            ...n,
            checkpoints: updatedCps,
            status: nextStatus as CanvasNode["status"],
          };
        });
        pushHistorySnapshot(next, edges);
        return next;
      });

      if (nextCompleted) {
        canvasSounds.completeTask();
      }

      // Fast broadcast to all peers
      broadcastEvent("checkpoint:toggled", {
        nodeId,
        checkpointId,
        isCompleted: nextCompleted,
      });

      try {
        const res = await secureFetch(
          `/api/dashboard/projects/${project.slug}/canvas/checkpoints`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "toggle",
              node_id: nodeId,
              checkpoint_id: checkpointId,
              is_completed: nextCompleted,
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          notify({ tone: "error", title: "Action Failed", message: err.error });
        }
      } catch (e) {
        console.error("Failed to toggle checkpoint:", e);
      }
    },
    [broadcastEvent, edges, notify, project.slug, pushHistorySnapshot, secureFetch]
  );

  // Add Checkpoint
  const handleAddCheckpoint = useCallback(
    async (nodeId: string, title: string) => {
      try {
        const res = await secureFetch(
          `/api/dashboard/projects/${project.slug}/canvas/checkpoints`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add",
              node_id: nodeId,
              title,
            }),
          }
        );
        const data = await res.json();
        if (data.success && data.checkpoint) {
          setNodes((prev) => {
            const next = prev.map((n) =>
              n.id === nodeId
                ? { ...n, checkpoints: [...n.checkpoints, data.checkpoint] }
                : n
            );
            pushHistorySnapshot(next, edges);
            return next;
          });
          broadcastEvent("checkpoint:added", { nodeId, checkpoint: data.checkpoint });
        }
      } catch (e) {
        console.error("Failed to add checkpoint:", e);
      }
    },
    [broadcastEvent, edges, project.slug, pushHistorySnapshot, secureFetch]
  );

  // Delete Checkpoint
  const handleDeleteCheckpoint = useCallback(
    async (checkpointId: string, nodeId: string) => {
      setNodes((prev) => {
        const next = prev.map((n) =>
          n.id === nodeId
            ? { ...n, checkpoints: n.checkpoints.filter((c) => c.id !== checkpointId) }
            : n
        );
        pushHistorySnapshot(next, edges);
        return next;
      });

      broadcastEvent("checkpoint:deleted", { nodeId, checkpointId });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/checkpoints`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            node_id: nodeId,
            checkpoint_id: checkpointId,
          }),
        });
      } catch (e) {
        console.error("Failed to delete checkpoint:", e);
      }
    },
    [broadcastEvent, edges, project.slug, pushHistorySnapshot, secureFetch]
  );

  // Claim Methods with instant peer broadcast
  const handleClaimNode = useCallback(
    async (nodeId: string) => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const myHolder = {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      };

      // Optimistic instant local update
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                claimed_by: currentUser.id,
                claim_holder: myHolder,
                claim_expires_at: expiresAt,
              }
            : n
        )
      );

      // Instant broadcast to peers
      broadcastEvent("claim:changed", {
        nodeId,
        claimedBy: currentUser.id,
        claimHolder: myHolder,
        expiresAt,
        action: "claim",
      });

      try {
        const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim", node_id: nodeId }),
        });

        const data = await res.json();
        if (data.success) {
          notify({ title: "Claim Acquired", message: "You now have exclusive edit lock" });
        } else {
          // Revert optimistic update on collision/error
          resyncCanvasState();
          notify({ tone: "error", title: "Claim Failed", message: data.error });
        }
      } catch (e) {
        console.error("Failed to claim node:", e);
        resyncCanvasState();
      }
    },
    [broadcastEvent, currentUser.avatarUrl, currentUser.email, currentUser.fullName, currentUser.id, notify, project.slug, resyncCanvasState, secureFetch]
  );

  const handleReleaseNode = useCallback(
    async (nodeId: string) => {
      // Optimistic instant local release
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, claimed_by: null, claim_holder: null, claim_expires_at: null }
            : n
        )
      );

      // Instant broadcast to peers
      broadcastEvent("claim:changed", {
        nodeId,
        claimedBy: null,
        claimHolder: null,
        expiresAt: null,
        action: "release",
      });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "release", node_id: nodeId }),
        });
        notify({ title: "Claim Released", message: "Milestone is now free for collaborators" });
      } catch (e) {
        console.error("Failed to release claim:", e);
        resyncCanvasState();
      }
    },
    [broadcastEvent, notify, project.slug, resyncCanvasState, secureFetch]
  );

  const handleRequestClaim = useCallback(
    async (node: CanvasNode) => {
      if (!node.claimed_by) {
        handleClaimNode(node.id);
        return;
      }

      try {
        const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "request_claim", node_id: node.id }),
        });

        const data = await res.json();
        if (data.success) {
          broadcastEvent("claim:requested", {
            id: data.request?.id,
            node_id: node.id,
            node_title: node.title,
            requester_id: currentUser.id,
            requester_name: currentUser.fullName,
            current_holder_id: node.claimed_by,
          });

          notify({
            title: "Claim Requested",
            message: `Sent edit handoff request to ${node.claim_holder?.fullName || "the editor"}.`,
          });
        } else {
          notify({ tone: "error", title: "Request Failed", message: data.error });
        }
      } catch (e) {
        console.error("Failed to request claim:", e);
      }
    },
    [broadcastEvent, currentUser.fullName, currentUser.id, handleClaimNode, notify, project.slug, secureFetch]
  );

  const handleResolveClaimRequest = useCallback(
    async (requestId: string, accept: boolean) => {
      try {
        const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resolve_claim",
            request_id: requestId,
            accept,
          }),
        });

        const data = await res.json();
        if (data.success) {
          if (accept && incomingClaimModal) {
            const newHolder = {
              id: incomingClaimModal.requester_id,
              fullName: incomingClaimModal.requester_name || "Collaborator",
              email: "",
              avatarUrl: null,
            };

            broadcastEvent("claim:changed", {
              nodeId: incomingClaimModal.node_id,
              claimedBy: incomingClaimModal.requester_id,
              claimHolder: newHolder,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              action: "transfer",
            });

            setNodes((prev) =>
              prev.map((n) =>
                n.id === incomingClaimModal.node_id
                  ? {
                      ...n,
                      claimed_by: incomingClaimModal.requester_id,
                      claim_holder: newHolder,
                    }
                  : n
              )
            );
          }

          setIncomingClaimModal(null);
          notify({
            title: accept ? "Claim Granted" : "Claim Request Declined",
            message: accept ? "Transferred edit lock to collaborator" : undefined,
          });
        }
      } catch (e) {
        console.error("Failed to resolve claim:", e);
      }
    },
    [broadcastEvent, incomingClaimModal, notify, project.slug, secureFetch]
  );

  const handleForceUnlock = useCallback(
    async (nodeId: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, claimed_by: null, claim_holder: null, claim_expires_at: null }
            : n
        )
      );

      broadcastEvent("claim:changed", {
        nodeId,
        claimedBy: null,
        claimHolder: null,
        expiresAt: null,
        action: "force_unlock",
      });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "force_unlock", node_id: nodeId }),
        });
        notify({ title: "Milestone Unlocked", message: "Owner override applied" });
      } catch (e) {
        console.error("Failed to force unlock:", e);
      }
    },
    [broadcastEvent, notify, project.slug, secureFetch]
  );

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const nextIdx = historyIndexRef.current - 1;
    historyIndexRef.current = nextIdx;
    const snapshot = historyRef.current[nextIdx];
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setCanUndo(nextIdx > 0);
      setCanRedo(true);
      notify({ title: "Undo Applied", message: "Restored previous state" });
    }
  }, [notify]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const nextIdx = historyIndexRef.current + 1;
    historyIndexRef.current = nextIdx;
    const snapshot = historyRef.current[nextIdx];
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setCanUndo(true);
      setCanRedo(nextIdx < historyRef.current.length - 1);
      notify({ title: "Redo Applied", message: "Reapplied state change" });
    }
  }, [notify]);

  // Generate Visual Workflow Pipeline with AI
  const handleGenerateAIWorkflow = useCallback(
    async (promptText: string, mode?: string) => {
      const generatorName = currentUser.fullName || currentUser.email;
      setIsAIGenerating(true);
      setAiGeneratingUser(generatorName);
      setIsAuraExiting(false);
      broadcastEvent("ai:generating_start", {
        userId: currentUser.id,
        userName: generatorName,
      });

      try {
        const res = await secureFetch(
          `/api/dashboard/projects/${project.slug}/canvas/ai-generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptText, mode: mode || "workflow" }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error || "Failed to generate workflow with AI");
        }

        if (data.success && data.nodes) {
          const isUpdateIntent = data.intent === "update_pipeline";

          if (isUpdateIntent) {
            setNodes(data.nodes);
            if (data.edges) {
              setEdges(data.edges);
            }
            pushHistorySnapshot(data.nodes, data.edges || edges);

            broadcastEvent("canvas:batch_updated", {
              nodes: data.nodes,
              edges: data.edges,
              creatorName: generatorName,
              summary: data.summary,
            });

            notify({
              title: "Pipeline Updated",
              message: data.summary || "AI updated the workflow pipeline.",
            });
          } else {
            let nextNodes: CanvasNode[] = [];
            let nextEdges: CanvasEdge[] = [];

            setNodes((prev) => {
              const dataMap = new Map(data.nodes.map((n: CanvasNode) => [n.id, n]));
              const updatedPrev = prev.map((n) => (dataMap.has(n.id) ? (dataMap.get(n.id) as CanvasNode) : n));
              const prevIds = new Set(prev.map((n) => n.id));
              const brandNew = data.nodes.filter((n: CanvasNode) => !prevIds.has(n.id));
              nextNodes = [...updatedPrev, ...brandNew];
              return nextNodes;
            });

            if (data.edges) {
              setEdges((prev) => {
                const dataMap = new Map(data.edges.map((e: CanvasEdge) => [e.id, e]));
                const updatedPrev = prev.map((e) => (dataMap.has(e.id) ? (dataMap.get(e.id) as CanvasEdge) : e));
                const prevIds = new Set(prev.map((e) => e.id));
                const brandNew = data.edges.filter((e: CanvasEdge) => !prevIds.has(e.id));
                nextEdges = [...updatedPrev, ...brandNew];
                return nextEdges;
              });
            }

            pushHistorySnapshot(nextNodes, nextEdges);

            broadcastEvent("canvas:batch_created", {
              nodes: data.nodes,
              edges: data.edges,
              creatorName: generatorName,
              summary: data.summary,
            });

            if (data.nodes.length > 0) {
              const firstNode = data.nodes[0];
              setViewport((prev) => ({
                ...prev,
                x: Math.round(-firstNode.position_x * prev.zoom + 200),
                y: Math.round(-firstNode.position_y * prev.zoom + 150),
              }));
            }

            notify({
              title: "Workflow Generated",
              message: data.summary || "New AI workflow pipeline added to canvas.",
            });
          }

          if (typeof data.requests_remaining === "number") {
            setAiRequestsRemaining(data.requests_remaining);
          }

          setIsAIAssistantOpen(false);
        }
      } finally {
        broadcastEvent("ai:generating_end", { userId: currentUser.id });
        setIsAuraExiting(true);
      }
    },
    [broadcastEvent, currentUser.email, currentUser.fullName, currentUser.id, edges, notify, project.slug, pushHistorySnapshot, secureFetch]
  );

  // ---------------------------------------------------------------------------
  // 1. Supabase Realtime Subscription & Presence
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const channelName = `project-canvas:${project.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUser.id },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const activeCollaborators: CollaboratorPresence[] = [];

        for (const [key, presences] of Object.entries(state)) {
          const p = (presences as unknown as Array<{
            email?: string;
            fullName?: string;
            avatarUrl?: string | null;
            cursor?: { x: number; y: number } | null;
            selectedNodeId?: string | null;
          }>)[0];
          if (p) {
            activeCollaborators.push({
              userId: key,
              email: p.email || "",
              fullName: p.fullName || p.email?.split("@")[0] || "Collaborator",
              avatarUrl: p.avatarUrl || null,
              color: getUserColor(key),
              cursor: p.cursor || null,
              selectedNodeId: p.selectedNodeId || null,
              lastActive: Date.now(),
            });
          }
        }
        collaboratorsRef.current = activeCollaborators;
        setCollaborators(activeCollaborators);
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        setCollaborators((prev) =>
          prev.map((c) =>
            c.userId === payload.userId ? { ...c, cursor: payload.cursor } : c
          )
        );

        // If following this user, smoothly update viewport to center on their cursor
        if (followingUserId && payload.userId === followingUserId && payload.cursor) {
          setViewport((prev) => ({
            ...prev,
            x: Math.round(window.innerWidth / 2 - payload.cursor.x * prev.zoom),
            y: Math.round(window.innerHeight / 2 - payload.cursor.y * prev.zoom),
          }));
        }
      })
      .on("broadcast", { event: "claim:changed" }, ({ payload }) => {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === payload.nodeId
              ? {
                  ...n,
                  claimed_by: payload.claimedBy,
                  claim_holder: payload.claimHolder,
                  claim_expires_at: payload.expiresAt,
                }
              : n
          )
        );

        if (payload.action === "release" && payload.claimedBy === null) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === payload.nodeId
                ? { ...n, claimed_by: null, claim_holder: null }
                : n
            )
          );
        }
      })
      .on("broadcast", { event: "node:updated" }, ({ payload }) => {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === payload.nodeId ? { ...n, ...payload.updates } : n
          )
        );
      })
      .on("broadcast", { event: "node:drag" }, ({ payload }) => {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === payload.nodeId
              ? { ...n, position_x: payload.x, position_y: payload.y }
              : n
          )
        );
      })
      .on("broadcast", { event: "checkpoint:toggled" }, ({ payload }) => {
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== payload.nodeId) return n;
            const updatedCps = n.checkpoints.map((cp) =>
              cp.id === payload.checkpointId
                ? { ...cp, is_completed: payload.isCompleted }
                : cp
            );
            const allDone = updatedCps.every((c) => c.is_completed);
            const anyDone = updatedCps.some((c) => c.is_completed);
            const nextStatus = allDone ? "completed" : anyDone ? "in_progress" : "draft";

            return {
              ...n,
              checkpoints: updatedCps,
              status: nextStatus as CanvasNode["status"],
            };
          })
        );
      })
      .on("broadcast", { event: "claim:requested" }, ({ payload }) => {
        if (payload.current_holder_id === currentUser.id) {
          setIncomingClaimModal(payload);
          notify({
            title: "Edit Claim Requested",
            message: `${payload.requester_name || "A collaborator"} wants to edit "${payload.node_title || "Milestone"}"`,
          });
        }
      })
      .on("broadcast", { event: "canvas:batch_created" }, ({ payload }) => {
        if (payload?.nodes && Array.isArray(payload.nodes)) {
          setNodes((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newNodes = payload.nodes.filter((n: CanvasNode) => !existingIds.has(n.id));
            return [...prev, ...newNodes];
          });
        }
        if (payload?.edges && Array.isArray(payload.edges)) {
          setEdges((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newEdges = payload.edges.filter((e: CanvasEdge) => !existingIds.has(e.id));
            return [...prev, ...newEdges];
          });
        }
        notify({
          title: "AI Workflow Added",
          message: `${payload?.creatorName || "A collaborator"} generated new milestones with AI.`,
        });
      })
      .on("broadcast", { event: "canvas:batch_updated" }, ({ payload }) => {
        if (payload?.nodes && Array.isArray(payload.nodes)) {
          setNodes(payload.nodes);
        }
        if (payload?.edges && Array.isArray(payload.edges)) {
          setEdges(payload.edges);
        }
        notify({
          title: "AI Workflow Updated",
          message: payload?.summary || `${payload?.creatorName || "A collaborator"} updated the workflow pipeline with AI.`,
        });
      })
      .on("broadcast", { event: "ai:generating_start" }, ({ payload }) => {
        if (payload?.userId !== currentUser.id) {
          setIsAIGenerating(true);
          setAiGeneratingUser(payload?.userName || "A collaborator");
          setIsAuraExiting(false);
        }
      })
      .on("broadcast", { event: "ai:generating_end" }, ({ payload }) => {
        if (payload?.userId !== currentUser.id) {
          setIsAuraExiting(true);
        }
      })
      .on("broadcast", { event: "edge:created" }, ({ payload }) => {
        if (payload?.edge) {
          const newEdge = payload.edge as CanvasEdge;
          setEdges((prev) => {
            if (prev.some((e) => e.id === newEdge.id)) return prev;
            return [...prev, newEdge];
          });
        }
      })
      .on("broadcast", { event: "edge:deleted" }, ({ payload }) => {
        if (payload?.edgeId) {
          setEdges((prev) => prev.filter((e) => e.id !== payload.edgeId));
        }
      })
      .on("broadcast", { event: "node:created" }, ({ payload }) => {
        if (payload?.node) {
          const newNode = payload.node as CanvasNode;
          setNodes((prev) => {
            if (prev.some((n) => n.id === newNode.id)) return prev;
            return [...prev, { ...newNode, checkpoints: newNode.checkpoints || [] }];
          });
        }
      })
      .on("broadcast", { event: "node:deleted" }, ({ payload }) => {
        if (payload?.nodeId) {
          setNodes((prev) => prev.filter((n) => n.id !== payload.nodeId));
          setEdges((prev) =>
            prev.filter(
              (e) =>
                e.source_node_id !== payload.nodeId &&
                e.target_node_id !== payload.nodeId
            )
          );
        }
      })
      .on("broadcast", { event: "checkpoint:added" }, ({ payload }) => {
        if (payload?.nodeId && payload?.checkpoint) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === payload.nodeId
                ? {
                    ...n,
                    checkpoints: n.checkpoints.some((c) => c.id === payload.checkpoint.id)
                      ? n.checkpoints
                      : [...n.checkpoints, payload.checkpoint],
                  }
                : n
            )
          );
        }
      })
      .on("broadcast", { event: "checkpoint:deleted" }, ({ payload }) => {
        if (payload?.nodeId && payload?.checkpointId) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === payload.nodeId
                ? {
                    ...n,
                    checkpoints: n.checkpoints.filter((c) => c.id !== payload.checkpointId),
                  }
                : n
            )
          );
        }
      });

    canvasChannelRef.current = channel;
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setNetworkStatus("online");
        await channel.track({
          userId: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.fullName,
          avatarUrl: currentUser.avatarUrl,
          cursor: null,
          selectedNodeId: null,
        });
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setNetworkStatus("reconnecting");
      } else if (status === "CLOSED") {
        setNetworkStatus("offline");
      }
    });

    const handleOnline = () => {
      setNetworkStatus("online");
      resyncCanvasState();
    };
    const handleOffline = () => setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (canvasChannelRef.current === channel) {
        canvasChannelRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [project.id, currentUser.id, currentUser.email, currentUser.fullName, currentUser.avatarUrl, supabase, notify, resyncCanvasState, followingUserId]);

  // Ping probe
  useEffect(() => {
    let isCancelled = false;

    const measureLatency = async () => {
      if (!navigator.onLine) {
        setNetworkStatus("offline");
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      const start = performance.now();
      try {
        const res = await fetch("/api/ping", {
          method: "HEAD",
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });

        if (!isCancelled && (res.ok || res.status === 204)) {
          const rtt = Math.max(1, Math.round(performance.now() - start));
          setLatencyMs(rtt);
          setNetworkStatus(rtt > 300 ? "slow" : "online");
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        if (err instanceof Error && err.name === "TimeoutError") {
          setLatencyMs(5000);
          setNetworkStatus("slow");
        } else if (!navigator.onLine) {
          setNetworkStatus("offline");
        }
      }
    };

    measureLatency();
    const pingInterval = setInterval(measureLatency, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        measureLatency();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isCancelled = true;
      clearInterval(pingInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Membership verify
  useEffect(() => {
    if (isEvicted) return;

    let isChecking = false;
    const verifyAccess = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const res = await fetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          cache: "no-store",
          headers: { pragma: "no-cache", "cache-control": "no-cache" },
        });
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          handleEviction();
          return;
        }
        const json = await res.json();
        if (json.error === "Forbidden" || json.error === "Unauthorized" || json.error === "Project not found") {
          handleEviction();
        }
      } catch {
      } finally {
        isChecking = false;
      }
    };

    verifyAccess();
    const interval = setInterval(verifyAccess, 2000);
    window.addEventListener("focus", verifyAccess);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", verifyAccess);
    };
  }, [handleEviction, isEvicted, project.slug]);

  // Expiration scanner
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNodes((prev) => {
        let hasExpired = false;
        const next = prev.map((n) => {
          if (n.claimed_by && n.claim_expires_at) {
            const exp = new Date(n.claim_expires_at).getTime();
            if (exp <= now) {
              hasExpired = true;
              return {
                ...n,
                claimed_by: null,
                claim_holder: null,
                claim_expires_at: null,
              };
            }
          }
          return n;
        });
        return hasExpired ? next : prev;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  // Heartbeat lease renewal
  useEffect(() => {
    const interval = setInterval(async () => {
      const heldNodes = nodes.filter((n) => n.claimed_by === currentUser.id);
      for (const node of heldNodes) {
        try {
          await fetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "heartbeat", node_id: node.id }),
          });
        } catch {}
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [nodes, currentUser.id, project.slug]);

  // Pointer Move (Cursor broadcast + dragging + magnetic handle snapping)
  const handlePointerMove = useCallback(
    (
      worldPos: { x: number; y: number },
      screenPos: { x: number; y: number }
    ) => {
      const now = performance.now();
      const lastTime = lastOutboundCursorTimeRef.current;
      const lastPos = lastOutboundPosRef.current;

      const elapsed = now - lastTime;
      const distSq = lastPos
        ? (worldPos.x - lastPos.x) ** 2 + (worldPos.y - lastPos.y) ** 2
        : Infinity;

      const activeDrag = draggingNodeRef.current;

      if (elapsed >= 28 && (distSq >= 2.0 || activeDrag)) {
        lastOutboundCursorTimeRef.current = now;
        lastOutboundPosRef.current = worldPos;

        const dtSec = Math.max(elapsed / 1000, 0.016);
        const vx = lastPos ? (worldPos.x - lastPos.x) / dtSec : 0;
        const vy = lastPos ? (worldPos.y - lastPos.y) / dtSec : 0;

        canvasChannelRef.current?.send({
          type: "broadcast",
          event: "cursor",
          payload: {
            userId: currentUser.id,
            cursor: worldPos,
            t: now,
            vx,
            vy,
          },
        });
      }

      // Dragging single or multiple nodes
      if (activeDrag) {
        const dx = (screenPos.x - activeDrag.pointerStartScreen.x) / viewport.zoom;
        const dy = (screenPos.y - activeDrag.pointerStartScreen.y) / viewport.zoom;

        const initMap = activeDrag.initialPositions;
        const isBatch = initMap && initMap.size > 1;

        if (isBatch) {
          const currentBatchPositions = new Map<string, { x: number; y: number }>();
          setNodes((prev) =>
            prev.map((n) => {
              const init = initMap.get(n.id);
              if (!init) return n;
              let nextX = init.x + dx;
              let nextY = init.y + dy;
              if (snapGrid) {
                nextX = snapToGrid(nextX, 16);
                nextY = snapToGrid(nextY, 16);
              }
              currentBatchPositions.set(n.id, { x: nextX, y: nextY });
              return { ...n, position_x: nextX, position_y: nextY };
            })
          );
          draggingNodeRef.current = {
            ...activeDrag,
            lastPosition: currentBatchPositions.get(activeDrag.nodeId) || activeDrag.lastPosition,
            lastPositions: currentBatchPositions,
          };
        } else {
          let nextX = activeDrag.startPos.x + dx;
          let nextY = activeDrag.startPos.y + dy;
          if (snapGrid) {
            nextX = snapToGrid(nextX, 16);
            nextY = snapToGrid(nextY, 16);
          }
          const lastPosition = { x: nextX, y: nextY };
          draggingNodeRef.current = { ...activeDrag, lastPosition };
          setNodes((prev) =>
            prev.map((n) =>
              n.id === activeDrag.nodeId
                ? { ...n, position_x: nextX, position_y: nextY }
                : n
            )
          );

          canvasChannelRef.current?.send({
            type: "broadcast",
            event: "node:drag",
            payload: {
              nodeId: activeDrag.nodeId,
              x: nextX,
              y: nextY,
            },
          });
        }
      }

      // Draft Edge linking + Magnetic snapping
      if (draftEdgeRef.current) {
        // Check expanded 50px handle radius
        const nearest = findNearestHandle(worldPos, nodes, draftEdgeRef.current.sourceNode.id, 50);
        if (nearest) {
          setSnappedHandle({ node: nearest.node, handle: nearest.handle });
          const cycle = detectCycle(edges, {
            sourceNodeId: draftEdgeRef.current.sourceNode.id,
            targetNodeId: nearest.node.id,
          });
          setIsCycleDetected(cycle);
          setDraftEdge((prev) => (prev ? { ...prev, currentPos: nearest.position } : null));
        } else {
          // Check if hovering anywhere over another node body to snap magnetically to its closest port
          const hoveredCandidate = nodes.find(
            (n) =>
              n.id !== draftEdgeRef.current!.sourceNode.id &&
              worldPos.x >= n.position_x &&
              worldPos.x <= n.position_x + (n.width || 200) &&
              worldPos.y >= n.position_y &&
              worldPos.y <= n.position_y + (n.height || 100)
          );

          if (hoveredCandidate) {
            const bestHandle = getClosestHandleToPoint(hoveredCandidate, worldPos);
            const bestPos = getNodeHandlePosition(hoveredCandidate, bestHandle);
            setSnappedHandle({ node: hoveredCandidate, handle: bestHandle });
            const cycle = detectCycle(edges, {
              sourceNodeId: draftEdgeRef.current.sourceNode.id,
              targetNodeId: hoveredCandidate.id,
            });
            setIsCycleDetected(cycle);
            setDraftEdge((prev) => (prev ? { ...prev, currentPos: bestPos } : null));
          } else {
            setSnappedHandle(null);
            setIsCycleDetected(false);
            setDraftEdge((prev) => (prev ? { ...prev, currentPos: worldPos } : null));
          }
        }
      }
    },
    [snapGrid, currentUser.id, viewport.zoom, nodes, edges]
  );

  const handleDragEnd = useCallback(async () => {
    const completedDrag = draggingNodeRef.current;
    if (!completedDrag) return;

    draggingNodeRef.current = null;
    setDraggingNode(null);

    const initMap = completedDrag.initialPositions;
    const finalBatchPositions = completedDrag.lastPositions;

    if (initMap && initMap.size > 1 && finalBatchPositions) {
      // Commit all batch nodes in parallel
      const updatePromises = Array.from(finalBatchPositions.entries()).map(([nodeId, pos]) =>
        secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_node",
            node_id: nodeId,
            updates: {
              position_x: pos.x,
              position_y: pos.y,
            },
          }),
        }).catch((err) => console.error("Batch drag node commit failed:", err))
      );
      await Promise.all(updatePromises);
    } else {
      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_node",
            node_id: completedDrag.nodeId,
            updates: {
              position_x: completedDrag.lastPosition.x,
              position_y: completedDrag.lastPosition.y,
            },
          }),
        });
      } catch (e) {
        console.error("Failed to commit node drag:", e);
      }
    }
  }, [project.slug, secureFetch]);

  // Marquee Selection Handlers
  const handleMarqueeStart = (worldPos: { x: number; y: number }) => {
    const initMarquee = {
      startX: worldPos.x,
      startY: worldPos.y,
      currentX: worldPos.x,
      currentY: worldPos.y,
    };
    selectionMarqueeRef.current = initMarquee;
    setSelectionMarquee(initMarquee);
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
  };

  const handleMarqueeChange = (worldPos: { x: number; y: number }) => {
    const marquee = selectionMarqueeRef.current;
    if (!marquee) return;
    marquee.currentX = worldPos.x;
    marquee.currentY = worldPos.y;
    setSelectionMarquee({ ...marquee });

    const minX = Math.min(marquee.startX, worldPos.x);
    const maxX = Math.max(marquee.startX, worldPos.x);
    const minY = Math.min(marquee.startY, worldPos.y);
    const maxY = Math.max(marquee.startY, worldPos.y);

    const insideIds = new Set<string>();
    for (const node of nodes) {
      const nw = node.width || (node.node_type === "aws_service" ? 200 : node.node_type === "group" ? 400 : 280);
      const nh = node.height || (node.node_type === "aws_service" ? 140 : node.node_type === "group" ? 300 : 170);
      const nodeRight = node.position_x + nw;
      const nodeBottom = node.position_y + nh;

      // Check bounding box intersection
      const intersects =
        node.position_x < maxX &&
        nodeRight > minX &&
        node.position_y < maxY &&
        nodeBottom > minY;

      if (intersects) {
        insideIds.add(node.id);
      }
    }
    setSelectedNodeIds(insideIds);
    if (insideIds.size === 1) {
      setSelectedNodeId(Array.from(insideIds)[0]);
    } else if (insideIds.size === 0) {
      setSelectedNodeId(null);
    }
  };

  const handleMarqueeEnd = () => {
    selectionMarqueeRef.current = null;
    setSelectionMarquee(null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedNodeId(null);
        setSelectedNodeIds(new Set());
        draftEdgeRef.current = null;
        setDraftEdge(null);
        setFollowingUserId(null);
      } else if (isAIGenerating) {
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedNodeIds(new Set(nodes.map((n) => n.id)));
      } else if (e.key === "v" || e.key === "V") {
        setActiveTool("select");
      } else if (e.key === "h" || e.key === "H") {
        setActiveTool("hand");
      } else if (e.key === "n" || e.key === "N") {
        handleAddNode();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeIds.size > 0 || selectedNodeId) {
          e.preventDefault();
          handleDeleteSelectedNodes();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleAddNode,
    handleDeleteNode,
    handleDeleteSelectedNodes,
    handleRedo,
    handleUndo,
    isAIGenerating,
    nodes,
    selectedNodeId,
    selectedNodeIds,
  ]);

  // Linking & Port Click
  const handlePortClick = async (node: CanvasNode, handle: HandlePosition) => {
    const activeDraft = draftEdgeRef.current;
    if (!activeDraft) {
      const nextDraft = {
        sourceNode: node,
        sourceHandle: handle,
        currentPos: getNodeHandlePosition(node, handle),
      };
      draftEdgeRef.current = nextDraft;
      setDraftEdge(nextDraft);
      notify({ title: "Connection Started", message: "Choose a port on another milestone" });
      return;
    }

    if (activeDraft.sourceNode.id === node.id) {
      draftEdgeRef.current = null;
      setDraftEdge(null);
      setSnappedHandle(null);
      return;
    }

    const sourceNodeId = activeDraft.sourceNode.id;
    const targetNodeId = node.id;
    const sourceHandle = activeDraft.sourceHandle;
    const canConnect = canConnectMilestones(
      activeDraft.sourceNode,
      node,
      currentUser.id,
      isOwner
    );

    draftEdgeRef.current = null;
    setDraftEdge(null);
    setSnappedHandle(null);

    if (!canConnect) {
      notify({
        tone: "error",
        title: "Claim Required",
        message: "You must claim at least one of the milestone boxes to create a connection",
      });
      return;
    }

    // Check for circular dependency
    const cycle = detectCycle(edges, { sourceNodeId, targetNodeId });
    if (cycle) {
      notify({
        tone: "error",
        title: "Circular Dependency",
        message: "Connecting these milestones would create a circular dependency loop",
      });
      return;
    }

    const exists = edges.some(
      (edge) => edge.source_node_id === sourceNodeId && edge.target_node_id === targetNodeId
    );
    if (exists) {
      notify({ title: "Already Connected", message: "These milestones already have a dependency wire" });
      return;
    }

    const targetHandle: HandlePosition =
      snappedHandle?.node.id === node.id
        ? snappedHandle.handle
        : handle !== "left"
        ? handle
        : getClosestHandleToPoint(node, activeDraft.currentPos);

    // 0ms instant local insertion
    const clientEdgeId = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const optimisticEdge: CanvasEdge = {
      id: clientEdgeId,
      project_id: project.id,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      source_handle: sourceHandle,
      target_handle: targetHandle,
      edge_type: "dependency",
    };

    const nextEdges = [...edges, optimisticEdge];
    setEdges(nextEdges);
    pushHistorySnapshot(nodes, nextEdges);
    canvasSounds.link();
    broadcastEvent("edge:created", { edge: optimisticEdge });
    notify({ title: "Connected!", message: "Dependency wire created" });

    // Cache immediately in browser localStorage
    const cacheKey = `novastage:canvas:${project.id}:edges`;
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(nextEdges));
    } catch (err) {
      console.warn("Failed to cache edges in localStorage:", err);
    }

    // Background persistence with success reconciliation & automatic rollback on error
    secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_edge",
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        source_handle: sourceHandle,
        target_handle: targetHandle,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (data.success && data.edge) {
          // Edge confirmed and persisted on server
          setEdges((prev) =>
            prev.map((e) => (e.id === clientEdgeId ? data.edge : e))
          );
          try {
            const currentCached = JSON.parse(
              window.localStorage.getItem(cacheKey) || "[]"
            ) as CanvasEdge[];
            const updatedCached = currentCached.map((e) =>
              e.id === clientEdgeId ? data.edge : e
            );
            window.localStorage.setItem(cacheKey, JSON.stringify(updatedCached));
          } catch {}
        } else {
          throw new Error(data.error || "Failed to persist dependency wire");
        }
      })
      .catch((err) => {
        console.error("Failed to link nodes on server, rolling back:", err);
        // Instant rollback on error
        setEdges((prev) => prev.filter((e) => e.id !== clientEdgeId));
        try {
          const currentCached = JSON.parse(
            window.localStorage.getItem(cacheKey) || "[]"
          ) as CanvasEdge[];
          const rolledBack = currentCached.filter((e) => e.id !== clientEdgeId);
          window.localStorage.setItem(cacheKey, JSON.stringify(rolledBack));
        } catch {}
        broadcastEvent("edge:deleted", { edgeId: clientEdgeId });
        notify({
          tone: "error",
          title: "Connection Failed",
          message: err instanceof Error ? err.message : "Failed to connect milestones",
        });
      });
  };

  const handleStartLink = (
    node: CanvasNode,
    handle: HandlePosition,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    void handlePortClick(node, handle);
  };

  const handleDeleteEdge = async (edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (edge) {
      const src = nodes.find((n) => n.id === edge.source_node_id);
      const tgt = nodes.find((n) => n.id === edge.target_node_id);
      const canDelete = isOwner || src?.claimed_by === currentUser.id || tgt?.claimed_by === currentUser.id;
      if (!canDelete) {
        notify({ tone: "error", title: "Action Denied", message: "You must claim a linked milestone box to remove this link" });
        return;
      }
    }

    const nextEdges = edges.filter((e) => e.id !== edgeId);
    setEdges(nextEdges);
    pushHistorySnapshot(nodes, nextEdges);
    canvasSounds.deleteNode();
    broadcastEvent("edge:deleted", { edgeId });

    // Cache updated edges in browser
    const cacheKey = `novastage:canvas:${project.id}:edges`;
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(nextEdges));
    } catch {}

    try {
      await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_edge", edge_id: edgeId }),
      });
    } catch (e) {
      console.error("Failed to delete edge:", e);
    }
  };

  const handleTidyLayout = () => {
    const tidyNodes = autoLayoutNodes(nodes, edges);
    setNodes(tidyNodes);
    pushHistorySnapshot(tidyNodes, edges);

    tidyNodes.forEach((n) => {
      handleUpdateNode(n.id, {
        position_x: n.position_x,
        position_y: n.position_y,
      });
    });
    notify({ title: "Auto-Layout Complete", message: "Arranged milestones in roadmap order" });
  };

  const handleFitView = () => {
    if (nodes.length === 0) {
      setViewport({ x: 100, y: 100, zoom: 1.0 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      minX = Math.min(minX, n.position_x);
      minY = Math.min(minY, n.position_y);
      maxX = Math.max(maxX, n.position_x + n.width);
      maxY = Math.max(maxY, n.position_y + n.height);
    });

    const padding = 100;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const screenW = window.innerWidth - (window.innerWidth > 768 ? 260 : 70);
    const screenH = window.innerHeight;

    const zoom = Math.min(Math.max(Math.min(screenW / width, screenH / height), 0.3), 1.2);
    const x = (screenW - width * zoom) / 2 - minX * zoom + padding * zoom;
    const y = (screenH - height * zoom) / 2 - minY * zoom + padding * zoom;

    setViewport({ x, y, zoom });
  };

  const handleJumpToNode = (targetNodeId: string) => {
    const target = nodes.find((n) => n.id === targetNodeId);
    if (!target) return;

    setIsNotebookOpen(false);
    setSelectedNodeId(target.id);
    setSelectedNodeIds(new Set([target.id]));
    const screenW = window.innerWidth / 2;
    const screenH = window.innerHeight / 2;

    setViewport({
      x: screenW - (target.position_x + target.width / 2) * viewport.zoom,
      y: screenH - (target.position_y + target.height / 2) * viewport.zoom,
      zoom: viewport.zoom,
    });
  };

  // Export handlers
  const handleExportMermaid = () => {
    const markdown = exportToMermaid(nodes, edges);
    navigator.clipboard.writeText(markdown);
    notify({
      title: "Mermaid Code Copied",
      message: "Copied Mermaid.js diagram definition to clipboard",
    });
  };

  const handleExportJSON = () => {
    const data = {
      project: { id: project.id, name: project.name, slug: project.slug },
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.slug}-roadmap.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify({ title: "Roadmap Exported", message: `Downloaded ${project.slug}-roadmap.json` });
  };

  const completedCount = nodes.filter((n) =>
    n.checkpoints.length > 0
      ? n.checkpoints.every((c) => c.is_completed)
      : n.status === "completed"
  ).length;

  if (isEvicted) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center bg-neutral-950 text-white">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-100">Access Revoked</h2>
          <p className="max-w-sm text-xs text-neutral-400">
            You have been removed from this project by the owner. Redirecting you to your projects workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={setCanvasRootElement} className="relative h-full w-full overflow-hidden select-none">
      {/* Top Floating HUD with Follow Mode and Export */}
      <CanvasHud
        projectName={project.name}
        inviteCode={project.invite_code}
        isOwner={isOwner}
        totalNodes={nodes.length}
        completedNodes={completedCount}
        collaborators={collaborators}
        currentUserId={currentUser.id}
        networkStatus={networkStatus}
        latencyMs={latencyMs}
        followingUserId={followingUserId}
        onToggleFollowUser={(uId) =>
          setFollowingUserId((prev) => (prev === uId ? null : uId))
        }
        onExportMermaid={handleExportMermaid}
        onExportJSON={handleExportJSON}
        onCopyInvite={() => {
          if (project.invite_code) {
            navigator.clipboard.writeText(project.invite_code);
            notify({ title: "Invite Code Copied", message: project.invite_code });
          }
        }}
      />

      {/* Infinite Interactive Canvas Viewport with Marquee Selection */}
      <CanvasViewportContainer
        viewport={viewport}
        onViewportChange={(vp) => {
          setFollowingUserId(null); // Cancel follow mode when user manually pans/zooms
          setViewport(vp);
        }}
        activeTool={activeTool}
        isDraggingNode={Boolean(draggingNode)}
        selectionMarquee={selectionMarquee}
        onCanvasClick={(worldPos) => {
          if (isAIGenerating) return;
          if (activeTool === "add_node") {
            handleAddNode(worldPos);
            setActiveTool("select");
          } else if (draftEdgeRef.current) {
            draftEdgeRef.current = null;
            setDraftEdge(null);
            setSnappedHandle(null);
          } else {
            setSelectedNodeId(null);
            setSelectedNodeIds(new Set());
          }
        }}
        onPointerMove={handlePointerMove}
        onMarqueeStart={handleMarqueeStart}
        onMarqueeChange={handleMarqueeChange}
        onMarqueeEnd={handleMarqueeEnd}
      >
        {/* SVG Edge / Dependency Wire Layer with Magnetic Snap & Cycle Indicator */}
        <CanvasEdgeLayer
          edges={edges}
          nodes={nodes}
          draftEdge={draftEdge}
          onDeleteEdge={handleDeleteEdge}
          currentUserId={currentUser.id}
          isOwner={isOwner}
          isCycleDetected={isCycleDetected}
          snappedHandle={snappedHandle}
        />

        {/* Canvas Nodes Layer: Groups in background, services and milestones on top */}
        {[...nodes]
          .sort((a, b) => {
            const getLayer = (n: CanvasNode) => {
              if (n.node_type === "group") {
                return n.group_metadata?.style === "vpc" ? 0 : 1;
              }
              return 2;
            };
            return getLayer(a) - getLayer(b);
          })
          .map((node, index) => (
          <CanvasNodeComponent
            key={node.id}
            node={node}
            stepIndex={index}
            isSelected={selectedNodeId === node.id}
            isMultiSelected={selectedNodeIds.has(node.id)}
            isLinking={Boolean(draftEdge)}
            currentUserId={currentUser.id}
            onSelect={(n, isShift) => {
              if (isAIGenerating) return;
              if (isShift) {
                setSelectedNodeIds((prev) => {
                  const copy = new Set(prev);
                  if (copy.has(n.id)) copy.delete(n.id);
                  else copy.add(n.id);
                  return copy;
                });
              } else {
                if (!selectedNodeIds.has(n.id)) {
                  setIsNotebookOpen(false);
                  setSelectedNodeId(n.id);
                  setSelectedNodeIds(new Set([n.id]));
                } else {
                  setSelectedNodeId(n.id);
                }
              }
            }}
            onDragStart={(n, e) => {
              if (isAIGenerating) return;
              if (activeTool === "hand") return;

              // If dragging a node that is part of multi-selection, drag all selected
              const isBatch = selectedNodeIds.has(n.id) && selectedNodeIds.size > 1;
              const initPositions = new Map<string, { x: number; y: number }>();

              if (isBatch) {
                for (const sId of selectedNodeIds) {
                  const sNode = nodes.find((item) => item.id === sId);
                  if (sNode) {
                    initPositions.set(sId, { x: sNode.position_x, y: sNode.position_y });
                  }
                }
              }

              const nextDrag: DragState = {
                nodeId: n.id,
                startPos: { x: n.position_x, y: n.position_y },
                pointerStartScreen: { x: e.clientX, y: e.clientY },
                lastPosition: { x: n.position_x, y: n.position_y },
                initialPositions: isBatch ? initPositions : undefined,
                lastPositions: isBatch ? new Map(initPositions) : undefined,
              };
              draggingNodeRef.current = nextDrag;
              setDraggingNode(nextDrag);
            }}
            onDragEnd={handleDragEnd}
            onStartLink={(n, h, e) => {
              if (isAIGenerating) return;
              handleStartLink(n, h, e);
            }}
            onToggleCheckpoint={(cpId, nId, val) => {
              if (isAIGenerating) return;
              handleToggleCheckpoint(cpId, nId, val);
            }}
            onRequestClaim={(n) => {
              if (isAIGenerating) return;
              handleRequestClaim(n);
            }}
            onClaimNode={(nId) => {
              if (isAIGenerating) return;
              handleClaimNode(nId);
            }}
            onUpdateTitle={(nId, newTitle) => {
              handleUpdateNode(nId, { title: newTitle });
            }}
            zoom={viewport.zoom}
            onResize={(nId, width, height) => {
              handleUpdateNode(nId, { width, height });
            }}
          />
        ))}

        {/* Multiplayer Live Cursors */}
        <CanvasCursors
          collaborators={collaborators}
          currentUserId={currentUser.id}
        />
      </CanvasViewportContainer>

      {/* Interactive Radar Minimap Component */}
      <CanvasMinimap
        nodes={nodes}
        viewport={viewport}
        onViewportChange={setViewport}
        isOpen={isMinimapOpen}
        onToggleOpen={() => setIsMinimapOpen((v) => !v)}
      />

      {/* AI Generation Aura Overlay */}
      {isAIGenerating && (
        <CanvasAIAura
          generatingUserName={aiGeneratingUser}
          isExiting={isAuraExiting}
          onExitComplete={() => {
            setIsAIGenerating(false);
            setAiGeneratingUser(null);
            setIsAuraExiting(false);
          }}
        />
      )}

      {/* Mobile Quick Node Action Bar */}
      {selectedNode && isMobile && !isMobileDrawerOpen && (
        <CanvasMobileNodeBar
          node={selectedNode}
          stepIndex={nodes.findIndex((n) => n.id === selectedNodeId)}
          currentUserId={currentUser.id}
          onOpenDrawer={() => setIsMobileDrawerOpen(true)}
          onDeselect={() => setSelectedNodeId(null)}
          onClaimNode={handleClaimNode}
          onReleaseNode={handleReleaseNode}
          onRequestClaim={handleRequestClaim}
          onToggleCheckpoint={handleToggleCheckpoint}
        />
      )}

      {/* Slide-Out Right Milestone Detail Screen */}
      {selectedNode && (!isMobile || isMobileDrawerOpen) && (
        <CanvasDrawer
          node={selectedNode}
          allNodes={nodes}
          edges={edges}
          currentUserId={currentUser.id}
          isProjectOwner={isOwner}
          onClose={() => {
            if (isMobile) {
              setIsMobileDrawerOpen(false);
            } else {
              setSelectedNodeId(null);
            }
          }}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={(nodeId) => {
            setIsMobileDrawerOpen(false);
            handleDeleteNode(nodeId);
          }}
          onToggleCheckpoint={handleToggleCheckpoint}
          onAddCheckpoint={handleAddCheckpoint}
          onDeleteCheckpoint={handleDeleteCheckpoint}
          onClaimNode={handleClaimNode}
          onReleaseNode={handleReleaseNode}
          onRequestClaim={handleRequestClaim}
          onForceUnlock={handleForceUnlock}
          onJumpToNode={handleJumpToNode}
        />
      )}

      {/* Bottom Floating Control Bar (Canvas Tools Dock + AI Assistant) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-6 z-20 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2.5 px-3">
        {/* On mobile: AI Assistant & Notebook stack above toolbar (order-1). On desktop: sit alongside dock (sm:order-2) */}
        {(!isMobile || !selectedNode) && (
          <div className="order-1 sm:order-2 pointer-events-auto flex items-center justify-end sm:justify-start gap-2 w-full max-w-[340px] sm:w-auto sm:max-w-none">
            <CanvasAIAssistant
              isOpen={isAIAssistantOpen}
              portalContainer={canvasRootElement}
              onToggle={() => {
                setIsNotebookOpen(false);
                setIsReleasePulseOpen(false);
                setIsAIAssistantOpen((prev) => !prev);
              }}
              onClose={() => setIsAIAssistantOpen(false)}
              requestsRemaining={aiRequestsRemaining}
              onSubmitPrompt={handleGenerateAIWorkflow}
            />

            <CanvasNotebook
              projectId={project.id}
              isOpen={isNotebookOpen}
              onToggle={() => {
                setSelectedNodeId(null);
                setIsAIAssistantOpen(false);
                setIsReleasePulseOpen(false);
                setIsNotebookOpen((open) => !open);
              }}
              onClose={() => setIsNotebookOpen(false)}
            />
          </div>
        )}

        {/* Primary Canvas Dock: order-2 on mobile (at bottom), sm:order-1 on desktop (on left) */}
        <div className="order-2 sm:order-1 pointer-events-auto flex items-center justify-center max-w-full">
          <CanvasDock
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            viewport={viewport}
            onZoomIn={() =>
              setViewport((prev) => ({
                ...prev,
                zoom: Math.min(prev.zoom * 1.2, 2.5),
              }))
            }
            onZoomOut={() =>
              setViewport((prev) => ({
                ...prev,
                zoom: Math.max(prev.zoom * 0.8, 0.15),
              }))
            }
            onResetZoom={() => setViewport((prev) => ({ ...prev, zoom: 1.0 }))}
            onFitView={handleFitView}
            onAddNode={() => handleAddNode()}
            onTidyLayout={handleTidyLayout}
            snapGrid={snapGrid}
            onToggleSnapGrid={() => setSnapGrid((v) => !v)}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            isMinimapOpen={isMinimapOpen}
            onToggleMinimap={() => setIsMinimapOpen((v) => !v)}
            isReleasePulseOpen={isReleasePulseOpen}
            onToggleReleasePulse={() => {
              setSelectedNodeId(null);
              setIsAIAssistantOpen(false);
              setIsNotebookOpen(false);
              setIsReleasePulseOpen((open) => !open);
            }}
            onToggleServicePalette={() => {
              setIsServicePaletteOpen((open) => !open);
            }}
            onAddGroup={() => handleAddGroup()}
          />
        </div>
      </div>

      {/* AWS Service Palette Flyout */}
      <CanvasServicePalette
        isOpen={isServicePaletteOpen}
        onClose={() => setIsServicePaletteOpen(false)}
        onAddService={(serviceId) => handleAddAWSService(serviceId)}
      />

      {isReleasePulseOpen && (
        <CanvasReleasePulse
          nodes={nodes}
          edges={edges}
          onClose={() => setIsReleasePulseOpen(false)}
          onJumpToNode={(nodeId) => {
            setIsReleasePulseOpen(false);
            handleJumpToNode(nodeId);
          }}
        />
      )}

      {/* Realtime Claim Handoff Modal Prompt */}
      <CanvasClaimModal
        pendingRequest={incomingClaimModal}
        onResolve={handleResolveClaimRequest}
      />
    </div>
  );
}
