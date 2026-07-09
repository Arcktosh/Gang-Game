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

type RateLimitBackend = 'memory' | 'redis' | 'redis_unavailable';

type RedisClient = {
  incr(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<number>;
  pttl(key: string): Promise<number>;
};

type RedisConstructor = new (
  url: string,
  options: {
    lazyConnect: boolean;
    maxRetriesPerRequest: number;
    enableOfflineQueue: boolean;
  },
) => RedisClient & { connect(): Promise<void> };

type BucketIncrement = {
  count: number;
  resetAt: number;
  backend: RateLimitBackend;
};

const memoryBuckets = new Map<string, RateLimitBucket>();
let redisClientPromise: Promise<RedisClient | null> | null = null;
let redisDisabledUntil = 0;
let lastBackend: RateLimitBackend = 'memory';

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

function incrementMemoryBucket(options: RateLimitOptions, now: number): BucketIncrement {
  const windowMs = options.windowSeconds * 1000;
  const existing = memoryBuckets.get(options.key);

  cleanupExpiredBuckets(now);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    memoryBuckets.set(options.key, bucket);
    return { ...bucket, backend: 'memory' };
  }

  const bucket = { count: existing.count + 1, resetAt: existing.resetAt };
  memoryBuckets.set(options.key, bucket);
  return { ...bucket, backend: 'memory' };
}

function redisUrl() {
  return process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL || '';
}

function redisKeyPrefix() {
  return process.env.RATE_LIMIT_REDIS_PREFIX || 'drugdeal:rate-limit:';
}

function redisRequired() {
  return process.env.RATE_LIMIT_REDIS_REQUIRED === 'true';
}

function sanitizeRedisKey(key: string) {
  return key.replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 200);
}

async function getRedisClient(): Promise<RedisClient | null> {
  const url = redisUrl();

  if (!url) {
    return null;
  }

  if (redisDisabledUntil > Date.now()) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = import('ioredis')
      .then(async (module) => {
        const Redis = (module.default ?? module) as RedisConstructor;
        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });
        await client.connect();
        return client;
      })
      .catch((error) => {
        redisClientPromise = null;

        if (redisRequired()) {
          throw error;
        }

        redisDisabledUntil = Date.now() + 30_000;
        lastBackend = 'redis_unavailable';
        return null;
      });
  }

  return redisClientPromise;
}

async function incrementRedisBucket(
  options: RateLimitOptions,
  now: number,
): Promise<BucketIncrement | null> {
  const client = await getRedisClient();

  if (!client) {
    return null;
  }

  const windowMs = options.windowSeconds * 1000;
  const key = `${redisKeyPrefix()}${sanitizeRedisKey(options.key)}`;
  const count = await client.incr(key);

  if (count === 1) {
    await client.pexpire(key, windowMs);
  }

  const ttl = await client.pttl(key);
  const resetAt = now + (ttl > 0 ? ttl : windowMs);
  return { count, resetAt, backend: 'redis' };
}

async function incrementBucket(options: RateLimitOptions): Promise<BucketIncrement> {
  const now = Date.now();

  try {
    const redisBucket = await incrementRedisBucket(options, now);

    if (redisBucket) {
      lastBackend = 'redis';
      return redisBucket;
    }
  } catch (error) {
    if (redisRequired()) {
      throw error;
    }

    redisClientPromise = null;
    redisDisabledUntil = Date.now() + 30_000;
    lastBackend = 'redis_unavailable';
  }

  const memoryBucket = incrementMemoryBucket(options, now);
  lastBackend = lastBackend === 'redis_unavailable' ? 'redis_unavailable' : 'memory';
  return lastBackend === 'redis_unavailable'
    ? { ...memoryBucket, backend: 'redis_unavailable' }
    : memoryBucket;
}

export function rateLimitKey(
  request: Pick<NextRequest, 'headers'>,
  scope: string,
  actorId?: string | null,
) {
  return `${scope}:${actorId ?? getClientIp(request)}`;
}

export function resetInMemoryRateLimits() {
  memoryBuckets.clear();
  lastBackend = 'memory';
}

export function resetRateLimitRedisStateForTests() {
  redisClientPromise = null;
  redisDisabledUntil = 0;
  lastBackend = 'memory';
}

export function getInMemoryRateLimitBucketCount() {
  return memoryBuckets.size;
}

export function getRateLimitBackendStatus() {
  return {
    backend: lastBackend,
    redisConfigured: Boolean(redisUrl()),
    redisDisabled: redisDisabledUntil > Date.now(),
    memoryBucketCount: memoryBuckets.size,
  };
}

export async function assertRateLimit(options: RateLimitOptions) {
  const bucket = await incrementBucket(options);

  if (bucket.count > options.maxRequests) {
    return {
      ok: false as const,
      response: jsonError('forbidden', 'Too many requests. Please wait and try again.', 429, {
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000)),
        backend: bucket.backend,
      }),
    };
  }

  return {
    ok: true as const,
    remaining: Math.max(0, options.maxRequests - bucket.count),
    resetAt: new Date(bucket.resetAt),
    backend: bucket.backend,
  };
}
