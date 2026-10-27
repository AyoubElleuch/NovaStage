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
  const nodes: CanvasNode[] = [
    { ...createGroup("edge-group", 0, 0), title: "Global edge", width: 590, height: 400, group_metadata: { label: "Global edge", style: "custom", childNodeIds: ["edge", "web"] } },
    { ...createGroup("vpc-group", 710, 0), title: "Production VPC", width: 660, height: 730, group_metadata: { label: "Production VPC", style: "vpc", childNodeIds: ["api", "queue", "worker", "postgres"] } },
    createService("edge", "Amazon CloudFront", "cloudfront", 75, 100),
    createService("web", "Next.js application", "lambda", 325, 100),
    createService("api", "API Gateway", "apigateway", 790, 100),
    createService("queue", "Amazon SQS", "sqs", 1090, 100),
    createService("postgres", "Amazon RDS", "rds", 790, 430),
    createService("worker", "Lambda workers", "lambda", 1090, 430),
  ];
  if (compact) {
    const positions = [[0, 0], [0, 500], [75, 100], [325, 100], [75, 600], [325, 600], [75, 930], [325, 930]];
    nodes.forEach((node, index) => { [node.position_x, node.position_y] = positions[index]; });
    nodes[0] = { ...nodes[0], width: 590, height: 400 };
    nodes[1] = { ...nodes[1], width: 590, height: 730 };
  }
  const connections = [
    ["edge", "web", "HTTPS", "network", "right", "left"],
    ["web", "api", "HTTPS", "network", compact ? "bottom" : "right", compact ? "top" : "left"],
    ["api", "queue", "Jobs", "event", "right", "left"],
    ["queue", "worker", "Events", "event", "bottom", "top"],
    ["api", "postgres", "PostgreSQL / TLS", "data_flow", "bottom", "top"],
  ] as const;
  return { nodes, edges: connections.map(([source, target, label, edge_type, source_handle, target_handle]) => ({
    id: `${source}-${target}`, project_id: PROJECT_ID, source_node_id: source,
    target_node_id: target, source_handle, target_handle, label, edge_type,
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
