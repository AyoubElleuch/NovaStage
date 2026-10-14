import { getAWSServiceDefinition, normalizeAWSServiceId } from "./aws-catalog-lookup";
import type { AWSServiceMetadata } from "./types";

/** Current palette card defaults. Saved legacy nodes retain their own dimensions. */
export const AWS_SERVICE_NODE_SIZE = { width: 200, height: 220 };

export function createAWSServiceNodeData(
  serviceId: string,
  region?: string,
  config?: Record<string, string>
) {
  const canonicalId = normalizeAWSServiceId(serviceId);
  const service = getAWSServiceDefinition(canonicalId);
  if (!service) throw new Error(`Unknown AWS catalog service: ${serviceId}`);

  const aws_metadata: AWSServiceMetadata = {
    serviceId: canonicalId,
    category: service.category as AWSServiceMetadata["category"],
    region: region || "us-east-1",
    config: { ...(service.defaultConfig as Record<string, string>), ...config },
  };
  return { title: service.name, ...AWS_SERVICE_NODE_SIZE, aws_metadata };
}
