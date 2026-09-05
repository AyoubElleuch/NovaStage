import { describe, expect, it } from "vitest";
import { readAIGenerationResponse } from "./response";

describe("AI response handling", () => {
  it("replaces HTML gateway pages with a readable timeout", async () => {
    await expect(readAIGenerationResponse(new Response("<!DOCTYPE html><h1>Gateway timeout</h1>", {
      status: 504,
    }))).rejects.toThrow("AI generation timed out");
  });

  it("preserves actionable API errors", async () => {
    await expect(readAIGenerationResponse(Response.json({ message: "Quota exceeded" }, {
      status: 403,
    }))).rejects.toThrow("Quota exceeded");
  });

  it("rejects incomplete success responses", async () => {
    await expect(readAIGenerationResponse(Response.json({ success: true }))).rejects.toThrow("incomplete workflow");
  });

  it("accepts a generated graph", async () => {
    await expect(readAIGenerationResponse(Response.json({ success: true, nodes: [], edges: [] })))
      .resolves.toEqual({ success: true, nodes: [], edges: [] });
  });
});