import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./request-origin";

const request = (headers: Record<string, string>) => new Request("http://localhost:3000/api/share", { method: "POST", headers });

describe("request origin validation", () => {
  it("accepts the browser's actual local host when Next rewrites the request URL", () => {
    expect(isSameOriginRequest(request({ origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" }))).toBe(true);
  });
  it("accepts an HTTPS proxy with the public Host header", () => {
    expect(isSameOriginRequest(request({ origin: "https://canvas.example", host: "canvas.example", "x-forwarded-proto": "https" }))).toBe(true);
  });
  it("accepts a rewritten proxy Host only for the configured public origin", () => {
    const proxied = request({ origin: "https://canvas.example", host: "internal:3000", "x-forwarded-host": "canvas.example", "x-forwarded-proto": "https" });
    expect(isSameOriginRequest(proxied, "https://canvas.example")).toBe(true);
    expect(isSameOriginRequest(proxied, "https://different.example")).toBe(false);
    expect(isSameOriginRequest(proxied)).toBe(false);
  });
  it("rejects arbitrary forwarded origins and mismatched protocols", () => {
    expect(isSameOriginRequest(request({ origin: "https://evil.example", host: "canvas.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" }), "https://canvas.example")).toBe(false);
    expect(isSameOriginRequest(request({ origin: "https://canvas.example", host: "canvas.example" }))).toBe(false);
  });
  it("rejects malformed or opaque origins", () => {
    for (const origin of ["null", "invalid", "http://localhost:3000/path"]) expect(isSameOriginRequest(request({ origin }))).toBe(false);
  });
  it("supports ordinary direct requests without a Host override or Origin header", () => {
    expect(isSameOriginRequest(request({ origin: "http://localhost:3000" }))).toBe(true);
    expect(isSameOriginRequest(request({}))).toBe(true);
  });
});
