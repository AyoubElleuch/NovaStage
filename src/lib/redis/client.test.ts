import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isRedisConfigured,
  getRedis,
  safeRedisGet,
  safeRedisSet,
  safeRedisDel,
  safeRedisExpire,
  resetRedisClientInstance,
} from "./client";

describe("Redis Client & Distributed Lease Fallback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetRedisClientInstance();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetRedisClientInstance();
    vi.restoreAllMocks();
  });

  it("reports unconfigured when environment variables are missing", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    expect(isRedisConfigured()).toBe(false);
    expect(getRedis()).toBeNull();
  });

  it("safely handles get, set, delete, and expire operations without throwing when unconfigured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    expect(await safeRedisGet<string>("test-key")).toBeNull();
    expect(await safeRedisSet("test-key", "value", { ex: 60 })).toBe(false);
    expect(await safeRedisDel("test-key")).toBe(false);
    expect(await safeRedisExpire("test-key", 300)).toBe(false);
  });

  it("initializes Redis client when valid URL and token are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token-123";

    expect(isRedisConfigured()).toBe(true);
    expect(getRedis()).not.toBeNull();
  });
});
