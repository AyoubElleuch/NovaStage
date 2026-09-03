import { AIWorkflowResult } from "../types";

export const AWS_WEB_APP_FEW_SHOT_EXAMPLE: AIWorkflowResult = {
  intent: "create_pipeline",
  mode: "aws_architecture",
  summary: "Production Three-Tier AWS Web Architecture with VPC, ECS Fargate, and Aurora Multi-AZ",
  milestones: [],
  edges: [],
  groups: [
    {
      tempId: "vpc_1",
      label: "Production VPC (10.0.0.0/16)",
      style: "vpc",
      childTempIds: ["subnet_public_1", "subnet_private_1", "subnet_db_1"]
    },
    {
      tempId: "subnet_public_1",
      parentGroupTempId: "vpc_1",
      label: "Public Ingress Subnet (10.0.1.0/24)",
      style: "subnet",
      childTempIds: ["alb_1"]
    },
    {
      tempId: "subnet_private_1",
      parentGroupTempId: "vpc_1",
      label: "Private Application Subnet (10.0.10.0/24)",
      style: "subnet",
      childTempIds: ["ecs_service_1"]
    },
    {
      tempId: "subnet_db_1",
      parentGroupTempId: "vpc_1",
      label: "Isolated Database Subnet (10.0.20.0/24)",
      style: "subnet",
      childTempIds: ["rds_primary", "elasticache_redis"]
    }
  ],
  serviceNodes: [
    {
      tempId: "cloudfront",
      serviceId: "cloudfront",
      name: "CloudFront CDN & WAF",
      description: "Global edge caching with TLS 1.3, origin shield, and AWS WAF anti-DDoS rules.",
      region: "us-east-1",
      config: { "Distribution": "Global Edge", "SSL": "TLS 1.3 (ACM)", "WAF": "Rate Limit 2k req/5m" }
    },
    {
      tempId: "alb_1",
      parentGroupTempId: "subnet_public_1",
      serviceId: "alb",
      name: "Application Load Balancer",
      description: "Dual-AZ public load balancer with SSL termination and path routing.",
      region: "us-east-1",
      config: { "Scheme": "Internet-facing", "Listeners": "HTTPS:443 -> Port 8080", "Health Check": "GET /health" }
    },
    {
      tempId: "ecs_service_1",
      parentGroupTempId: "subnet_private_1",
      serviceId: "ecs",
      name: "API Microservices Cluster",
      description: "Auto-scaled container tasks running in isolated private subnets.",
      region: "us-east-1",
      config: { "Compute": "Fargate 2 vCPU / 4GB", "Auto Scaling": "2 to 10 tasks", "Image": "ECR /api:v2.4" }
    },
    {
      tempId: "rds_primary",
      parentGroupTempId: "subnet_db_1",
      serviceId: "rds",
      name: "Aurora PostgreSQL Multi-AZ",
      description: "Enterprise relational database with automated storage scaling and failover.",
      region: "us-east-1",
      config: { "Engine": "PostgreSQL 15.4", "Instance": "db.r6g.xlarge", "Storage": "gp3 3000 IOPS", "Failover": "Automatic Multi-AZ" }
    },
    {
      tempId: "elasticache_redis",
      parentGroupTempId: "subnet_db_1",
      serviceId: "elasticache",
      name: "ElastiCache Redis Cluster",
      description: "Sub-millisecond in-memory cache for user sessions and hot query caching.",
      region: "us-east-1",
      config: { "Cluster": "2 Nodes Multi-AZ", "Engine": "Redis 7.0", "Eviction": "allkeys-lru" }
    },
    {
      tempId: "cloudwatch",
      serviceId: "cloudwatch",
      name: "CloudWatch Telemetry",
      description: "Centralized logging, real-time metrics, and automated latency/error alarms.",
      region: "us-east-1",
      config: { "Metrics": "1-minute resolution", "Alarms": "p99 Latency > 250ms", "Retention": "30 Days" }
    },
    {
      tempId: "kms",
      serviceId: "kms",
      name: "AWS KMS Customer Keys",
      description: "Hardware security module (HSM) backed envelope encryption for data at rest.",
      region: "us-east-1",
      config: { "Key Type": "Symmetric CMK", "Rotation": "Annual Auto-Rotate", "Alias": "alias/app-prod" }
    }
  ],
  dataFlowEdges: [
    {
      fromId: "cloudfront",
      toId: "alb_1",
      edgeType: "data_flow",
      label: "HTTPS/443",
      protocol: "https"
    },
    {
      fromId: "alb_1",
      toId: "ecs_service_1",
      edgeType: "data_flow",
      label: "HTTP/8080",
      protocol: "http"
    },
    {
      fromId: "ecs_service_1",
      toId: "rds_primary",
      edgeType: "network",
      label: "TCP/5432",
      protocol: "tcp"
    },
    {
      fromId: "ecs_service_1",
      toId: "elasticache_redis",
      edgeType: "network",
      label: "TCP/6379",
      protocol: "tcp"
    },
    {
      fromId: "ecs_service_1",
      toId: "cloudwatch",
      edgeType: "event",
      label: "Logs & Metrics",
      protocol: "https"
    }
  ]
};

