import { expect, it } from "vitest";
import { createAWSServiceNodeData } from "./aws-service-node";

it("resolves aliases through the current catalog and lets explicit configuration override defaults", () => {
  const node = createAWSServiceNodeData("api_gateway", "eu-west-1", { type: "HTTP" });
  expect(node).toEqual(expect.objectContaining({
    width: 200, height: 220,
    aws_metadata: expect.objectContaining({ serviceId: "apigateway", region: "eu-west-1", config: expect.objectContaining({ type: "HTTP" }) }),
  }));
  const dns = createAWSServiceNodeData("route53");
  dns.aws_metadata.config!.type = "AAAA";
  expect(createAWSServiceNodeData("route53").aws_metadata.config).toEqual({ type: "A" });
});
