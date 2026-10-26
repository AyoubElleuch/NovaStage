import { describe, expect, it } from "vitest";
import { prepareWorkflow } from "./workflow";
import { buildMcpGraph } from "./graph";
import { sampleWorkflow } from "./test-fixtures";
import { mcpSetup } from "./setup";

describe("external assistant generation", () => {
  it("normalizes AWS aliases and builds a complete nested graph without changing existing content", () => {
    const { workflow } = prepareWorkflow(sampleWorkflow());
    expect(workflow.serviceNodes![0].serviceId).toBe("apigateway");
    const { nodes, edges } = buildMcpGraph(workflow, []);
    expect(nodes).toHaveLength(7);
    expect(edges).toHaveLength(4);
    expect(nodes.flatMap(node => node.checkpoints)).toHaveLength(8);
    const handler = nodes.find(node => node.title === "Request handler")!;
    const subnet = nodes.find(node => node.title === "Private subnet")!;
    expect(handler.parent_group_id).toBe(subnet.id);
    expect(subnet.group_metadata!.childNodeIds).toContain(handler.id);
    expect(handler.position_x).toBeGreaterThan(subnet.position_x);
    expect(handler.position_x + handler.width).toBeLessThan(subnet.position_x + subnet.width);
    const originals = structuredClone(nodes);
    const addition = buildMcpGraph(workflow, nodes);
    expect(nodes).toEqual(originals);
    expect(Math.min(...addition.nodes.map(node => node.position_x))).toBeGreaterThan(Math.max(...nodes.map(node => node.position_x + node.width)));
    const ids = new Set(nodes.map(node => node.id));
    expect(addition.nodes.every(node => !ids.has(node.id))).toBe(true);
    expect(edges.every(edge => ids.has(edge.source_node_id) && ids.has(edge.target_node_id))).toBe(true);
  });

  it.each(["id", "deletedMilestoneIds", "intent"])("rejects overwrite or deletion field %s", field => {
    const input = { ...sampleWorkflow(), [field]: field === "intent" ? "update_pipeline" : ["existing-node"] };
    expect(() => prepareWorkflow(input)).toThrow();
  });
  it("rejects existing node/checkpoint IDs, unknown services, foreign edges, and duplicate tempIds", () => {
    const input = sampleWorkflow();
    expect(() => prepareWorkflow({ ...input, milestones: [{ ...input.milestones[0], id: "existing" }] })).toThrow();
    input.milestones[0].checkpoints[0] = { title: "Task", id: "existing" } as never;
    expect(() => prepareWorkflow(input)).toThrow();
    const service = sampleWorkflow(); service.serviceNodes[0].serviceId = "made-up-service";
    expect(() => prepareWorkflow(service)).toThrow("Unknown AWS service");
    const edge = sampleWorkflow(); edge.dataFlowEdges[0].toId = "other_project_node";
    expect(() => prepareWorkflow(edge)).toThrow("generated nodes");
    const duplicate = sampleWorkflow(); duplicate.serviceNodes[0].tempId = "plan";
    expect(() => prepareWorkflow(duplicate)).toThrow("unique tempIds");
  });
  it("keeps orphan repair acyclic when an existing dependency points backwards", () => {
    const input = sampleWorkflow();
    input.milestones.push({ ...structuredClone(input.milestones[1]), tempId: "verify", title: "Verify release" });
    input.edges = [{ fromId: "verify", toId: "plan" }];
    const { workflow, report } = prepareWorkflow(input);
    const adjacency = new Map(workflow.milestones.map(node => [node.tempId!, workflow.edges.filter(edge => edge.fromId === node.tempId).map(edge => edge.toId)]));
    const cycle = (id: string, path = new Set<string>()): boolean => path.has(id) || (adjacency.get(id) || []).some(next => cycle(next, new Set([...path, id])));
    expect([...adjacency.keys()].some(id => cycle(id))).toBe(false);
    expect(report.cyclesRemoved).toBeGreaterThan(0);
  });
  it("supports workflow-only and AWS-only diagrams and enforces mode contents and size limits", () => {
    const base = sampleWorkflow();
    expect(prepareWorkflow({ ...base, mode: "workflow", serviceNodes: [], groups: [], dataFlowEdges: [] }).workflow.milestones).toHaveLength(2);
    expect(prepareWorkflow({ ...base, mode: "aws_architecture", milestones: [], edges: [], dataFlowEdges: base.dataFlowEdges.slice(0, 2) }).workflow.serviceNodes).toHaveLength(3);
    expect(() => prepareWorkflow({ ...base, serviceNodes: [] })).toThrow("requires AWS");
    expect(() => prepareWorkflow({ ...base, milestones: [] })).toThrow("requires delivery");
    expect(() => prepareWorkflow({ ...base, summary: "x".repeat(2001) })).toThrow();
  });
  it("generates per-canvas setup commands for PowerShell and Bash without credentials in URLs", () => {
    const ps = mcpSetup("aaaa-bbbb", "https://novastage.dev", "ns_mcp_test", "powershell");
    expect(ps.codex).toContain("$env:NOVASTAGE_AAAABBBB_TOKEN");
    expect(ps.codex).toContain("--bearer-token-env-var NOVASTAGE_AAAABBBB_TOKEN");
    expect(ps.claude).toContain("--transport http --scope user");
    expect(ps.claude).toContain("--header 'Authorization: Bearer ns_mcp_test'");
    expect(ps.codex).toContain("--url 'https://novastage.dev/api/mcp'");
    expect(mcpSetup("cccc-dddd", "https://novastage.dev", "secret", "bash").codex).toContain("export NOVASTAGE_CCCCDDDD_TOKEN='secret'");
  });
});
