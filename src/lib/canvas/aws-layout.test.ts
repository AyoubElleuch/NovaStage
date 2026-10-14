import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { AWS_ARCHITECTURE_FIXTURES } from "./__fixtures__/aws-architectures";
import { layoutAWSArchitecture } from "./aws-layout";
import { normalizeArchitectureResult, hasUsableArchitecture } from "../ai/architecture-quality";
import { validateAndRepairWorkflow } from "../ai/phases/validate";
import { architectureHandles, routeArchitectureEdge } from "./architecture-routing";
import type { CanvasNode } from "./types";

const previews: string[] = [];
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

describe("AWS topology → validation → layout → rendered routes", () => {
  it.each(AWS_ARCHITECTURE_FIXTURES)("$name", ({ name, result }) => {
    const before = structuredClone(result);
    const normalized = normalizeArchitectureResult(result)!;
    expect(hasUsableArchitecture(normalized)).toBe(true);
    const { workflow } = validateAndRepairWorkflow(normalized);
    const placed = layoutAWSArchitecture(workflow, []);
    const byId = new Map(placed.map(node => [node.id, node]));
    const ancestor = (parent: string, child: string): boolean => {
      let current = byId.get(child)?.parent_group_id;
      while (current) { if (current === parent) return true; current = byId.get(current)?.parent_group_id; }
      return false;
    };
    for (const node of placed) {
      expect([node.position_x, node.position_y, node.width, node.height].every(Number.isFinite)).toBe(true);
      if (node.parent_group_id) {
        const parent = byId.get(node.parent_group_id)!;
        expect(node.position_x).toBeGreaterThanOrEqual(parent.position_x + 72);
        expect(node.position_y).toBeGreaterThanOrEqual(parent.position_y + 104);
        expect(node.position_x + node.width).toBeLessThanOrEqual(parent.position_x + parent.width - 72);
        expect(node.position_y + node.height).toBeLessThanOrEqual(parent.position_y + parent.height - 80);
      }
      for (const other of placed) {
        if (node.id === other.id || ancestor(node.id, other.id) || ancestor(other.id, node.id)) continue;
        expect(node.position_x + node.width <= other.position_x || other.position_x + other.width <= node.position_x ||
          node.position_y + node.height <= other.position_y || other.position_y + other.height <= node.position_y,
        `${node.id} overlaps ${other.id}`).toBe(true);
      }
    }
    const canvasNodes: CanvasNode[] = placed.map(node => ({
      ...node, project_id: "fixture", title: node.id, description: "", status: "draft", color: "default", sort_order: 0,
      claimed_by: null, version: 1, checkpoints: [],
      aws_metadata: node.node_type === "aws_service" ? { serviceId: node.aws_metadata.serviceId, category: "compute", config: {} } : null,
    }));
    const paths: string[] = [];
    for (const edge of workflow.dataFlowEdges || []) {
      const source = canvasNodes.find(node => node.id === edge.fromId)!, target = canvasNodes.find(node => node.id === edge.toId)!;
      const handles = architectureHandles(source, target);
      const route = routeArchitectureEdge(source, target, handles.source, handles.target, canvasNodes);
      expect(route, `No route for ${edge.fromId} → ${edge.toId}`).not.toBeNull();
      for (let i = 1; i < route!.points.length; i++) {
        const a = route!.points[i - 1], b = route!.points[i];
        expect(a.x === b.x || a.y === b.y).toBe(true);
        for (const obstacle of canvasNodes.filter(node => node.node_type !== "group" && node.id !== source.id && node.id !== target.id)) {
          const crosses = a.x === b.x ? a.x > obstacle.position_x && a.x < obstacle.position_x + obstacle.width &&
            Math.max(a.y, b.y) > obstacle.position_y && Math.min(a.y, b.y) < obstacle.position_y + obstacle.height :
            a.y > obstacle.position_y && a.y < obstacle.position_y + obstacle.height && Math.max(a.x, b.x) > obstacle.position_x && Math.min(a.x, b.x) < obstacle.position_x + obstacle.width;
          expect(crosses, `${edge.fromId} → ${edge.toId} crosses ${obstacle.id}`).toBe(false);
        }
      }
      paths.push(`<path d="${route!.path}" fill="none" stroke="${edge.edgeType === "security_iam" ? "#a78bfa" : "#60a5fa"}" stroke-width="2" marker-end="url(#arrow)"/>`);
    }
    const sorted = (nodes: typeof placed) => [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    expect(sorted(layoutAWSArchitecture({ ...workflow, serviceNodes: [...workflow.serviceNodes!].reverse(), groups: [...workflow.groups!].reverse(), dataFlowEdges: [...workflow.dataFlowEdges!].reverse() }, []))).toEqual(sorted(placed));
    expect(result).toEqual(before);
    expect(placed.filter(node => node.node_type === "aws_service")).toHaveLength(result.serviceNodes!.length);
    const width = Math.max(...placed.map(node => node.position_x + node.width)) + 80, height = Math.max(...placed.map(node => node.position_y + node.height)) + 80;
    const groups = [...placed.filter(node => node.node_type === "group")].sort((a, b) => b.width * b.height - a.width * a.height);
    const boxes = [...groups, ...placed.filter(node => node.node_type !== "group")].map(node => `<rect x="${node.position_x}" y="${node.position_y}" width="${node.width}" height="${node.height}" rx="8" fill="${node.node_type === "group" ? "#142235" : "#243247"}" stroke="${node.node_type === "group" ? "#34d399" : "#94a3b8"}"/><text x="${node.position_x + 12}" y="${node.position_y + 28}" fill="#e2e8f0" font-size="16">${escape(node.node_type === "group" ? node.group_metadata!.label : workflow.serviceNodes!.find(service => service.tempId === node.id)!.serviceId)}</text>`);
    previews.push(`<h2>${escape(name)}</h2><svg viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="#60a5fa"/></marker></defs>${boxes.join("")}${paths.join("")}</svg>`);
    if (process.env.AWS_LAYOUT_PREVIEW) {
      mkdirSync(dirname(process.env.AWS_LAYOUT_PREVIEW), { recursive: true });
      writeFileSync(process.env.AWS_LAYOUT_PREVIEW, `<!doctype html><html><title>AWS layout fixtures</title><style>body{background:#0d1420;color:#e2e8f0;font-family:system-ui;margin:32px}svg{background:#101a28;width:100%;max-height:900px;border:1px solid #334155;margin-bottom:48px}</style><h1>AWS layout regression fixtures</h1><p>Generated by the production layout and routing algorithms. Cards show service identifiers; boundaries show their semantic groups.</p>${previews.join("")}</html>`);
    }
  });

  it("removes empty nested boundaries and keeps support cards below the request flow", () => {
    const result = structuredClone(AWS_ARCHITECTURE_FIXTURES[2].result);
    result.groups!.push({ tempId: "empty", label: "Unused subnet", style: "subnet", parentGroupTempId: "vpc_1", childTempIds: [] });
    const placed = layoutAWSArchitecture(result, []);
    expect(placed.some(node => node.id === "empty")).toBe(false);
    const vpc = placed.find(node => node.id === "vpc_1")!, kms = placed.find(node => node.id === "kms")!;
    expect(kms.position_y).toBeGreaterThan(vpc.position_y + vpc.height);
    const cdn = placed.find(node => node.id === "cloudfront")!, alb = placed.find(node => node.id === "alb_1")!;
    expect(cdn.position_y + cdn.height / 2).toBe(alb.position_y + alb.height / 2);
  });
});
