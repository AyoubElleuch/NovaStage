import { describe, expect, it, vi } from "vitest";
import RootPage from "./page";

vi.mock("@/components/home/home-experience", () => ({ default: () => null }));

describe("homepage routing", () => {
  it("always renders the public homepage", () => {
    expect(RootPage()).toBeTruthy();
  });
});