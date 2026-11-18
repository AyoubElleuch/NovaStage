import catalog from "./gcp-catalog.json";
import { createAWSServiceNodeData, AWS_SERVICE_NODE_SIZE } from "./aws-service-node";
import type { CanvasNode, CanvasNodeType, CloudProvider, GCPServiceMetadata } from "./types";

export const CLOUD_PROVIDER_LABELS = { aws: "AWS", gcp: "Google Cloud" } as const;
export const SERVICE_NODE_SIZE = AWS_SERVICE_NODE_SIZE;
export const isServiceNode = (node: { node_type?: CanvasNodeType }) =>
  node.node_type === "aws_service" || node.node_type === "gcp_service";
export const getCloudProvider = (node: { node_type?: CanvasNodeType }): CloudProvider =>
  node.node_type === "gcp_service" ? "gcp" : "aws";
export const getServiceMetadata = (
  node: Pick<CanvasNode, "node_type" | "aws_metadata" | "gcp_metadata">,
) => (node.node_type === "gcp_service" ? node.gcp_metadata : node.aws_metadata);

const gcpServices = new Map(catalog.services.map((service) => [service.id, service]));
export const getGCPService = (id: string) => gcpServices.get(id.trim().toLowerCase());

export function createCloudServiceNodeData(provider: CloudProvider, serviceId: string) {
  if (provider === "aws")
    return {
      ...createAWSServiceNodeData(serviceId),
      node_type: "aws_service" as const,
      gcp_metadata: null,
    };
  const service = getGCPService(serviceId);
  if (!service) throw new Error(`Unknown Google Cloud service: ${serviceId}`);
  const gcp_metadata: GCPServiceMetadata = {
    serviceId: service.id,
    category: service.category as GCPServiceMetadata["category"],
    region: "us-central1",
    config: { ...service.defaultConfig } as Record<string, string>,
  };
  return {
    title: service.name,
    ...SERVICE_NODE_SIZE,
    node_type: "gcp_service" as const,
    gcp_metadata,
    aws_metadata: null,
  };
}
