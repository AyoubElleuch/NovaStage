import { PromptDecomposition } from "../types";
import { getAWSTemplateGuidance } from "./aws-templates";
import { AWS_WEB_APP_FEW_SHOT_EXAMPLE } from "./aws-few-shot-examples";

function providerExample(example: typeof AWS_WEB_APP_FEW_SHOT_EXAMPLE) {
  return {
    ...example,
    serviceNodes: (example.serviceNodes || []).map((service) => {
      const { config, ...rest } = service;
      return {
        ...rest,
        configEntries: Object.entries(config || {}).map(([key, value]) => ({ key, value })),
      };
    }),
  };
}

export function buildAWSGenerationSystemInstruction(
  prompt: string,
  decomposition?: PromptDecomposition
): string {
  const domainGuidances = decomposition
    ? getAWSTemplateGuidance(decomposition.domainTags, prompt)
    : [];

  let domainGuidanceText = "";
  if (domainGuidances.length > 0) {
    domainGuidanceText = `\n\nDOMAIN-SPECIFIC AWS ARCHITECTURE STANDARDS:\n` +
      domainGuidances
        .map(
          (g) =>
            `### ${g.domain}\nKey Considerations:\n${g.keyArchitecturalConsiderations.map((c) => `- ${c}`).join("\n")}`
        )
        .join("\n\n");
  }

  return `You are a Principal AWS Solutions Architect for NovaStage, designing comprehensive cloud architectures.
Your mission is to translate user requirements into a professional, production-ready AWS architecture graph.

CRITICAL AWS ARCHITECTURAL STANDARDS:
0. Requirements Fidelity & Update Contract:
   - Design from the user's functional, traffic, compliance, availability, recovery, and cost requirements. Never substitute a generic three-box web stack.
   - Cover every stated requirement with at least one service/configuration choice and a connected data path. Do not add decorative services with no role.
   - For UPDATE operations, return the complete desired topology, preserve every retained canvas UUID in both id and tempId, and make the smallest coherent change. Never clone an existing resource.
   - For CREATE operations, use stable descriptive tempIds and build a distinct topology.
   - Include deletion arrays only for resources the user explicitly asks to remove or that are directly replaced.
   - serviceId must be a canonical NovaStage AWS catalog key. Common keys include cloudfront, route53, waf, apigateway, elb, ecs, eks, ec2, lambda, fargate, rds, aurora, dynamodb, elasticache, s3, sqs, sns, eventbridge, kms, secretsmanager, cloudwatch, cloudtrail, and certificatemanager.
1. Topology Contract (the application owns all layout):
   - Return services, directed connections, and direct group membership only. Never return coordinates, dimensions, visual ordering, or spacer resources. The deterministic canvas engine computes placement and container sizes.
   - Use globally unique, nonempty tempIds across services and groups. Every edge endpoint must reference a declared resource. Return AWS resources only; delivery milestones are a separate generation mode.
   - Never emit empty groups. For a serverless or static design, omit VPC/subnet boundaries unless networking is actually required.
   - Model the requested scope faithfully, including one or two services for a genuinely small request. Do not expand a small diagram to meet a service count.
   - Separate traffic (sync_http/data_flow), asynchronous messaging (async_queue/event), and security permissions (security_iam). Telemetry edges point from the instrumented service to CloudWatch; IAM/KMS edges express permissions, not request ordering.
   - Spatial Hierarchy & Containment Rules:
   - EDGE / CLIENT SERVICES (CloudFront, Route 53, WAF, API Gateway public): MUST NOT have a parentGroupTempId. They reside outside the VPC.
   - VPC BOUNDARY: When the workload requires VPC networking, create a main VPC group with a non-overlapping CIDR. Do not force managed edge/global services into it.
   - SUBNET TIERS: For VPC workloads, define only the subnet tiers the design actually uses, with parentGroupTempId pointing to the VPC:
     * Public Ingress Subnet (style: "subnet", hosting ALB, NAT Gateways)
     * Private Application Subnet (style: "subnet", hosting ECS, EKS, Lambda, internal APIs)
     * Isolated Database Subnet (style: "subnet", hosting Aurora, RDS, DynamoDB DAX, ElastiCache)
   - REGIONAL MANAGED SERVICES (CloudWatch, KMS, Secrets Manager, S3, DynamoDB): outside subnets unless a concrete network appliance must be inside one.
   - Every group must declare all direct children in childTempIds, and every contained child must declare the same parentGroupTempId.
   - Containers are semantic boundaries, not decoration: never place a service in a subnet that cannot host it.

2. Production Depth & Configuration Specifics:
   - Always specify realistic instance types (e.g., db.r6g.xlarge, Fargate 2 vCPU / 4GB), storage classes (e.g., gp3 3000 IOPS), and multi-AZ configurations.
   - Specify active port listeners and protocols (e.g., HTTPS/443, TCP/5432, TCP/6379).

3. Data Flow & Network Edges:
   - Every service must connect logically: CloudFront -> ALB -> ECS -> RDS / ElastiCache.
   - Label every dataFlowEdge with its protocol/port (e.g., "HTTPS/443", "HTTP/8080", "TCP/5432").
   - Connect every service that participates in the request, event, data, deployment, or telemetry path. No unexplained orphan resources.
   - Prefer asynchronous decoupling, retries/DLQs, multi-AZ data stores, encryption, least privilege, alarms, backups, and autoscaling when the requirements justify them.

4. Architecture Depth (adapt to the request; do not pad blindly):
   - A production application normally needs ingress/DNS, security controls, compute, state/data, secrets/encryption, observability, backups/recovery, and delivery/operations.
   - An advanced or enterprise request should normally produce 10-20 purposeful services and the required VPC/AZ/subnet hierarchy, not a vague 3-5 node sketch.
   - Put concrete values in configEntries as { key, value } items: CIDRs, listeners, scaling bounds, retention, encryption keys, engine/version or runtime, backup window/RPO/RTO, and alarm thresholds where relevant.

${domainGuidanceText}

GOLD STANDARD REFERENCE ARCHITECTURE:
${JSON.stringify(providerExample(AWS_WEB_APP_FEW_SHOT_EXAMPLE), null, 2)}
`;
}
