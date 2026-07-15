import { randomUUID } from 'node:crypto';
import {
  assertRateLimit,
  getRateLimitBackendStatus,
  resetInMemoryRateLimits,
  resetRateLimitRedisStateForTests,
} from '../apps/web/src/lib/rate-limit';

const redisUrl = process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL or RATE_LIMIT_REDIS_URL is required for the Redis rate-limit proof.');
}

process.env.RATE_LIMIT_REDIS_REQUIRED = 'true';
resetInMemoryRateLimits();
resetRateLimitRedisStateForTests();

const key = `production-proof:${randomUUID()}`;
const options = { key, windowSeconds: 30, maxRequests: 2 };
const first = await assertRateLimit(options);
const second = await assertRateLimit(options);
const overflow = await assertRateLimit(options);
const status = getRateLimitBackendStatus();

const result = {
  checkedAt: new Date().toISOString(),
  ok:
    first.ok &&
    second.ok &&
    !overflow.ok &&
    first.backend === 'redis' &&
    second.backend === 'redis' &&
    status.backend === 'redis' &&
    status.redisConfigured,
  sequence: [first.ok ? 'allow' : 'reject', second.ok ? 'allow' : 'reject', overflow.ok ? 'allow' : 'reject'],
  backend: status.backend,
  redisConfigured: status.redisConfigured,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
