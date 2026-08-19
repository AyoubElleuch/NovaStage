import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "./rate-limit";

describe("Rate Limiter & Abuse Prevention", () => {
  const testKey = "test:ip:192.168.1.100";

  beforeEach(() => {
    resetRateLimit(testKey);
  });

  it("allows initial requests within the max limit", () => {
    const res1 = checkRateLimit(testKey, { maxAttempts: 3, windowSeconds: 60 });
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(testKey, { maxAttempts: 3, windowSeconds: 60 });
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(testKey, { maxAttempts: 3, windowSeconds: 60 });
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests once maximum attempts are exceeded", () => {
    // 3 attempts allowed
    checkRateLimit(testKey, { maxAttempts: 3, windowSeconds: 60, lockoutSeconds: 10 });
    checkRateLimit(testKey, { maxAttempts: 3, windowSeconds: 60, lockoutSeconds: 10 });
    checkRateLimit(testKey, { maxAttempts: 3, windowSeconds: 60, lockoutSeconds: 10 });

    // 4th attempt should be blocked
    const res4 = checkRateLimit(testKey, { maxAttempts: 3, windowSeconds: 60, lockoutSeconds: 10 });
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets rate limit properly when resetRateLimit is called", () => {
    checkRateLimit(testKey, { maxAttempts: 1, windowSeconds: 60 });
    const blocked = checkRateLimit(testKey, { maxAttempts: 1, windowSeconds: 60 });
    expect(blocked.allowed).toBe(false);

    resetRateLimit(testKey);

    const allowedAgain = checkRateLimit(testKey, { maxAttempts: 1, windowSeconds: 60 });
    expect(allowedAgain.allowed).toBe(true);
    expect(allowedAgain.remaining).toBe(0);
  });

  it("isolates different keys independently", () => {
    const keyA = "test:user:alice";
    const keyB = "test:user:bob";
    resetRateLimit(keyA);
    resetRateLimit(keyB);

    checkRateLimit(keyA, { maxAttempts: 1, windowSeconds: 60 });
    const blockedA = checkRateLimit(keyA, { maxAttempts: 1, windowSeconds: 60 });
    expect(blockedA.allowed).toBe(false);

    const allowedB = checkRateLimit(keyB, { maxAttempts: 1, windowSeconds: 60 });
    expect(allowedB.allowed).toBe(true);
  });

  it("enforces max 2 attempts per 24 hours for password reset abuse prevention", () => {
    const resetKey = "password-reset:email:victim@example.com";
    resetRateLimit(resetKey);

    // Attempt 1
    const att1 = checkRateLimit(resetKey, { maxAttempts: 2, windowSeconds: 86400, lockoutSeconds: 86400 });
    expect(att1.allowed).toBe(true);
    expect(att1.remaining).toBe(1);

    // Attempt 2
    const att2 = checkRateLimit(resetKey, { maxAttempts: 2, windowSeconds: 86400, lockoutSeconds: 86400 });
    expect(att2.allowed).toBe(true);
    expect(att2.remaining).toBe(0);

    // Attempt 3 (blocked)
    const att3 = checkRateLimit(resetKey, { maxAttempts: 2, windowSeconds: 86400, lockoutSeconds: 86400 });
    expect(att3.allowed).toBe(false);
    expect(att3.retryAfterSeconds).toBeGreaterThan(0);
  });
});
