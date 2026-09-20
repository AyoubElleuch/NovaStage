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
    { ...createGroup("edge-group", 20, 90), title: "Global edge", width: 580, height: 280, group_metadata: { label: "Global edge", style: "custom", childNodeIds: ["edge", "web"] } },
    { ...createGroup("vpc-group", 670, 60), title: "Production VPC", width: 850, height: 540, group_metadata: { label: "Production VPC", style: "vpc", childNodeIds: ["api", "queue", "worker", "postgres", "redis"] } },
    createService("edge", "Amazon CloudFront", "cloudfront", 70, 160),
    createService("web", "Next.js application", "lambda", 300, 160),
    createService("api", "API Gateway", "apigateway", 730, 150),
    createService("worker", "Lambda workers", "lambda", 1260, 150),
    createService("postgres", "Amazon RDS", "rds", 1000, 390),
    createService("redis", "ElastiCache", "elasticache", 1260, 390),
    createService("queue", "Amazon SQS", "sqs", 1000, 150),
  ];
  if (compact) {
    const positions = [[0, 0], [0, 500], [40, 80], [40, 280], [40, 580], [40, 980], [260, 580], [260, 780], [40, 780]];
    nodes.forEach((node, index) => { [node.position_x, node.position_y] = positions[index]; });
    nodes[0] = { ...nodes[0], width: 500, height: 420 };
    nodes[1] = { ...nodes[1], width: 500, height: 800 };
  }
  const connections = [
    ["edge", "web", "HTTPS", "network"],
    ["web", "api", "HTTPS", "network"],
    ["api", "queue", "Jobs", "event"],
    ["queue", "worker", "Events", "event"],
    ["api", "postgres", "PostgreSQL / TLS", "data_flow"],
    ["worker", "redis", "Cache", "data_flow"],
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