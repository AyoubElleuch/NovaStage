import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import catalog from "./aws-catalog.json";

describe("official AWS architecture catalog", () => {
  it("ships a real local SVG and a browseable category for every entry", () => {
    expect(new Set(catalog.services.map((service) => service.id)).size).toBe(catalog.services.length);
    for (const service of catalog.services) {
      expect(service.category in catalog.categories).toBe(true);
      const path = resolve("public", service.iconPath.slice(1));
      expect(existsSync(path), service.name).toBe(true);
      expect(readFileSync(path, "utf8"), service.name).toContain("<svg");
    }
  });
  it("preserves existing diagram IDs and covers previously missing categories", () => {
    const ids = new Set(catalog.services.map((service) => service.id));
    for (const id of ["ec2", "lambda", "s3", "ecs", "eks", "efs", "glacier", "rds", "iam", "sagemaker", "bedrock", "sqs", "sns", "apigateway", "elb", "route53", "athena", "glue", "amplify", "iotcore", "codebuild"]) expect(ids.has(id), id).toBe(true);
  });
});
