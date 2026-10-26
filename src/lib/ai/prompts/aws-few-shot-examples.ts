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
      serviceId: "elb",
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
    { fromId: "ecs_service_1", toId: "kms", edgeType: "security_iam", label: "Encrypt application data" },
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
