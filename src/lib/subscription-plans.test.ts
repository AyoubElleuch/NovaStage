import { describe, expect, it } from "vitest";
import { getAiRequestLimit } from "./subscription-plans";

describe("getAiRequestLimit", () => {
  it("matches the limits enforced for each subscription plan", () => {
    expect(getAiRequestLimit("free")).toBe(10);
    expect(getAiRequestLimit("plus")).toBe(30);
    expect(getAiRequestLimit("pro")).toBe(50);
    expect(getAiRequestLimit("enterprise")).toBe(999999);
    expect(getAiRequestLimit("unknown")).toBe(10);
  });
});
