import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeAIPipeline } from "./pipeline";

describe("AI Workflow Pipeline, Graph Validation & Quality Engine", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("fails offline generation without reporting a fabricated success", async () => {
    await expect(executeAIPipeline("Realtime collaboration workspace")).rejects.toThrow(
      "No canvas changes were applied",
    );
    await expect(executeAIPipeline("Deploy SaaS", "aws_architecture")).rejects.toThrow(
      "No canvas changes were applied",
    );
  });
});
