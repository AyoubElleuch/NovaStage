import { expect, it } from "vitest";
import { desktopAssistantLink, desktopHandoffPrompt } from "./desktop";

it("uses documented desktop composer URLs and round-trips encoded prompts", () => {
  const prompt = "Build an API & database.\nUse my model, not a paid API. 中文";
  const codex = new URL(desktopAssistantLink("codex", prompt));
  expect(codex.protocol).toBe("codex:");
  expect(codex.hostname).toBe("new");
  expect(codex.searchParams.get("prompt")).toBe(prompt);
  const claude = new URL(desktopAssistantLink("claude", prompt));
  expect(claude.protocol).toBe("claude:");
  expect(claude.hostname).toBe("code");
  expect(claude.pathname).toBe("/new");
  expect(claude.searchParams.get("q")).toBe(prompt);
  expect(codex.searchParams.has("autoSend")).toBe(false);
});
it("provides a complete HTTP MCP bootstrap without requiring installed tools or saving credentials", () => {
  const prompt = desktopHandoffPrompt("http://127.0.0.1:3000/api/mcp", "temporary-token", "request-id", "2026-10-26T10:00:00Z", "workflow");
  for (const value of ["initialize", "notifications/initialized", "tools/list", "get_canvas", "list_requests", "search_aws_services", "propose_workflow", "request-id", "Authorization: Bearer temporary-token"]) expect(prompt).toContain(value);
  expect(prompt).toContain("do not save it");
  expect(prompt).toContain("You do not need a preinstalled NovaStage tool");
  expect(prompt.length).toBeLessThan(14000);
});

it("states the selected mode and excludes the other node type in desktop prompts", () => {
  const aws = desktopHandoffPrompt("http://localhost/api/mcp", "token", "request", "tomorrow", "aws_architecture");
  expect(aws).toContain('mode="aws_architecture", milestones=[], and edges=[]');
  expect(aws).toContain("Do not generate task nodes");
  expect(aws).toContain("do not copy its nodes");
  const workflow = desktopHandoffPrompt("http://localhost/api/mcp", "token", "request", "tomorrow", "workflow");
  expect(workflow).toContain('mode="workflow", serviceNodes=[], groups=[], and dataFlowEdges=[]');
  expect(workflow).toContain("Do not generate AWS service nodes");
});
