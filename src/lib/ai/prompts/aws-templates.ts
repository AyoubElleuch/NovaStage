import { AIProcessedServiceNode, AIProcessedGroup, AIProcessedDataFlowEdge } from "../types";

export interface AWSArchitectureTemplate {
  domain: string;
  description: string;
  keyArchitecturalConsiderations: string[];
  recommendedGroups?: Partial<AIProcessedGroup>[];
  recommendedServiceNodes?: Partial<AIProcessedServiceNode>[];
  recommendedDataFlowEdges?: Partial<AIProcessedDataFlowEdge>[];
}

export const AWS_ARCHITECTURE_TEMPLATES: Record<string, AWSArchitectureTemplate> = {
  web_app: {
    domain: "Web Application",
    description: "Standard three-tier web application architecture",
    keyArchitecturalConsiderations: [
      "Use CloudFront for global content delivery and caching",
      "Route traffic through ALB in public subnets to ECS/EC2 in private subnets",
      "Store relational data in RDS and session data in ElastiCache (Redis) in private subnets",
      "Protect endpoints with AWS WAF"
    ]
  },
  serverless: {
    domain: "Serverless Architecture",
    description: "Event-driven serverless application",
    keyArchitecturalConsiderations: [
      "Use API Gateway as the front door",
      "Implement business logic entirely in AWS Lambda",
      "Use DynamoDB for scalable NoSQL storage",
      "Store static assets and uploads in S3"
    ]
  },
  data_pipeline: {
    domain: "Data Pipeline",
    description: "Big data processing and analytics pipeline",
    keyArchitecturalConsiderations: [
      "Ingest streaming data via Kinesis",
      "Process events with Lambda or EMR",
      "Store raw and processed data in S3 (Data Lake)",
      "Transform data using AWS Glue and query with Amazon Redshift"
    ]
  },
  microservices: {
    domain: "Microservices",
    description: "Containerized microservices architecture",
    keyArchitecturalConsiderations: [
      "Orchestrate containers with ECS or EKS",
      "Use AWS Cloud Map for service discovery",
      "Expose services via ALB or API Gateway",
      "Use dedicated RDS or DynamoDB instances per microservice"
    ]
  },
  ml_pipeline: {
    domain: "Machine Learning Pipeline",
    description: "End-to-end machine learning workflow",
    keyArchitecturalConsiderations: [
      "Train and deploy models using Amazon SageMaker",
      "Store datasets and model artifacts in S3",
      "Orchestrate workflows with AWS Step Functions or Lambda",
      "Expose inference endpoints via API Gateway"
    ]
  }
};

export function getAWSTemplateGuidance(domainTags: string[], prompt: string): AWSArchitectureTemplate[] {
  const matches: AWSArchitectureTemplate[] = [];
  const p = prompt.toLowerCase();
  
  if (domainTags.includes("web") || p.includes("web app") || p.includes("frontend")) {
    matches.push(AWS_ARCHITECTURE_TEMPLATES.web_app);
  }
  if (domainTags.includes("serverless") || p.includes("serverless") || p.includes("lambda")) {
    matches.push(AWS_ARCHITECTURE_TEMPLATES.serverless);
  }
  if (domainTags.includes("data") || p.includes("pipeline") || p.includes("analytics") || p.includes("big data")) {
    matches.push(AWS_ARCHITECTURE_TEMPLATES.data_pipeline);
  }
  if (domainTags.includes("microservices") || p.includes("kubernetes") || p.includes("ecs") || p.includes("eks")) {
    matches.push(AWS_ARCHITECTURE_TEMPLATES.microservices);
  }
  if (domainTags.includes("ml") || p.includes("machine learning") || p.includes("ai") || p.includes("sagemaker")) {
    matches.push(AWS_ARCHITECTURE_TEMPLATES.ml_pipeline);
  }
  
  if (matches.length === 0) {
    matches.push(AWS_ARCHITECTURE_TEMPLATES.web_app);
  }
  
  return matches;
}
