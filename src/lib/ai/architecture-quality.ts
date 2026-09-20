import type { AIWorkflowResult, PromptDecomposition } from "./types";
import { getAWSServiceDefinition, normalizeAWSServiceId } from "@/lib/canvas/aws-catalog-lookup";

export interface ArchitectureQualityResult {
  ok: boolean;
  issues: string[];
}

export function normalizeArchitectureResult(
  result: AIWorkflowResult | null
): AIWorkflowResult | null {
  if (!result) return null;
  return {
    ...result,
    serviceNodes: (result.serviceNodes || []).map((service) => {
      const entries = Array.isArray(service.configEntries)
        ? service.configEntries.filter((entry) => entry?.key?.trim())
        : [];
      const entryConfig = Object.fromEntries(
        entries.map((entry) => [entry.key.trim(), String(entry.value ?? "")])
      );
      const existingConfig = service.config && !Array.isArray(service.config)
        ? service.config
        : {};
      return {
        ...service,
        serviceId: normalizeAWSServiceId(service.serviceId),
        config: { ...entryConfig, ...existingConfig },
        configEntries: undefined,
      };
    }),
  };
}

/** Rejects shallow/generic topology drafts before they can mutate the canvas. */
export function evaluateArchitectureQuality(
  result: AIWorkflowResult | null,
  prompt: string,
  decomposition?: PromptDecomposition
): ArchitectureQualityResult {
  if (!result) return { ok: false, issues: ["No structured topology was returned"] };

  const services = result.serviceNodes || [];
  const groups = result.groups || [];
  const edges = result.dataFlowEdges || [];
  const explicitlySmall = /\b(minimal|tiny|simple demo|proof of concept|poc|prototype)\b/i.test(prompt);
  const minimumServices = explicitlySmall
    ? 3
    : decomposition?.complexityTier === "enterprise"
      ? 9
      : decomposition?.complexityTier === "advanced"
        ? 7
        : 6;
  const issues: string[] = [];

  if (services.length < minimumServices) {
    issues.push(`Only ${services.length} services were provided; at least ${minimumServices} purposeful services are required`);
  }
  const unknownServices = services.filter((service) => !getAWSServiceDefinition(normalizeAWSServiceId(service.serviceId)));
  if (unknownServices.length > 0) {
    issues.push(`Unknown AWS service IDs: ${unknownServices.map((service) => service.serviceId).join(", ")}`);
  }
  const minimumEdges = Math.max(services.length > 1 ? services.length - 1 : 0, 1);
  if (edges.length < minimumEdges) {
    issues.push(`Only ${edges.length} connections were provided; the service data paths are incomplete`);
  }
  const configured = services.filter((service) => service.config && Object.keys(service.config).length >= 2).length;
  if (services.length > 0 && configured / services.length < 0.5) {
    issues.push("Fewer than half of the services include concrete operational configuration");
  }
  const vpcHosted = services.some((service) =>
    ["ec2", "ecs", "eks", "fargate", "rds", "aurora", "elasticache", "elb"].includes(normalizeAWSServiceId(service.serviceId))
  );
  if (vpcHosted && !groups.some((group) => group.style === "vpc")) {
    issues.push("VPC-hosted services were returned without a VPC boundary");
  }

  return { ok: issues.length === 0, issues };
}

/** Minimum safety bar after the quality-improvement retry. */
export function hasUsableArchitecture(result: AIWorkflowResult | null): result is AIWorkflowResult {
  if (!result || !Array.isArray(result.serviceNodes) || !Array.isArray(result.groups) || !Array.isArray(result.dataFlowEdges)) {
    return false;
  }
  const serviceIds = new Set(result.serviceNodes.map((service) => service.tempId).filter(Boolean));
  const groupIds = new Set(result.groups.map((group) => group.tempId).filter(Boolean));
  const resourceIds = new Set([...serviceIds, ...groupIds]);
  const validEdges = result.dataFlowEdges.filter((edge) =>
    edge.fromId && edge.toId && edge.fromId !== edge.toId &&
    resourceIds.has(edge.fromId) && resourceIds.has(edge.toId)
  );

  return serviceIds.size >= 3 && validEdges.length >= Math.min(2, serviceIds.size - 1);
}
