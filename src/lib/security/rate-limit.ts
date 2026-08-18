import { headers } from "next/headers";

interface RateLimitRecord {
  timestamps: number[];
  lockedUntil?: number;
}

// In-memory store for rate limiting (keyed by action:ip or action:identifier)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 10 minutes to prevent memory leak
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    // Keep entries that are still locked or have timestamps within the last 15 minutes
    const hasRecentTimestamps = record.timestamps.some((t) => now - t < 15 * 60 * 1000);
    const isStillLocked = record.lockedUntil && record.lockedUntil > now;

    if (!hasRecentTimestamps && !isStillLocked) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  maxAttempts: number; // Max allowed attempts within the window
  windowSeconds: number; // Time window in seconds
  lockoutSeconds?: number; // How long to lock out if maxAttempts exceeded
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Checks and records an attempt for a specific key
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { maxAttempts: 5, windowSeconds: 60, lockoutSeconds: 30 }
): RateLimitResult {
  cleanupStaleEntries();

  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const lockoutMs = (options.lockoutSeconds || options.windowSeconds) * 1000;

  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Check if currently locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((timestamp) => now - timestamp < windowMs);

  // Check if limit exceeded
  if (record.timestamps.length >= options.maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    const retryAfterSeconds = Math.ceil(lockoutMs / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Record this attempt
  record.timestamps.push(now);
  const remaining = Math.max(0, options.maxAttempts - record.timestamps.length);

  return {
    allowed: true,
    remaining,
  };
}

/**
 * Resets rate limit for a key (e.g., upon successful login)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Safely extracts client IP address from Next.js headers
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const realIp = headerList.get("x-real-ip");
  const cfConnectingIp = headerList.get("cf-connecting-ip");

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list of IPs; first is client
    const ips = forwardedFor.split(",");
    return ips[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return "127.0.0.1";
}
