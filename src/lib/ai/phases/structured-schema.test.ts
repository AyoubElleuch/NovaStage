import { describe, expect, it } from "vitest";
import { AWS_WORKFLOW_SCHEMA } from "./generate-aws";
import { FULL_STACK_SCHEMA } from "./generate-fullstack";

describe("Gemini structured output schemas", () => {
  it.each([
    ["AWS", AWS_WORKFLOW_SCHEMA],
    ["Full Stack", FULL_STACK_SCHEMA],
  ])("keeps the %s schema compatible with Gemini", (_name, schema) => {
    const serialized = JSON.stringify(schema);
    expect(serialized).not.toContain("additionalProperties");
    expect(serialized).toContain("configEntries");
  });
});
