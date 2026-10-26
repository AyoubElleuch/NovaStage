import { describe, expect, it, vi } from "vitest";
import { AWS_ARCHITECTURE_FIXTURES } from "../canvas/__fixtures__/aws-architectures";
import { executeAIPipeline } from "./pipeline";
import { callGemini } from "./gemini";
import { hasUsableArchitecture, normalizeArchitectureResult } from "./architecture-quality";
import { layoutAWSArchitecture } from "../canvas/aws-layout";

vi.mock("./gemini", () => ({ callGemini: vi.fn() }));
vi.mock("./phases/decompose", () => ({ decomposePrompt: async () => undefined }));

describe("AWS provider wire contract through orchestration", () => {
  it.each(["aws_architecture"] as const)("preserves empty-boundary removals on %s updates", async mode => {
    const result = structuredClone(AWS_ARCHITECTURE_FIXTURES[1].result);
    result.groups!.push({ id: "saved-empty", tempId: "saved-empty", label: "Unused VPC", style: "vpc", childTempIds: [] });
    result.serviceNodes = result.serviceNodes!.map(service => ({ ...service, config: { Environment: "fixture", Purpose: service.serviceId } }));
    vi.mocked(callGemini).mockReset().mockResolvedValue(result);
    const generated = await executeAIPipeline("simple website update", mode, {
      operation: "update", existingMilestones: [], existingEdges: [],
      existingGroups: [{ id: "saved-empty", label: "Unused VPC", style: "vpc", childNodeIds: [] }],
    });
    expect(generated.intent).toBe("update_pipeline");
    expect(generated.groups).toEqual([]);
    expect(generated.deletedGroupIds).toContain("saved-empty");
  });

  it.each(AWS_ARCHITECTURE_FIXTURES)("$name", async ({ name, result }) => {
    vi.mocked(callGemini).mockReset().mockResolvedValue({ ...result, serviceNodes: result.serviceNodes!.map(service => ({ ...service, configEntries: [{ key: "Environment", value: "fixture" }, { key: "Purpose", value: service.serviceId }] })) });
    const generated = await executeAIPipeline(name, "aws_architecture");
    expect(generated.serviceNodes).toHaveLength(result.serviceNodes!.length);
    expect(generated.serviceNodes!.every(service => !service.configEntries && service.config?.Environment === "fixture")).toBe(true);
    expect(generated.dataFlowEdges).toEqual(result.dataFlowEdges);
    expect(layoutAWSArchitecture(generated, [])).toHaveLength(generated.serviceNodes!.length + generated.groups!.length);
    expect(vi.mocked(callGemini).mock.calls[0][2]?.systemInstruction).toContain("application owns all layout");
  });

  it.each(["duplicate IDs", "unknown service", "dangling connection"])("rejects %s before any canvas mutation", async kind => {
    const result = structuredClone(AWS_ARCHITECTURE_FIXTURES[1].result);
    if (kind === "duplicate IDs") result.serviceNodes![1].tempId = result.serviceNodes![0].tempId;
    if (kind === "unknown service") result.serviceNodes![0].serviceId = "imaginary-service";
    if (kind === "dangling connection") result.dataFlowEdges![0].toId = "missing";
    expect(hasUsableArchitecture(normalizeArchitectureResult(result))).toBe(false);
    vi.mocked(callGemini).mockReset().mockResolvedValue(result);
    await expect(executeAIPipeline("simple architecture", "aws_architecture")).rejects.toThrow("No canvas changes were applied");
    expect(callGemini).toHaveBeenCalledTimes(2);
  });
});
