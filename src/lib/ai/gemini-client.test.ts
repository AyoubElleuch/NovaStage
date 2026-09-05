import { afterEach, describe, expect, it, vi } from "vitest";
import { callGemini } from "./gemini";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("AI provider request limits", () => {
  it("aborts stalled requests without starting another model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("AI_PROVIDER", "gemini");
    const controller = new AbortController();
    const fetchMock = vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = callGemini("Generate a workflow", {}, { signal: controller.signal });
    controller.abort();

    await expect(result).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not repeat an OpenAI request when Gemini is unconfigured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callGemini("Generate", {})).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("stops retrying on rate limits", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("AI_PROVIDER", "gemini");
    const fetchMock = vi.fn().mockResolvedValue(new Response("Rate limited", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callGemini("Generate", {})).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});