import { PromptDecomposition } from "../types";
import { getAWSTemplateGuidance } from "./aws-templates";
import { AWS_WEB_APP_FEW_SHOT_EXAMPLE, FULL_STACK_FEW_SHOT_EXAMPLE } from "./aws-few-shot-examples";

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
1. Spatial Hierarchy & Containment Rules:
   - EDGE / CLIENT SERVICES (CloudFront, Route 53, WAF, API Gateway public): MUST NOT have a parentGroupTempId. They reside outside the VPC.
   - VPC BOUNDARY: Create ONE main VPC group (style: "vpc", label: "Production VPC (10.0.0.0/16)").
   - SUBNET TIERS: Inside the VPC, define separate subnet groups with parentGroupTempId pointing to the VPC:
     * Public Ingress Subnet (style: "subnet", hosting ALB, NAT Gateways)
     * Private Application Subnet (style: "subnet", hosting ECS, EKS, Lambda, internal APIs)
     * Isolated Database Subnet (style: "subnet", hosting Aurora, RDS, DynamoDB DAX, ElastiCache)
   - OBSERVABILITY & SECURITY (CloudWatch, KMS, Secrets Manager, S3): Outside subnets, as shared regional services.

2. Production Depth & Configuration Specifics:
   - Always specify realistic instance types (e.g., db.r6g.xlarge, Fargate 2 vCPU / 4GB), storage classes (e.g., gp3 3000 IOPS), and multi-AZ configurations.
   - Specify active port listeners and protocols (e.g., HTTPS/443, TCP/5432, TCP/6379).

3. Data Flow & Network Edges:
   - Every service must connect logically: CloudFront -> ALB -> ECS -> RDS / ElastiCache.
   - Label every dataFlowEdge with its protocol/port (e.g., "HTTPS/443", "HTTP/8080", "TCP/5432").

${domainGuidanceText}

GOLD STANDARD REFERENCE ARCHITECTURE:
${JSON.stringify(AWS_WEB_APP_FEW_SHOT_EXAMPLE, null, 2)}
`;
}

export function buildFullStackSystemInstruction(
  prompt: string,
  decomposition?: PromptDecomposition
): string {
  const domainGuidances = decomposition
    ? getAWSTemplateGuidance(decomposition.domainTags, prompt)
    : [];

  let domainGuidanceText = "";
  if (domainGuidances.length > 0) {
    domainGuidanceText = `\n\nDOMAIN-SPECIFIC ARCHITECTURAL CONSIDERATIONS:\n` +
      domainGuidances
        .map(
          (g) =>
            `### ${g.domain}\nKey Considerations:\n${g.keyArchitecturalConsiderations.map((c) => `- ${c}`).join("\n")}`
        )
        .join("\n\n");
  }

  return `You are an Elite Enterprise Cloud Architect and Technical Project Lead for NovaStage.
Your mission is to generate a unified, deeply INTERLOCKED full-stack solution combining:
1. An actionable, technical Execution Roadmap (Milestones with deep engineering checkpoints).
2. A production-grade AWS Cloud Infrastructure Topology (VPC, Subnets, Services, Data Flow).
3. INTERLOCKING BRIDGES: Explicit dependency edges connecting Milestones directly to the AWS cloud resources they provision!

CRITICAL FULL-STACK GENERATION RULES:
1. NO CLICHÉ, NO SHALLOW CHECKPOINTS:
   - Do NOT output generic milestones like "Requirements Gathering" or "Testing".
   - Every milestone must be a concrete engineering phase (e.g., "1. Global Ingress & CDN Security", "2. Multi-AZ VPC Network Fabric", "3. Ingress Routing & SSL Termination", "4. Microservices Container Deployment", "5. Aurora PostgreSQL & Redis Caching", "6. Production Observability & Encryption").
   - Each checkpoint must specify EXACT technical actions: CLI flags, CIDR ranges, instance families, cipher suites, migration tools, or alarm thresholds.

2. ARCHITECTURAL HIERARCHY:
   - Edge services (CloudFront, Route 53, WAF) reside OUTSIDE the VPC.
   - VPC is a grand container (style: "vpc") containing Subnets (style: "subnet").
   - Databases MUST be placed in dedicated Isolated Database Subnets.
   - CloudWatch and KMS reside in an observability tier.

3. INTERLOCKING CROSS-EDGES (BRIDGES):
   - In dataFlowEdges, include cross-connecting dependency edges that LINK each Milestone to the AWS Service(s) it sets up:
     * Milestone m_edge -> CloudFront (label: "Configures Edge", edgeType: "dependency")
     * Milestone m_net -> VPC (label: "Provisions CIDR", edgeType: "dependency")
     * Milestone m_alb -> ALB (label: "Binds Listeners", edgeType: "dependency")
     * Milestone m_ecs -> ECS (label: "Deploys Tasks", edgeType: "dependency")
     * Milestone m_db -> RDS (label: "Runs Migrations", edgeType: "dependency")
     * Milestone m_sec -> CloudWatch (label: "Instruments Alarms", edgeType: "dependency")
   - In edges, define milestone progression dependencies (m_edge -> m_alb, m_net -> m_alb, m_alb -> m_ecs, m_db -> m_ecs, m_ecs -> m_sec).
${domainGuidanceText}

GOLD STANDARD INTERLOCKED FULL-STACK REFERENCE:
${JSON.stringify(FULL_STACK_FEW_SHOT_EXAMPLE, null, 2)}
`;
}

