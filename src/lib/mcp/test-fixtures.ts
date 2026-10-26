import type { z } from "zod";
import type { workflowSchema } from "./workflow";

export const sampleWorkflow = (): z.infer<typeof workflowSchema> => ({
  mode: "workflow", summary: "Delivery milestones for a serverless API.",
  milestones: [
    { tempId: "plan", title: "Design the API", phase: "architecture", checkpoints: [
      { title: "Document API input and output contracts" }, { title: "Specify authorization boundaries" },
      { title: "Agree on availability objectives" }, { title: "Review the failure recovery plan" },
    ] },
    { tempId: "ship", title: "Deploy the API", phase: "deployment", checkpoints: [
      { title: "Configure a staging environment" }, { title: "Run authorization integration tests" },
      { title: "Verify rollback using the previous release" }, { title: "Confirm production alarms and dashboards" },
    ] },
  ],
  edges: [{ fromId: "plan", toId: "ship" }],
  serviceNodes: [], groups: [], dataFlowEdges: [],
});

export const sampleArchitecture = (): z.infer<typeof workflowSchema> => ({
  mode: "aws_architecture", summary: "A serverless API and private database.",
  milestones: [], edges: [],
  serviceNodes: [
    { tempId: "gateway", serviceId: "api_gateway", name: "Public API" },
    { tempId: "handler", serviceId: "lambda", name: "Request handler", parentGroupTempId: "private", config: { runtime: "nodejs" } },
    { tempId: "db", serviceId: "rds", name: "Private database", parentGroupTempId: "private" },
  ],
  groups: [
    { tempId: "vpc", label: "Application VPC", style: "vpc", childTempIds: ["private"] },
    { tempId: "private", label: "Private subnet", style: "subnet", childTempIds: ["handler", "db"], parentGroupTempId: "vpc" },
  ],
  dataFlowEdges: [
    { fromId: "gateway", toId: "handler", edgeType: "sync_http", label: "HTTPS" },
    { fromId: "handler", toId: "db", edgeType: "data_flow", label: "SQL" },
  ],
});
