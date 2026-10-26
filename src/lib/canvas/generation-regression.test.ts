import { describe, expect, it } from "vitest";
import { buildMcpGraph } from "../mcp/graph";
import { prepareWorkflow } from "../mcp/workflow";
import { sampleArchitecture, sampleWorkflow } from "../mcp/test-fixtures";
import { autoLayoutNodes } from "./auto-layout";
import { getNodeDimensions } from "./coordinate-math";
import { buildGeneratedGraph } from "./generated-graph";
import { WORKFLOW_FIXTURES } from "./__fixtures__/workflows";
import { AWS_ARCHITECTURE_FIXTURES } from "./__fixtures__/aws-architectures";
import { assertCanvasGeometry } from "./geometry-validation";

describe("generation contract regressions", () => {
  it.each([...WORKFLOW_FIXTURES, ...AWS_ARCHITECTURE_FIXTURES])("$name has stable geometry, dependency order and safe append", ({ result }) => {
    const before = structuredClone(result);
    const graph = buildGeneratedGraph(result, []);
    assertCanvasGeometry(graph.nodes, graph.edges);
    for (const edge of graph.edges.filter(edge => edge.edge_type === "dependency")) {
      const source = graph.nodes.find(node => node.id === edge.source_node_id)!;
      const target = graph.nodes.find(node => node.id === edge.target_node_id)!;
      expect(source.position_x + source.width).toBeLessThan(target.position_x);
      expect(source.sort_order).toBeLessThan(target.sort_order);
    }
    const shuffled = { ...result, milestones: [...result.milestones].reverse(), edges: [...result.edges].reverse(), serviceNodes: [...(result.serviceNodes || [])].reverse(), groups: [...(result.groups || [])].reverse(), dataFlowEdges: [...(result.dataFlowEdges || [])].reverse() };
    const rectangles = (input: typeof graph) => input.nodes.map(({ id, position_x, position_y, width, height }) => ({ id, position_x, position_y, width, height })).sort((a, b) => a.id.localeCompare(b.id));
    expect(rectangles(buildGeneratedGraph(shuffled, []))).toEqual(rectangles(graph));
    const addition = buildGeneratedGraph(result, graph.nodes);
    expect(Math.min(...addition.nodes.map(node => node.position_x))).toBeGreaterThan(Math.max(...graph.nodes.map(node => node.position_x + node.width)));
    expect(result).toEqual(before);
  });
  it("lays out 100 AWS resources without changing their connectivity", () => {
    const base = sampleArchitecture(); base.groups = [];
    base.serviceNodes = Array.from({ length: 100 }, (_, i) => ({ tempId: `service_${i}`, serviceId: "lambda", name: `Handler ${i}` }));
    base.dataFlowEdges = base.serviceNodes.slice(1).map((node, i) => ({ fromId: base.serviceNodes[i].tempId, toId: node.tempId, edgeType: "event" }));
    const graph = buildGeneratedGraph({ ...base, intent: "create_pipeline" }, []);
    expect(graph.nodes).toHaveLength(100); expect(graph.edges).toHaveLength(99);
  });
  it("rejects nonfinite rectangles, clipped content, overlap and dangling endpoints", () => {
    const graph = buildGeneratedGraph(WORKFLOW_FIXTURES[0].result, []);
    const bad = structuredClone(graph.nodes); bad[0].position_x = NaN;
    expect(() => assertCanvasGeometry(bad, graph.edges)).toThrow("rectangle");
    bad[0] = { ...graph.nodes[0], height: 1 };
    expect(() => assertCanvasGeometry(bad, graph.edges)).toThrow("Clipped");
    bad[0] = { ...graph.nodes[0], position_x: graph.nodes[1].position_x, position_y: graph.nodes[1].position_y };
    expect(() => assertCanvasGeometry(bad, graph.edges)).toThrow("separation");
    expect(() => assertCanvasGeometry(graph.nodes, [{ ...graph.edges[0], target_node_id: "missing" }])).toThrow("Dangling");
  });
  it("does not invent dependencies for disconnected milestones", () => {
    const input = sampleWorkflow(); input.edges = [];
    expect(prepareWorkflow(input).workflow.edges).toEqual([]);
  });
  it("rejects workflow cycles instead of deleting meaningful edges", () => {
    const input = sampleWorkflow(); input.edges.push({ fromId: "ship", toId: "plan" });
    expect(() => prepareWorkflow(input)).toThrow(/cycl/i);
  });
  it("rejects regional managed services placed inside a subnet without relocating them", () => {
    const input = sampleArchitecture();
    input.serviceNodes.push({ tempId: "storage", serviceId: "s3", name: "Documents", parentGroupTempId: "private" });
    expect(() => prepareWorkflow(input)).toThrow("cannot be hosted");
    expect(input.serviceNodes.at(-1)!.parentGroupTempId).toBe("private");
  });
  it.each(["cycle", "conflict"])("rejects %s in containment before repair", kind => {
    const input = sampleArchitecture();
    if (kind === "cycle") input.groups[0].parentGroupTempId = "private";
    else input.groups[0].childTempIds.push("handler");
    expect(() => prepareWorkflow(input)).toThrow(/parent|containment/i);
  });
  it("lays out equivalent MCP graphs before random persistence IDs affect ties", () => {
    const input = sampleWorkflow(); input.edges = [];
    const positions = (value: typeof input) => buildMcpGraph(prepareWorkflow(value).workflow, []).nodes
      .map(node => [node.title, node.position_x, node.position_y, node.width, node.height]).sort();
    const first = positions(input);
    input.milestones.reverse();
    for (let i = 0; i < 8; i++) expect(positions(input)).toEqual(first);
  });
  it("reserves the rendered height of cards rather than a fixed minimum", () => {
    const nodes = buildMcpGraph(prepareWorkflow(sampleWorkflow()).workflow, []).nodes;
    nodes[0].height = 180;
    const expected = getNodeDimensions(nodes[0]);
    const placed = autoLayoutNodes(nodes, []);
    expect(placed[0].height).toBe(expected.height);
  });
});
