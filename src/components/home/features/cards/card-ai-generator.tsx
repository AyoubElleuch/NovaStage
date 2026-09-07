"use client";

import { useState } from "react";
import dagre from "@dagrejs/dagre";
import { Box, Check, CloudCog, Layers3, Sparkles } from "lucide-react";
import { AwsIcon } from "@/components/canvas/aws-icons";
import HomeDropdown, { type HomeDropdownOption } from "../home-dropdown";

type PreviewNode = { label: string; kind: "milestone" | "service"; serviceId?: string; phase?: string };
type PreviewEdge = { source: number; target: number; type: "dependency" | "data_flow" | "network" | "event" };

const edgeStyles = {
  dependency: { color: "#94a3b8", dash: "6 4" },
  data_flow: { color: "#60a5fa", dash: "8 6" },
  network: { color: "#34d399", dash: "4 4" },
  event: { color: "#fbbf24", dash: "8 4 2 4" },
};

const presets = [
  {
    name: "Workflow", detail: "Milestones, branches, and checkpoints", icon: <Layers3 size={15} />,
    nodes: [
      { label: "Scope", kind: "milestone", phase: "Planning" },
      { label: "Design", kind: "milestone", phase: "Architecture" },
      { label: "Build", kind: "milestone", phase: "Implementation" },
      { label: "Release", kind: "milestone", phase: "Deployment" },
    ] satisfies PreviewNode[],
    edges: [{ source: 0, target: 1, type: "dependency" }, { source: 1, target: 2, type: "dependency" }, { source: 2, target: 3, type: "dependency" }] satisfies PreviewEdge[],
  },
  {
    name: "AWS architecture", detail: "Services, groups, and typed connections", icon: <CloudCog size={15} />,
    nodes: [
      { label: "CloudFront", kind: "service", serviceId: "cloudfront" },
      { label: "Load balancer", kind: "service", serviceId: "elb" },
      { label: "ECS service", kind: "service", serviceId: "ecs" },
      { label: "RDS", kind: "service", serviceId: "rds" },
      { label: "Telemetry", kind: "service", serviceId: "cloudwatch" },
    ] satisfies PreviewNode[],
    edges: [{ source: 0, target: 1, type: "data_flow" }, { source: 1, target: 2, type: "data_flow" }, { source: 2, target: 3, type: "network" }, { source: 2, target: 4, type: "event" }] satisfies PreviewEdge[],
  },
  {
    name: "Full-stack system", detail: "Execution milestones interlocked with services", icon: <Box size={15} />,
    nodes: [
      { label: "Build API", kind: "milestone", phase: "Implementation" },
      { label: "API Gateway", kind: "service", serviceId: "apigateway" },
      { label: "Lambda", kind: "service", serviceId: "lambda" },
      { label: "DynamoDB", kind: "service", serviceId: "dynamodb" },
    ] satisfies PreviewNode[],
    edges: [{ source: 0, target: 1, type: "dependency" }, { source: 1, target: 2, type: "data_flow" }, { source: 2, target: 3, type: "network" }] satisfies PreviewEdge[],
  },
];

const presetOptions: HomeDropdownOption<number>[] = presets.map((preset, index) => ({ value: index, label: preset.name, detail: preset.detail, icon: preset.icon }));

export default function CardAiGenerator() {
  const [selected, setSelected] = useState(0);
  const preset = presets[selected];
  const graph = new dagre.graphlib.Graph().setGraph({ rankdir: "LR", nodesep: 40, ranksep: 28, marginx: 15, marginy: 10 }).setDefaultEdgeLabel(() => ({}));
  preset.nodes.forEach((_, index) => graph.setNode(String(index), { width: 78, height: 70 }));
  preset.edges.forEach(({ source, target }) => graph.setEdge(String(source), String(target)));
  dagre.layout(graph);
  const positions = preset.nodes.map((_, index) => graph.node(String(index)));
  return <article className="home-feature home-reveal">
    <div className="home-feature-title"><Sparkles size={19} /><h3>Generate a buildable first draft.</h3></div>
    <p className="home-feature-subtitle">One prompt becomes a workflow, AWS architecture, or full-stack system.</p>
    <span className="home-preset-label">Generation mode</span>
    <HomeDropdown value={selected} options={presetOptions} onChange={setSelected} label="Choose a generation mode" />
    <svg className="home-preset-graph" viewBox={`0 0 ${graph.graph().width} ${Math.max(210, graph.graph().height || 0)}`} role="img" aria-label={`${preset.name} architecture`}>
      {preset.edges.map(({ source, target, type }) => {
        const from = positions[source]; const to = positions[target];
        return <path key={`${source}-${target}`} d={`M${from.x + 36} ${from.y} C${(from.x + to.x) / 2} ${from.y} ${(from.x + to.x) / 2} ${to.y} ${to.x - 36} ${to.y}`} fill="none" stroke={edgeStyles[type].color} strokeDasharray={edgeStyles[type].dash} strokeWidth="1.5" />;
      })}
      {preset.nodes.map((node, index) => <g key={`${preset.name}-${node.label}`} className="home-preset-node" style={{ transform: `translate(${positions[index].x}px, ${positions[index].y}px)` }}>
        <rect x="-36" y="-31" width="72" height="62" rx="6" fill="var(--home-surface)" stroke={node.kind === "milestone" ? "var(--home-accent)" : "var(--home-border)"} />
        {node.kind === "service" && node.serviceId
          ? <foreignObject x="-15" y="-23" width="30" height="30"><AwsIcon serviceId={node.serviceId} size={30} /></foreignObject>
          : <><circle cx="0" cy="-10" r="11" fill="rgb(52 211 153 / 14%)" stroke="var(--home-accent)" /><text y="-6" textAnchor="middle" fill="var(--home-accent)" fontSize="9" fontWeight="700">{index + 1}</text></>}
        <text y="22" textAnchor="middle" fill="var(--home-text)" fontSize="8.5">{node.label}</text>
      </g>)}
    </svg>
    <div className="home-generation-status" role="status"><span><Check size={14} />Preview graph ready</span><span><Box size={13} />{preset.nodes.length} nodes</span></div>
    <p className="home-feature-footnote">Milestones and AWS services keep their real node types; every connection keeps its production edge semantic.</p>
  </article>;
}