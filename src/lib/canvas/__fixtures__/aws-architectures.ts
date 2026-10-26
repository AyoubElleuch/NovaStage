import type { AIWorkflowResult } from "../../ai/types";
import { AWS_WEB_APP_FEW_SHOT_EXAMPLE } from "../../ai/prompts/aws-few-shot-examples";

const base = (): AIWorkflowResult => ({ intent: "create_pipeline", mode: "aws_architecture", summary: "Fixture", milestones: [], edges: [], groups: [], serviceNodes: [], dataFlowEdges: [] });
const chain = (ids: string[]): AIWorkflowResult => ({ ...base(), serviceNodes: ids.map((serviceId, i) => ({ tempId: `s${i}`, serviceId })), dataFlowEdges: ids.slice(1).map((_, i) => ({ fromId: `s${i}`, toId: `s${i + 1}`, edgeType: "data_flow", label: "HTTPS/443" })) });

function distributed(regions: number, zones: number): AIWorkflowResult {
  const result = base();
  result.serviceNodes!.push({ tempId: "dns", serviceId: "route53" }, { tempId: "cdn", serviceId: "cloudfront" });
  result.dataFlowEdges!.push({ fromId: "dns", toId: "cdn", edgeType: "data_flow" });
  for (let r = 0; r < regions; r++) {
    const region = `region${r}`, vpc = `vpc${r}`;
    result.groups!.push({ tempId: region, label: `Region ${r}`, style: "region", childTempIds: [] }, { tempId: vpc, label: "VPC", style: "vpc", parentGroupTempId: region, childTempIds: [] });
    for (let z = 0; z < zones; z++) {
      const az = `az${r}${z}`;
      result.groups!.push({ tempId: az, label: `AZ ${z}`, style: "availability_zone", parentGroupTempId: vpc, childTempIds: [] });
      for (const [tier, serviceId] of [["public", "elb"], ["compute", "ecs"], ["data", "aurora"]]) {
        const subnet = `${az}-${tier}`;
        result.groups!.push({ tempId: subnet, label: `${tier} subnet`, style: "subnet", parentGroupTempId: az, childTempIds: [] });
        result.serviceNodes!.push({ tempId: `${subnet}-service`, serviceId, parentGroupTempId: subnet });
      }
      const publicId = `${az}-public-service`, compute = `${az}-compute-service`, data = `${az}-data-service`;
      result.dataFlowEdges!.push({ fromId: "cdn", toId: publicId, edgeType: "data_flow" }, { fromId: publicId, toId: compute, edgeType: "sync_http" }, { fromId: compute, toId: data, edgeType: "data_flow" });
      const queue = `${az}-queue`, worker = `${az}-worker`;
      result.serviceNodes!.push({ tempId: queue, serviceId: "sqs", parentGroupTempId: region }, { tempId: worker, serviceId: "lambda", parentGroupTempId: region });
      result.dataFlowEdges!.push({ fromId: compute, toId: queue, edgeType: "async_queue" }, { fromId: queue, toId: worker, edgeType: "event" }, { fromId: worker, toId: data, edgeType: "data_flow" });
    }
  }
  for (const serviceId of ["kms", "cloudwatch", "secretsmanager", "cloudtrail"]) {
    result.serviceNodes!.push({ tempId: serviceId, serviceId });
    result.dataFlowEdges!.push({ fromId: "az00-compute-service", toId: serviceId, edgeType: serviceId === "cloudwatch" ? "event" : "security_iam" });
  }
  return result;
}

export const AWS_ARCHITECTURE_FIXTURES = [
  { name: "Simple: single S3 bucket", result: chain(["s3"]) },
  { name: "Simple: static CDN website", result: chain(["cloudfront", "s3"]) },
  { name: "Medium: three-tier VPC", result: structuredClone(AWS_WEB_APP_FEW_SHOT_EXAMPLE) },
  { name: "Medium: serverless events with feedback", result: (() => {
    const result = chain(["route53", "apigateway", "lambda", "sqs", "lambda", "dynamodb"]);
    result.dataFlowEdges!.push({ fromId: "s4", toId: "s3", edgeType: "async_queue", label: "Retry / DLQ redrive" });
    return result;
  })() },
  { name: "Complex: multi-AZ application", result: distributed(1, 3) },
  { name: "Complex: multi-region platform", result: distributed(2, 3) },
];