export const FULL_STACK_FEW_SHOT_EXAMPLE: AIWorkflowResult = {
  intent: "create_pipeline",
  mode: "full_stack",
  summary: "Interlocked Full-Stack Architecture & Execution Roadmap for Enterprise SaaS",
  milestones: [
    {
      tempId: "m_edge",
      title: "1. Global Ingress & CDN Security",
      description: "Deploy CloudFront distribution, provision ACM wildcard certificates, and configure AWS WAF managed rate limits.",
      phase: "architecture",
      checkpoints: [
        { title: "Issue and validate AWS Certificate Manager (ACM) SSL cert for *.domain.com via DNS", isCompleted: false },
        { title: "Deploy CloudFront CDN distribution with TLS 1.3 minimum and HTTP/3 support", isCompleted: false },
        { title: "Associate AWS WAF WebACL with AWSManagedRulesCommonRuleSet and 2000 req/5min rate limit", isCompleted: false }
      ]
    },
    {
      tempId: "m_net",
      title: "2. Multi-AZ VPC Network Fabric",
      description: "Provision high-availability VPC across us-east-1a and us-east-1b with public, private, and isolated DB subnets.",
      phase: "architecture",
      checkpoints: [
        { title: "Create 10.0.0.0/16 VPC with DNS Hostnames and DNS Resolution enabled", isCompleted: false },
        { title: "Provision public subnets with Internet Gateway and dual Elastic IP NAT Gateways", isCompleted: false },
        { title: "Configure isolated database subnets without internet egress for compliance", isCompleted: false }
      ]
    },
    {
      tempId: "m_alb",
      title: "3. Ingress Routing & SSL Termination",
      description: "Configure Application Load Balancer with HTTP-to-HTTPS redirect, target groups, and health check probes.",
      phase: "implementation",
      checkpoints: [
        { title: "Deploy dual-AZ Application Load Balancer in public subnets with HTTPS listener", isCompleted: false },
        { title: "Configure target group on port 8080 with 15s health check probes to /health", isCompleted: false },
        { title: "Lock down security group to only accept traffic from CloudFront managed prefix list", isCompleted: false }
      ]
    },
    {
      tempId: "m_ecs",
      title: "4. Microservices Container Deployment",
      description: "Build Docker images, push to ECR, and configure auto-scaling ECS Fargate task definitions in private subnets.",
      phase: "implementation",
      checkpoints: [
        { title: "Build multi-stage production Docker container and push to private Amazon ECR repository", isCompleted: false },
        { title: "Define ECS Fargate Task Definition with 2048 CPU units, 4096MB RAM, and logging driver", isCompleted: false },
        { title: "Configure Target Tracking Auto Scaling policy maintaining 60% average CPU utilization", isCompleted: false }
      ]
    },
    {
      tempId: "m_db",
      title: "5. Aurora PostgreSQL & Redis Caching",
      description: "Provision Aurora PostgreSQL 15 Multi-AZ cluster and ElastiCache Redis in isolated subnets with automated backups.",
      phase: "implementation",
      checkpoints: [
        { title: "Provision Amazon Aurora PostgreSQL 15 cluster with primary and read replica across 2 AZs", isCompleted: false },
        { title: "Deploy ElastiCache Redis 7 cluster with cluster mode enabled and in-transit TLS encryption", isCompleted: false },
        { title: "Run Prisma database migrations and configure connection pooling via AWS RDS Proxy", isCompleted: false }
      ]
    },
    {
      tempId: "m_sec",
      title: "6. Production Observability & Encryption",
      description: "Enforce KMS envelope encryption, configure CloudWatch latency/5xx alarms, and setup automated audit trails.",
      phase: "deployment",
      checkpoints: [
        { title: "Provision customer-managed KMS key (CMK) with annual rotation for DB and S3 encryption", isCompleted: false },
        { title: "Create CloudWatch dashboard tracking p95 response time, RDS CPU, and ECS memory", isCompleted: false },
        { title: "Configure CloudWatch Alarms sending high-priority alerts to on-call SNS topic", isCompleted: false }
      ]
    }
  ],
  edges: [
    { fromId: "m_edge", toId: "m_alb" },
    { fromId: "m_net", toId: "m_alb" },
    { fromId: "m_net", toId: "m_ecs" },
    { fromId: "m_net", toId: "m_db" },
    { fromId: "m_alb", toId: "m_ecs" },
    { fromId: "m_db", toId: "m_ecs" },
    { fromId: "m_ecs", toId: "m_sec" }
  ],
  groups: AWS_WEB_APP_FEW_SHOT_EXAMPLE.groups,
  serviceNodes: AWS_WEB_APP_FEW_SHOT_EXAMPLE.serviceNodes,
  dataFlowEdges: [
    ...(AWS_WEB_APP_FEW_SHOT_EXAMPLE.dataFlowEdges || []),
    // Cross-connecting interlocking edges bridging Milestones to AWS Services!
    {
      fromId: "m_edge",
      toId: "cloudfront",
      edgeType: "dependency",
      label: "Configures Edge",
      protocol: "iac"
    },
    {
      fromId: "m_net",
      toId: "vpc_1",
      edgeType: "dependency",
      label: "Provisions CIDR",
      protocol: "iac"
    },
    {
      fromId: "m_alb",
      toId: "alb_1",
      edgeType: "dependency",
      label: "Binds Listeners",
      protocol: "iac"
    },
    {
      fromId: "m_ecs",
      toId: "ecs_service_1",
      edgeType: "dependency",
      label: "Deploys Tasks",
      protocol: "iac"
    },
    {
      fromId: "m_db",
      toId: "rds_primary",
      edgeType: "dependency",
      label: "Runs Migrations",
      protocol: "iac"
    },
    {
      fromId: "m_db",
      toId: "elasticache_redis",
      edgeType: "dependency",
      label: "Initializes Cache",
      protocol: "iac"
    },
    {
      fromId: "m_sec",
      toId: "cloudwatch",
      edgeType: "dependency",
      label: "Instruments Alarms",
      protocol: "iac"
    },
    {
      fromId: "m_sec",
      toId: "kms",
      edgeType: "dependency",
      label: "Encrypts Keys",
      protocol: "iac"
    }
  ]
};
