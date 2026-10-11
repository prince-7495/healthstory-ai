/**
 * Rate Limiting — Redis-backed (Upstash compatible) with in-memory fallback.
 *
 * Uses Upstash Redis REST API (works with Vercel serverless).
 * Falls back to in-memory when Redis URL is not configured.
 *
 * Upstash Redis: https://upstash.com (free tier available, works with Vercel)
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/** In-memory fallback (dev / single instance). */
const memoryWindows = new Map<string, { count: number; resetAt: number }>();

/** Parse int with fallback. */
const int = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Named buckets. Every value can be tuned through the environment. */
export const BUCKETS = {
  login: { limit: int(process.env.RATE_LOGIN_LIMIT, 10), windowMs: int(process.env.RATE_LOGIN_WINDOW_MS, 5 * 60_000) },
  register: { limit: int(process.env.RATE_REGISTER_LIMIT, 10), windowMs: int(process.env.RATE_REGISTER_WINDOW_MS, 60_000) },
  ai: { limit: int(process.env.RATE_AI_LIMIT, 20), windowMs: int(process.env.RATE_AI_WINDOW_MS, 60_000) },
  upload: { limit: int(process.env.RATE_UPLOAD_LIMIT, 20), windowMs: int(process.env.RATE_UPLOAD_WINDOW_MS, 10 * 60_000) },
  write: { limit: int(process.env.RATE_WRITE_LIMIT, 120), windowMs: int(process.env.RATE_WRITE_WINDOW_MS, 60_000) },
} as const;

export type BucketName = keyof typeof BUCKETS;

/** Redis client using Upstash REST API. */
class UpstashRateLimiter {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
  }

  private async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      throw new Error(`Upstash error (${res.status}): ${text}`);
    }
    return res.json();
  }

  async check(bucket: BucketName, key: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
    const { limit, windowMs } = BUCKETS[bucket];
    const keyId = `ratelimit:${bucket}:${key}`;

    // Use Upstash INCR with EXPIRE for atomic rate limiting
    const result = await this.request("POST", "/incr", {
      key: keyId,
      expire: Math.ceil(windowMs / 1000),
    });

    const count = result?.result ?? 1;
    if (count > limit) {
      // Get TTL to calculate retry-after
      const ttlResult = await this.request("POST", "/ttl", { key: keyId });
      const ttl = ttlResult?.result ?? Math.ceil(windowMs / 1000);
      return { ok: false, retryAfterSec: Math.max(1, ttl) };
    }
    return { ok: true };
  }
}

// In-memory fallback implementation
function pruneMemory(now: number): void {
  if (memoryWindows.size < 5_000) return;
  for (const [id, window] of memoryWindows) {
    if (window.resetAt <= now) memoryWindows.delete(id);
  }
}

function checkMemory(bucket: BucketName, key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const { limit, windowMs } = BUCKETS[bucket];
  const now = Date.now();
  pruneMemory(now);

  const id = `${bucket}:${key}`;
  const window = memoryWindows.get(id);

  if (!window || window.resetAt <= now) {
    memoryWindows.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  window.count += 1;
  if (window.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((window.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

/** Lazy-initialized Redis client. */
let redisLimiter: UpstashRateLimiter | null = null;

function getRedisLimiter(): UpstashRateLimiter | null {
  if (redisLimiter) return redisLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (url && token) {
    try {
      redisLimiter = new UpstashRateLimiter(url, token);
      console.log("[RateLimit] Upstash Redis connected");
      return redisLimiter;
    } catch (e) {
      console.warn("[RateLimit] Failed to init Upstash Redis, falling back to memory:", e);
      return null;
    }
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    console.warn("[RateLimit] WARNING: No Upstash Redis configured in production. Using in-memory fallback (not shared across instances).");
  }
  return null;
}

/** Client IP — first x-forwarded-for entry when behind a proxy, else local. */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "local";
}

/**
 * Enforce a rate limit for this request.
 *
 * Returns `null` when the request may proceed, or a ready-made 429
 * response (with `Retry-After`) when the bucket is exhausted. Tripped
 * limits are recorded in the audit log (fire-and-forget — the audit
 * write must never delay or break the response).
 */
export async function enforceRateLimit(
  request: NextRequest,
  options: { bucket: BucketName; userId?: string; key?: string }
): Promise<NextResponse | null> {
  const { bucket, userId } = options;
  const key =
    options.key ?? (options.userId ? `${options.userId}@${clientIp(request)}` : clientIp(request));

  const redis = getRedisLimiter();
  const result = redis
    ? await redis.check(bucket, key)
    : checkMemory(bucket, key);

  if (result.ok) return null;

  // Audit log (fire-and-forget)
  void prisma.auditLog
    .create({
      data: {
        userId: userId ?? null,
        action: "RATE_LIMIT_TRIGGERED",
        resourceType: "RATE_LIMIT",
        resourceId: bucket,
        metadata: { key, limit: BUCKETS[bucket].limit, windowMs: BUCKETS[bucket].windowMs },
      },
    })
    .catch(() => {
      /* auditing must never break the response */
    });

  return NextResponse.json(
    { success: false, error: { code: "RATE_LIMITED", message: "Too many requests — please wait a moment and try again." } },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}