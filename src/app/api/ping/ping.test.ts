import { describe, it, expect } from "vitest";
import { GET, HEAD } from "./route";

describe("/api/ping route", () => {
  it("GET returns 204 No Content with no-cache headers", async () => {
    const res = await GET();
    expect(res.status).toBe(204);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("HEAD returns 204 No Content with no-cache headers", async () => {
    const res = await HEAD();
    expect(res.status).toBe(204);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
