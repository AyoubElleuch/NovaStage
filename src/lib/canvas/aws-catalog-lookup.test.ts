import { expect, it } from "vitest";
import { getAWSServiceDefinition, getAWSServiceAliases } from "./aws-catalog-lookup";

it.each([
  ["SES", "simpleemailservice"], ["SQS", "sqs"], ["SNS", "sns"], ["RDS", "rds"],
  ["EC2", "ec2"], ["S3", "s3"], ["IAM", "iam"], ["ECS", "ecs"], ["EKS", "eks"],
  ["ALB", "elb"], ["WAF", "waf"], ["ECR", "elasticcontainerregistry"], ["CDK", "clouddevelopmentkit"],
  ["SSM", "systemsmanager"], ["MSK", "managedstreamingforapachekafka"],
])("resolves %s to its canonical catalog entry", (alias, id) => {
  expect(getAWSServiceDefinition(` ${alias.toLowerCase()} `)?.id).toBe(id);
});

it("indexes compound load balancer aliases", () => {
  expect(getAWSServiceDefinition("Application Load Balancer")?.id).toBe("elb");
  expect(getAWSServiceAliases("elb")).toContain("ALB");
});
