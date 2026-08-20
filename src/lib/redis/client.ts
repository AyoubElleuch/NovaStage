import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;
let isInitialized = false;

/**
 * Returns true if Upstash Redis environment variables are configured.
 */
export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token && url.startsWith("http"));
}

/**
 * Returns the singleton Redis instance if configured, otherwise null.
 */
export function getRedis(): Redis | null {
  if (isInitialized) {
    return redisInstance;
  }

  if (isRedisConfigured()) {
    try {
      redisInstance = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    } catch (err) {
      console.warn("[Redis] Failed to initialize Upstash Redis client:", err);
      redisInstance = null;
    }
  } else {
    redisInstance = null;
  }

  isInitialized = true;
  return redisInstance;
}

/**
 * Safely fetches a value from Redis with automatic fallback on error.
 */
export async function safeRedisGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (err) {
    console.warn(`[Redis] safeRedisGet failed for key "${key}":`, err);
    return null;
  }
}

/**
 * Safely sets a value in Redis with automatic fallback on error.
 * Supports ex (seconds), px (milliseconds), nx (only set if not exists).
 */
export async function safeRedisSet(
  key: string,
  value: unknown,
  options?: { ex?: number; px?: number; nx?: boolean }
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    if (options?.nx) {
      if (options.ex) {
        const res = await redis.set(key, value, { ex: options.ex, nx: true });
        return res === "OK";
      }
      if (options.px) {
        const res = await redis.set(key, value, { px: options.px, nx: true });
        return res === "OK";
      }
      const res = await redis.set(key, value, { nx: true });
      return res === "OK";
    }

    if (options?.ex) {
      await redis.set(key, value, { ex: options.ex });
      return true;
    }

    if (options?.px) {
      await redis.set(key, value, { px: options.px });
      return true;
    }

    await redis.set(key, value);
    return true;
  } catch (err) {
    console.warn(`[Redis] safeRedisSet failed for key "${key}":`, err);
    return false;
  }
}

/**
 * Safely deletes a key or list of keys from Redis.
 */
export async function safeRedisDel(keys: string | string[]): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    if (keyArray.length === 0) return true;
    await redis.del(...keyArray);
    return true;
  } catch (err) {
    console.warn(`[Redis] safeRedisDel failed:`, err);
    return false;
  }
}

/**
 * Safely sets expiration TTL on a key.
 */
export async function safeRedisExpire(key: string, seconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.expire(key, seconds);
    return true;
  } catch (err) {
    console.warn(`[Redis] safeRedisExpire failed for key "${key}":`, err);
    return false;
  }
}

/**
 * For testing / development: reset cached client instance.
 */
export function resetRedisClientInstance(): void {
  redisInstance = null;
  isInitialized = false;
}
