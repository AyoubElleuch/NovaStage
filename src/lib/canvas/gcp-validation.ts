import { z } from "zod";
import { getGCPService } from "./cloud-services";

const metadata = z
  .object({
    serviceId: z.string().min(1).max(100),
    category: z.string(),
    region: z.string().max(100).optional(),
    config: z
      .record(z.string().min(1).max(100), z.string().max(4000))
      .refine((value) => Object.keys(value).length <= 100)
      .optional(),
  })
  .strict();

/** Validate provider boundaries before accepting resource metadata from an API. */
export function validGCPNode(node: {
  node_type?: string;
  gcp_metadata?: unknown;
  aws_metadata?: unknown;
}) {
  if (node.node_type !== "gcp_service") return node.gcp_metadata == null;
  if (node.aws_metadata != null) return false;
  const parsed = metadata.safeParse(node.gcp_metadata);
  if (!parsed.success) return false;
  const service = getGCPService(parsed.data.serviceId);
  return Boolean(
    service && service.id === parsed.data.serviceId && service.category === parsed.data.category,
  );
}
