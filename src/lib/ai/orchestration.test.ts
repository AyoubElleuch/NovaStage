import { describe, expect, it } from "vitest";
import { resolveGenerationOperation } from "./orchestration";

describe("AI generation orchestration", () => {
  it("creates when the selected mode has no relevant canvas content", () => {
    expect(resolveGenerationOperation("aws_architecture", "Build production AWS", [
      { node_type: "milestone" },
    ])).toBe("create");
  });

  it("updates an existing architecture by default and for modification language", () => {
    const nodes = [{ node_type: "aws_service" as const }, { node_type: "group" as const }];
    expect(resolveGenerationOperation("aws_architecture", "Make this highly available", nodes)).toBe("update");
    expect(resolveGenerationOperation("aws_architecture", "Add Redis", nodes)).toBe("update");
  });

  it("creates a separate topology only when explicitly requested", () => {
    expect(resolveGenerationOperation("aws_architecture", "Create another separate architecture", [
      { node_type: "aws_service" },
    ])).toBe("create");
  });

  it("honors an explicit operation from the client", () => {
    expect(resolveGenerationOperation("workflow", "change it", [{ node_type: "milestone" }], "create")).toBe("create");
  });
});
