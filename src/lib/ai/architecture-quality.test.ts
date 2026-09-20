import { describe, expect, it } from "vitest";
import { evaluateArchitectureQuality, hasUsableArchitecture, normalizeArchitectureResult } from "./architecture-quality";

describe("AWS architecture quality gate", () => {
  it("rejects vague three-box architectures", () => {
    const quality = evaluateArchitectureQuality({
      intent: "create_pipeline", summary: "Basic", milestones: [], edges: [],
      serviceNodes: ["cloudfront", "ecs", "rds"].map((serviceId, index) => ({
        tempId: `s${index}`, serviceId,
      })),
      groups: [], dataFlowEdges: [],
    }, "Build a production SaaS platform");
    expect(quality.ok).toBe(false);
    expect(quality.issues.length).toBeGreaterThan(1);
  });

  it("accepts a connected, configured production topology", () => {
    const serviceIds = ["cloudfront", "waf", "elb", "ecs", "rds", "cloudwatch"];
    const quality = evaluateArchitectureQuality({
      intent: "create_pipeline", summary: "Production", milestones: [], edges: [],
      groups: [{ tempId: "vpc", label: "VPC", style: "vpc", childTempIds: [] }],
      serviceNodes: serviceIds.map((serviceId, index) => ({
        tempId: `s${index}`, serviceId, config: { tier: "production", multiAz: "true" },
      })),
      dataFlowEdges: serviceIds.slice(1).map((_, index) => ({
        fromId: `s${index}`, toId: `s${index + 1}`, edgeType: "data_flow" as const,
      })),
    }, "Build a production SaaS platform");
    expect(quality).toEqual({ ok: true, issues: [] });
  });

  it("recognizes common AWS aliases and permits a structurally usable retry result", () => {
    const result = {
      intent: "create_pipeline" as const, summary: "Retry", milestones: [], edges: [],
      groups: [{ tempId: "vpc", label: "VPC", style: "vpc" as const, childTempIds: ["alb", "ecs", "rds"] }],
      serviceNodes: ["alb", "ecs", "rds"].map((serviceId) => ({ tempId: serviceId, serviceId })),
      dataFlowEdges: [
        { fromId: "alb", toId: "ecs", edgeType: "data_flow" as const },
        { fromId: "ecs", toId: "rds", edgeType: "network" as const },
      ],
    };
    expect(evaluateArchitectureQuality(result, "Build a production SaaS platform").issues).not.toContainEqual(expect.stringContaining("Unknown AWS service IDs"));
    expect(hasUsableArchitecture(result)).toBe(true);
  });

  it("normalizes Gemini-compatible config entries into persisted service config", () => {
    const result = normalizeArchitectureResult({
      intent: "create_pipeline", summary: "Config", milestones: [], edges: [],
      serviceNodes: [{
        tempId: "api", serviceId: "alb",
        configEntries: [{ key: "Listener", value: "HTTPS/443" }, { key: "Health Check", value: "GET /health" }],
      }],
      groups: [], dataFlowEdges: [],
    });
    expect(result?.serviceNodes?.[0]).toMatchObject({
      serviceId: "elb",
      config: { Listener: "HTTPS/443", "Health Check": "GET /health" },
    });
    expect(result?.serviceNodes?.[0].configEntries).toBeUndefined();
  });
});
