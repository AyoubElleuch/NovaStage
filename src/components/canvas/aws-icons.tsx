"use client";

import React from "react";
import type { AWSServiceCategory } from "@/lib/canvas/types";
import catalog from "@/lib/canvas/aws-catalog.json";

export interface AWSIconProps { size?: number; className?: string }
export interface AWSServiceDef {
  id: string; name: string; shortName: string; category: AWSServiceCategory;
  icon: React.ComponentType<AWSIconProps>; description: string;
  defaultConfig: Record<string, string>;
}

function OfficialIcon({ src, name, size = 32, className = "" }: AWSIconProps & { src: string; name: string }) {
  // Local, unmodified SVGs from the official AWS architecture package.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} width={size} height={size} className={className} draggable={false} />;
}
export const AWSLogoIcon = (props: AWSIconProps) => <OfficialIcon {...props} src="/aws-icons/aws-cloud.svg" name="AWS Cloud" />;
export const AWS_CATEGORIES = catalog.categories;
export const AWS_SERVICE_REGISTRY: Record<string, AWSServiceDef> = Object.fromEntries(
  catalog.services.map((service) => [service.id, {
    ...service, category: service.category as AWSServiceCategory,
    defaultConfig: service.defaultConfig as Record<string, string>,
    icon: (props: AWSIconProps) => <OfficialIcon {...props} src={service.iconPath} name={service.name} />,
  }])
);
export function getServicesByCategory(category: AWSServiceCategory): AWSServiceDef[] {
  return Object.values(AWS_SERVICE_REGISTRY).filter((service) => service.category === category);
}
export interface AwsIconProps extends AWSIconProps { serviceId: string }
export function AwsIcon({ serviceId, ...props }: AwsIconProps) {
  const service = AWS_SERVICE_REGISTRY[serviceId?.toLowerCase()];
  if (service) { const Icon = service.icon; return <Icon {...props} />; }
  return <AWSLogoIcon {...props} />;
}
