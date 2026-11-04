import { describe, expect, it } from "vitest";
import { AIGenerationError, describeAIFailure, readAIGenerationResponse, toAIGenerationError } from "./response";
import { previewGeneration } from "./preview";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const milestone = { node_type: "milestone" as const };
const service = { node_type: "aws_service" as const };

describe("generation preview", () => {
  it("says what each mode builds and what it leaves alone", () => {
    const workflow = previewGeneration({ mode: "workflow", prompt: "plan a launch", nodes: [] });
    expect(workflow.builds).toMatch(/Milestones with checkpoints/);
    expect(workflow.leavesAlone).toMatch(/AWS services and groups are not added/);
    const aws = previewGeneration({ mode: "aws_architecture", prompt: "a web app", nodes: [] });
    expect(aws.builds).toMatch(/AWS services/);
    expect(aws.leavesAlone).toMatch(/Milestones and checkpoints are not added/);
  });

  it("promises no changes on an empty canvas and offers no choice", () => {
    const preview = previewGeneration({ mode: "workflow", prompt: "plan a launch", nodes: [service] });
    expect(preview).toMatchObject({ operation: "create", existingCount: 0, canChooseOperation: false });
    expect(preview.headline).toBe("Adds a new workflow to your canvas");
    expect(preview.details.join(" ")).toContain("Nothing on your canvas is changed.");
  });

  it("counts only items of the selected mode and defaults to updating existing work", () => {
    const nodes = [milestone, milestone, service, { node_type: "group" as const }];
    const workflow = previewGeneration({ mode: "workflow", prompt: "add testing", nodes });
    expect(workflow).toMatchObject({ operation: "update", existingCount: 2, canChooseOperation: true, inferred: true });
    expect(workflow.details.join(" ")).toContain("2 existing milestones");
    const aws = previewGeneration({ mode: "aws_architecture", prompt: "add a cache", nodes });
    expect(aws.existingCount).toBe(2);
    expect(aws.details.join(" ")).toContain("2 existing AWS resources");
  });

  it("respects an explicit choice and explains that existing items stay", () => {
    const preview = previewGeneration({ mode: "workflow", prompt: "plan a launch", nodes: [milestone], chosenOperation: "create" });
    expect(preview).toMatchObject({ operation: "create", inferred: false });
    expect(preview.headline).toBe("Adds a separate new workflow");
    expect(preview.details[0]).toBe("Your 1 existing milestone is left as it is.");
    expect(previewGeneration({ mode: "workflow", prompt: "x", nodes: [milestone], chosenOperation: "update" }).headline).toBe("Updates your existing workflow");
  });

  it("matches the server's rule for wording that asks for something new", () => {
    expect(previewGeneration({ mode: "workflow", prompt: "create a new release plan", nodes: [milestone] }).operation).toBe("create");
    expect(previewGeneration({ mode: "workflow", prompt: "tighten this", nodes: [milestone] }).operation).toBe("update");
  });

  it("always states that the result is applied immediately and can be undone", () => {
    for (const nodes of [[], [milestone]]) {
      expect(previewGeneration({ mode: "workflow", prompt: "x", nodes }).details.at(-1)).toMatch(/applied right away.*undo/);
    }
  });
});

describe("AI failures", () => {
  it("classifies quota, collision, model and timeout responses", async () => {
    await expect(readAIGenerationResponse(json({ error: "QUOTA_EXCEEDED", message: "Limit reached" }, 403))).rejects.toMatchObject({ code: "QUOTA_EXCEEDED", refunded: false, message: "Limit reached" });
    await expect(readAIGenerationResponse(json({ error: "COLLISION_LOCKED", message: "busy", generatingUser: "Casey" }, 409))).rejects.toMatchObject({ code: "COLLISION_LOCKED", generatingUser: "Casey" });
    await expect(readAIGenerationResponse(json({ error: "AI_GENERATION_FAILED", message: "bad graph" }, 502))).rejects.toMatchObject({ code: "AI_GENERATION_FAILED", refunded: true });
    await expect(readAIGenerationResponse(new Response("<html>gateway</html>", { status: 504 }))).rejects.toMatchObject({ code: "TIMEOUT" });
    await expect(readAIGenerationResponse(json({ error: "Choose Workflow or AWS Architecture." }, 400))).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(readAIGenerationResponse(json({ success: true }))).rejects.toMatchObject({ code: "INCOMPLETE" });
  });

  it("never shows markup or oversized server text", async () => {
    const markup = await readAIGenerationResponse(json({ message: "<b>boom</b>" }, 500)).catch((error) => error);
    expect(markup.message).toBe("AI generation is temporarily unavailable. Please try again.");
    const long = await readAIGenerationResponse(json({ message: "x".repeat(600) }, 500)).catch((error) => error);
    expect(long.message).toBe("AI generation is temporarily unavailable. Please try again.");
  });

  it("returns the generated graph on success", async () => {
    const result = await readAIGenerationResponse(json({ success: true, nodes: [{ id: "a" }], summary: "ok" }));
    expect(result.nodes).toHaveLength(1);
  });

  it("normalises aborted, offline and unknown errors", () => {
    expect(toAIGenerationError(new DOMException("timed out", "TimeoutError")).code).toBe("TIMEOUT");
    expect(toAIGenerationError(new TypeError("Failed to fetch")).code).toBe("NETWORK");
    expect(toAIGenerationError("weird").code).toBe("UNAVAILABLE");
    const original = new AIGenerationError("x", "QUOTA_EXCEEDED");
    expect(toAIGenerationError(original)).toBe(original);
  });

  it("offers an actionable next step for each failure without promising what is untrue", () => {
    expect(describeAIFailure(new AIGenerationError("", "QUOTA_EXCEEDED"), { maxRequests: 10 })).toMatchObject({ actions: ["use_own_ai"], message: expect.stringContaining("10 built-in") });
    expect(describeAIFailure(new AIGenerationError("", "QUOTA_EXCEEDED"), { maxRequests: 999999 }).message).not.toMatch(/999999/);
    expect(describeAIFailure(new AIGenerationError("", "COLLISION_LOCKED", { generatingUser: "Casey" }))).toMatchObject({ title: "Casey is generating right now", actions: ["retry"] });
    expect(describeAIFailure(new AIGenerationError("", "TIMEOUT")).actions).toEqual(["reload", "retry"]);
    expect(describeAIFailure(new AIGenerationError("", "AI_GENERATION_FAILED", { refunded: true })).note).toMatch(/wasn't counted/);
    expect(describeAIFailure(new AIGenerationError("", "INCOMPLETE")).note).toBeUndefined();
    expect(describeAIFailure(new AIGenerationError("Pick a mode", "INVALID_REQUEST"))).toMatchObject({ message: "Pick a mode", actions: [] });
  });
});
