import { AWS_SERVICE_REGISTRY } from "@/components/canvas/aws-icons";
import type { CanvasEdge, CanvasGraphData, CanvasNode, HandlePosition } from "@/lib/canvas/types";

export const VISITOR_ID = "local-visitor";
const PROJECT_ID = "homepage-sandbox";

export function createService(id: string, title: string, serviceId: string, position_x: number, position_y: number): CanvasNode {
  const service = AWS_SERVICE_REGISTRY[serviceId];
  return {
    id, project_id: PROJECT_ID, title, description: service.description,
    position_x, position_y, width: 200, height: 140, color: "default",
    status: "draft", sort_order: 0, claimed_by: null, version: 1, checkpoints: [],
    node_type: "aws_service",
    aws_metadata: { serviceId, category: service.category, region: "us-east-1", config: service.defaultConfig },
  };
}

export function createMilestone(id: string, title: string, position_x: number, position_y: number): CanvasNode {
  return {
    id, project_id: PROJECT_ID, title, description: "", position_x, position_y,
    width: 280, height: 170, color: "default", status: "draft", sort_order: 0,
    claimed_by: VISITOR_ID, claim_holder: { id: VISITOR_ID, fullName: "You" }, version: 1,
    checkpoints: [], node_type: "milestone",
  };
}

export function createGroup(id: string, position_x: number, position_y: number): CanvasNode {
  return {
    id, project_id: PROJECT_ID, title: "VPC Network", description: "", position_x, position_y,
    width: 440, height: 320, color: "default", status: "draft", sort_order: 0,
    claimed_by: VISITOR_ID, claim_holder: { id: VISITOR_ID, fullName: "You" }, version: 1,
    checkpoints: [], node_type: "group",
    group_metadata: { label: "VPC Network", style: "vpc", childNodeIds: [] },
  };
}

export function createInitialGraph(compact = false): CanvasGraphData {
  const nodes = [
    createService("edge", "Next.js Edge", "cloudfront", 50, 230),
    createService("api", "API Gateway", "apigateway", 360, 230),
    createService("postgres", "Supabase Postgres", "rds", 710, 80),
    createService("redis", "Redis Cluster", "elasticache", 710, 380),
    createService("queue", "Worker Queue", "sqs", 1060, 230),
  ];
  if (compact) {
    const positions = [[0, 0], [270, 0], [0, 270], [270, 270], [135, 540]];
    nodes.forEach((node, index) => { [node.position_x, node.position_y] = positions[index]; });
  }
  const connections = [
    ["edge", "api", "HTTPS", "network"],
    ["api", "postgres", "PostgreSQL / TLS", "data_flow"],
    ["api", "redis", "RESP / TLS", "data_flow"],
    ["postgres", "queue", "Events", "event"],
    ["redis", "queue", "HTTPS", "network"],
  ] as const;
  return { nodes, edges: connections.map(([source, target, label, edge_type]) => ({
    id: `${source}-${target}`, project_id: PROJECT_ID, source_node_id: source,
    target_node_id: target, source_handle: compact && source !== "edge" ? "bottom" : "right",
    target_handle: compact && source !== "edge" ? "top" : "left", label, edge_type,
  })) };
}

export function connectNodes(graph: CanvasGraphData, source: string, target: string, sourceHandle: HandlePosition, targetHandle: HandlePosition): CanvasGraphData {
  if (source === target || !graph.nodes.some((node) => node.id === source) || !graph.nodes.some((node) => node.id === target)) return graph;
  if (graph.edges.some((edge) => edge.source_node_id === source && edge.target_node_id === target && edge.source_handle === sourceHandle && edge.target_handle === targetHandle)) return graph;
  const edge: CanvasEdge = {
    id: `${source}-${sourceHandle}-${target}-${targetHandle}`, project_id: PROJECT_ID,
    source_node_id: source, target_node_id: target, source_handle: sourceHandle,
    target_handle: targetHandle, edge_type: "network", label: "HTTPS",
  };
  return { ...graph, edges: [...graph.edges, edge] };
}

export function moveNode(graph: CanvasGraphData, id: string, x: number, y: number, snap: boolean): CanvasGraphData {
  const position_x = snap ? Math.round(x / 20) * 20 : x;
  const position_y = snap ? Math.round(y / 20) * 20 : y;
  return { ...graph, nodes: graph.nodes.map((node) => node.id === id ? { ...node, position_x, position_y } : node) };
}

export interface SandboxHistory { present: CanvasGraphData; past: CanvasGraphData[]; future: CanvasGraphData[] }
export type SandboxAction = { type: "commit" | "preview"; graph: CanvasGraphData } | { type: "checkpoint" | "undo" | "redo" | "reset" };
export const initialHistory = (): SandboxHistory => ({ present: createInitialGraph(), past: [], future: [] });

export function sandboxReducer(state: SandboxHistory, action: SandboxAction): SandboxHistory {
  switch (action.type) {
    case "reset": return initialHistory();
    case "preview": return { ...state, present: action.graph };
    case "checkpoint": return { ...state, past: [...state.past.slice(-29), state.present], future: [] };
    case "commit": return { present: action.graph, past: [...state.past.slice(-29), state.present], future: [] };
    case "undo": return state.past.length ? { present: state.past.at(-1)!, past: state.past.slice(0, -1), future: [state.present, ...state.future] } : state;
    case "redo": return state.future.length ? { present: state.future[0], past: [...state.past, state.present], future: state.future.slice(1) } : state;
  }
}

export function deleteNodes(graph: CanvasGraphData, ids: Set<string>): CanvasGraphData {
  return {
    nodes: graph.nodes.filter((node) => !ids.has(node.id)),
    edges: graph.edges.filter((edge) => !ids.has(edge.source_node_id) && !ids.has(edge.target_node_id)),
  };
}