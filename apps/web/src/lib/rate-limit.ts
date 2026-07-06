import { NextRequest } from 'next/server';
import { jsonError } from './api';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  windowSeconds: number;
  maxRequests: number;
};

const memoryBuckets = new Map<string, RateLimitBucket>();

export function getClientIp(request: Pick<NextRequest, 'headers'>) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function cleanupExpiredBuckets(now: number) {
  if (memoryBuckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key);
    }
  }
}

export function rateLimitKey(request: Pick<NextRequest, 'headers'>, scope: string, actorId?: string | null) {
  return `${scope}:${actorId ?? getClientIp(request)}`;
}

export function resetInMemoryRateLimits() {
  memoryBuckets.clear();
}

export function getInMemoryRateLimitBucketCount() {
  return memoryBuckets.size;
}

export async function assertRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const existing = memoryBuckets.get(options.key);

  cleanupExpiredBuckets(now);

  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(options.key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: options.maxRequests - 1, resetAt: new Date(now + windowMs) };
  }

  if (existing.count >= options.maxRequests) {
    return {
      ok: false as const,
      response: jsonError('forbidden', 'Too many requests. Please wait and try again.', 429, {
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      }),
    };
  }

  existing.count += 1;
  memoryBuckets.set(options.key, existing);
  return { ok: true as const, remaining: Math.max(0, options.maxRequests - existing.count), resetAt: new Date(existing.resetAt) };
}
