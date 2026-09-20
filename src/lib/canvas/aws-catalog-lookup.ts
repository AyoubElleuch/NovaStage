import catalog from "./aws-catalog.json";
import type { AWSServiceCategory } from "./types";

const aliases: Record<string, string> = {
  alb: "elb",
  api_gateway: "apigateway",
  certificate_manager: "certificatemanager",
  ecr: "elasticcontainerregistry",
  secrets_manager: "secretsmanager",
  step_functions: "stepfunctions",
};

const byId = new Map(catalog.services.map((service) => [service.id, service]));

export function normalizeAWSServiceId(serviceId: string): string {
  const normalized = serviceId.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return aliases[normalized] || normalized;
}

export function getAWSServiceDefinition(serviceId: string) {
  return byId.get(normalizeAWSServiceId(serviceId));
}

export function getAWSServiceCategory(serviceId: string): AWSServiceCategory {
  return (getAWSServiceDefinition(serviceId)?.category || "compute") as AWSServiceCategory;
}
