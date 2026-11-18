import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import catalog from "./gcp-catalog.json";
import { createCloudServiceNodeData } from "./cloud-services";
import { validGCPNode } from "./gcp-validation";
import { applyOps, diffCanvas, invertOps, emptyHistory } from "./history";
import { publicCanvasData } from "./shared-data";
import { exportToMermaid, getNodeDimensions } from "./coordinate-math";
import { canRecoverDraft } from "./recovery";
import { buildAIGraph } from "./ai-graph";
import { sampleArchitecture } from "../mcp/test-fixtures";
import type { AIWorkflowResult } from "../ai/types";
import type { CanvasNode } from "./types";

it("ships unique, validated Google Cloud services with safe local SVGs and independent defaults", () => {
  expect(new Set(catalog.services.map((s) => s.id)).size).toBe(catalog.services.length);
  for (const service of catalog.services) {
    const node = createCloudServiceNodeData("gcp", service.id);
    expect(validGCPNode(node), service.id).toBe(true);
    const svg = readFileSync("public" + service.iconPath, "utf8");
    expect(svg).toMatch(/<svg[\s>]/);
    expect(svg).not.toMatch(
      /<script|<foreignObject|\bon\w+=|(?:href|src)=["'](?:https?:|data:|javascript:)/i,
    );
    node.gcp_metadata!.config!.custom = "local only";
    expect(
      createCloudServiceNodeData("gcp", service.id).gcp_metadata?.config?.custom,
    ).toBeUndefined();
  }
  expect(() => createCloudServiceNodeData("gcp", "made-up-service")).toThrow();
  const valid = createCloudServiceNodeData("gcp", "cloud-run");
  for (const gcp_metadata of [
    null,
    {},
    { ...valid.gcp_metadata, category: "storage" },
    { ...valid.gcp_metadata, config: { cpu: 4 } },
    { ...valid.gcp_metadata, serviceId: "__proto__" },
  ])
    expect(validGCPNode({ ...valid, gcp_metadata })).toBe(false);
  expect(validGCPNode({ ...valid, node_type: "milestone" })).toBe(false);
  expect(validGCPNode({ ...valid, aws_metadata: { serviceId: "lambda" } })).toBe(false);
});

it("preserves Google Cloud metadata through history, recovery, public sharing and export", () => {
  const node: CanvasNode = {
    id: "gcp",
    project_id: "p",
    description: "",
    status: "draft",
    color: "default",
    position_x: 0,
    position_y: 0,
    sort_order: 0,
    claimed_by: "private-owner",
    version: 1,
    checkpoints: [],
    ...createCloudServiceNodeData("gcp", "cloud-run"),
  };
  const before = { nodes: [node], edges: [] };
  const after = {
    nodes: [
      {
        ...node,
        gcp_metadata: { ...node.gcp_metadata!, region: "europe-west1", config: { cpu: "2" } },
      },
    ],
    edges: [],
  };
  const ops = diffCanvas(before, after);
  expect(ops).toHaveLength(1);
  expect(applyOps(before, ops)).toEqual(after);
  expect(applyOps(after, invertOps(ops))).toEqual(before);
  expect(
    canRecoverDraft(
      { base: before, canvas: after, history: emptyHistory(), savedAt: Date.now() },
      after,
    ),
  ).toBe(false);
  const shared = publicCanvasData(after.nodes, []);
  expect(shared.nodes[0].gcp_metadata).toEqual(after.nodes[0].gcp_metadata);
  expect(JSON.stringify(shared)).not.toContain("private-owner");
  expect(exportToMermaid(after.nodes, [])).toContain("Google Cloud: Cloud Run");
  expect(getNodeDimensions(node).height).toBeGreaterThanOrEqual(220);
  for (const operation of ["update", "delete"]) {
    const input: AIWorkflowResult = { ...sampleArchitecture(), intent: "update_pipeline" };
    if (operation === "delete") input.deletedServiceNodeIds = [node.id];
    else input.serviceNodes![0].id = node.id;
    expect(() => buildAIGraph(input, [node], "aws_architecture")).toThrow(/other-mode/);
  }
  expect(
    buildAIGraph(
      { ...sampleArchitecture(), intent: "create_pipeline" },
      [node],
      "aws_architecture",
    ).nodes.every((n) => n.id !== node.id),
  ).toBe(true);
});
