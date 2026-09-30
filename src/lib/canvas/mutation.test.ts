import { describe, expect, it } from "vitest";
import { assertCanvasSaved } from "./mutation";

describe("canvas save feedback", () => {
  it("recognizes an edit-lock rejection even when HTTP succeeds", async () => {
    await expect(assertCanvasSaved(new Response(JSON.stringify({ success: false, error: "Claim this node to edit" })))).rejects.toThrow("Claim this node to edit");
  });
  it("rejects transport errors and invalid response bodies", async () => {
    await expect(assertCanvasSaved(new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503 }))).rejects.toThrow("Service unavailable");
    await expect(assertCanvasSaved(new Response("<html>Gateway error</html>", { status: 502 }))).rejects.toThrow("Unable to save canvas changes");
  });
  it("accepts a confirmed save", async () => {
    await expect(assertCanvasSaved(new Response(JSON.stringify({ success: true })))).resolves.toBeUndefined();
  });
});
