"use client";

import catalog from "@/lib/canvas/gcp-catalog.json";
import { getCloudProvider, getServiceMetadata } from "@/lib/canvas/cloud-services";
import type { CanvasNode, CloudProvider } from "@/lib/canvas/types";
import {
  AWS_CATEGORIES,
  AWS_SERVICE_REGISTRY,
  AWSLogoIcon,
  getAWSService,
  OfficialIcon,
} from "./aws-icons";
import type { AWSIconProps, AWSServiceDef } from "./aws-icons";
import GoogleCloudLogo from "@/components/google-cloud-logo";

export type CloudServiceDef = Omit<AWSServiceDef, "category"> & {
  category: string;
  aliases?: string[];
};
export type CloudCategory = { label: string; color: string; bgColor: string };
const GCP_SERVICES: Record<string, CloudServiceDef> = Object.fromEntries(
  catalog.services.map((service) => [
    service.id,
    {
      ...service,
      defaultConfig: service.defaultConfig as Record<string, string>,
      icon: (props: AWSIconProps) => (
        <OfficialIcon {...props} src={service.iconPath} name={service.name} />
      ),
    },
  ]),
);

export const CLOUD_CATALOGS = {
  aws: {
    services: AWS_SERVICE_REGISTRY as Record<string, CloudServiceDef>,
    categories: AWS_CATEGORIES as Record<string, CloudCategory>,
    popular: ["lambda", "apigateway", "s3", "ec2", "rds", "vpc"],
  },
  gcp: {
    services: GCP_SERVICES,
    categories: catalog.categories as Record<string, CloudCategory>,
    popular: ["cloud-run", "gke", "compute-engine", "cloud-storage", "cloud-sql", "pubsub"],
  },
};
export const getCloudService = (
  provider: CloudProvider,
  id: string,
): CloudServiceDef | undefined =>
  provider === "aws"
    ? getAWSService(id)
    : Object.hasOwn(GCP_SERVICES, id)
      ? GCP_SERVICES[id]
      : undefined;
export function CloudLogoIcon({
  provider,
  size = 32,
  className,
}: AWSIconProps & { provider: CloudProvider }) {
  return provider === "aws" ? (
    <AWSLogoIcon size={size} className={className} />
  ) : (
    <GoogleCloudLogo width={size} height={size} className={className || "text-[#4285F4]"} />
  );
}
export function CloudServiceIcon({ node, ...props }: AWSIconProps & { node: CanvasNode }) {
  const provider = getCloudProvider(node);
  const service = getCloudService(provider, getServiceMetadata(node)?.serviceId || "");
  return service ? <service.icon {...props} /> : <CloudLogoIcon provider={provider} {...props} />;
}
