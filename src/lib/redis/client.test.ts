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

describe("Redis Client & Fallback Safety Layer", () => {
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

  it("safely handles safeRedisGet without throwing when unconfigured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await safeRedisGet<string>("test-key");
    expect(result).toBeNull();
  });

  it("safely handles safeRedisSet without throwing when unconfigured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await safeRedisSet("test-key", "value", { ex: 60 });
    expect(result).toBe(false);
  });

  it("safely handles safeRedisDel without throwing when unconfigured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await safeRedisDel("test-key");
    expect(result).toBe(false);
  });

  it("safely handles safeRedisExpire without throwing when unconfigured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await safeRedisExpire("test-key", 300);
    expect(result).toBe(false);
  });

  it("initializes Redis client when valid URL and token are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token-123";

    expect(isRedisConfigured()).toBe(true);
    const client = getRedis();
    expect(client).not.toBeNull();
  });
});
