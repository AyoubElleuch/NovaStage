import { describe, it, expect, beforeEach } from "vitest";
import { generateSecurePassword } from "./password";
import {
  checkRateLimit,
  resetRateLimit,
  checkRateLimitAsync,
  resetRateLimitAsync,
} from "./rate-limit";

describe("Security, Password Generation & Abuse Prevention", () => {
  const testKey = "test:ip:192.168.1.100";

  beforeEach(async () => {
    resetRateLimit(testKey);
    await resetRateLimitAsync(testKey);
  });

  it("generates cryptographically secure passwords meeting length and complexity rules", () => {
    const password = generateSecurePassword();
    expect(password.length).toBe(16);
    expect(generateSecurePassword(20).length).toBe(20);
    expect(generateSecurePassword(8).length).toBe(12); // Minimum enforced length

    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[!@#$%^&*-_+=]/.test(password)).toBe(true);
  });

  it("allows requests within rate limit thresholds and isolates keys independently", () => {
    const res1 = checkRateLimit(testKey, { maxAttempts: 2, windowSeconds: 60 });
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = checkRateLimit(testKey, { maxAttempts: 2, windowSeconds: 60 });
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);

    const otherKey = "test:user:bob";
    resetRateLimit(otherKey);
    expect(checkRateLimit(otherKey, { maxAttempts: 1, windowSeconds: 60 }).allowed).toBe(true);
  });

  it("blocks requests once limits are exceeded and resets properly", () => {
    checkRateLimit(testKey, { maxAttempts: 1, windowSeconds: 60, lockoutSeconds: 10 });
    const blocked = checkRateLimit(testKey, { maxAttempts: 1, windowSeconds: 60, lockoutSeconds: 10 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    resetRateLimit(testKey);
    expect(checkRateLimit(testKey, { maxAttempts: 1, windowSeconds: 60 }).allowed).toBe(true);
  });

  it("supports asynchronous rate limiting with fallback seamlessly", async () => {
    const asyncKey = "test:async:key";
    await resetRateLimitAsync(asyncKey);

    const res1 = await checkRateLimitAsync(asyncKey, { maxAttempts: 1, windowSeconds: 60 });
    expect(res1.allowed).toBe(true);

    const res2 = await checkRateLimitAsync(asyncKey, { maxAttempts: 1, windowSeconds: 60 });
    expect(res2.allowed).toBe(false);

    await resetRateLimitAsync(asyncKey);
    expect((await checkRateLimitAsync(asyncKey, { maxAttempts: 1, windowSeconds: 60 })).allowed).toBe(true);
  });
});
