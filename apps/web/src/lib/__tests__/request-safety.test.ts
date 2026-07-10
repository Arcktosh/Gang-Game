import assert from 'node:assert/strict';
import test from 'node:test';

import { paginationMeta, parsePaginationSearchParams } from '../api';
import {
  assertRateLimit,
  getClientIp,
  getInMemoryRateLimitBucketCount,
  getRateLimitBackendStatus,
  rateLimitKey,
  resetInMemoryRateLimits,
  resetRateLimitRedisStateForTests,
} from '../rate-limit';
import {
  buildIdempotencyRequestHash,
  parseIdempotencyKey,
  stableStringify,
} from '../idempotency';

function headers(values: Record<string, string>) {
  return new Headers(values);
}

async function withInMemoryRateLimiter<T>(run: () => Promise<T>) {
  const previousRedisUrl = process.env.REDIS_URL;
  const previousRateLimitRedisUrl = process.env.RATE_LIMIT_REDIS_URL;
  const previousRedisRequired = process.env.RATE_LIMIT_REDIS_REQUIRED;

  delete process.env.REDIS_URL;
  delete process.env.RATE_LIMIT_REDIS_URL;
  delete process.env.RATE_LIMIT_REDIS_REQUIRED;
  resetInMemoryRateLimits();
  resetRateLimitRedisStateForTests();

  try {
    return await run();
  } finally {
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;

    if (previousRateLimitRedisUrl === undefined) delete process.env.RATE_LIMIT_REDIS_URL;
    else process.env.RATE_LIMIT_REDIS_URL = previousRateLimitRedisUrl;

    if (previousRedisRequired === undefined) delete process.env.RATE_LIMIT_REDIS_REQUIRED;
    else process.env.RATE_LIMIT_REDIS_REQUIRED = previousRedisRequired;

    resetInMemoryRateLimits();
    resetRateLimitRedisStateForTests();
  }
}

test('public pagination defaults and caps use the player-safe window', () => {
  const defaults = parsePaginationSearchParams(new URLSearchParams(), 'public');
  assert.equal(defaults.success, true);
  if (!defaults.success) return;

  assert.deepEqual(defaults.data, { limit: 25, offset: 0 });

  const capped = parsePaginationSearchParams(new URLSearchParams('limit=51&offset=0'), 'public');
  assert.equal(capped.success, false);
});

test('admin pagination allows the larger admin window', () => {
  const parsed = parsePaginationSearchParams(new URLSearchParams('limit=100&offset=9999'), 'admin');
  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.deepEqual(parsed.data, { limit: 100, offset: 9999 });
});

test('pagination metadata exposes forward and backward cursors', () => {
  assert.deepEqual(paginationMeta({ limit: 25, offset: 0, count: 25 }), {
    limit: 25,
    offset: 0,
    count: 25,
    nextOffset: 25,
    previousOffset: null,
  });

  assert.deepEqual(paginationMeta({ limit: 25, offset: 50, count: 8 }), {
    limit: 25,
    offset: 50,
    count: 8,
    nextOffset: null,
    previousOffset: 25,
  });
});

test('rate-limit keys prefer actor ids and otherwise use forwarded client ip', () => {
  const request = { headers: headers({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2' }) };

  assert.equal(getClientIp(request), '10.0.0.1');
  assert.equal(rateLimitKey(request, 'jobs', 'character-1'), 'jobs:character-1');
  assert.equal(rateLimitKey(request, 'jobs'), 'jobs:10.0.0.1');
});

test('in-memory rate limiter allows within-window traffic then rejects overflow', async () => {
  await withInMemoryRateLimiter(async () => {
    const first = await assertRateLimit({ key: 'test:actor', windowSeconds: 60, maxRequests: 2 });
    const second = await assertRateLimit({ key: 'test:actor', windowSeconds: 60, maxRequests: 2 });
    const third = await assertRateLimit({ key: 'test:actor', windowSeconds: 60, maxRequests: 2 });

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(third.ok, false);
    assert.equal(getInMemoryRateLimitBucketCount(), 1);
    assert.equal(getRateLimitBackendStatus().backend, 'memory');
  });
});

test('rate limiter exposes Redis configuration status while preserving memory fallback', async () => {
  await withInMemoryRateLimiter(async () => {
    const result = await assertRateLimit({ key: 'test:fallback', windowSeconds: 60, maxRequests: 1 });

    assert.equal(result.ok, true);
    assert.deepEqual(getRateLimitBackendStatus(), {
      backend: 'memory',
      redisConfigured: false,
      redisDisabled: false,
      memoryBucketCount: 1,
    });
  });
});

test('idempotency fingerprints are stable across object key ordering', () => {
  const left = { action: 'buy', quantity: 3, nested: { b: 2, a: 1 } };
  const right = { nested: { a: 1, b: 2 }, quantity: 3, action: 'buy' };

  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(
    buildIdempotencyRequestHash('market:post', left),
    buildIdempotencyRequestHash('market:post', right),
  );
});

test('idempotency key parsing accepts safe retry keys and rejects unsafe ones', () => {
  assert.deepEqual(parseIdempotencyKey(null), { ok: true, key: null });
  assert.deepEqual(parseIdempotencyKey(' retry-key_01:market.buy '), {
    ok: true,
    key: 'retry-key_01:market.buy',
  });

  assert.equal(parseIdempotencyKey('bad key with spaces').ok, false);
  assert.equal(parseIdempotencyKey('x'.repeat(129)).ok, false);
});

import {
  evaluateMutationOrigin,
  normalizeOrigin,
  parseTrustedOrigins,
  securityHeaders,
} from '../security';

function requestFixture(input: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
}) {
  const url = new URL(input.url ?? 'https://game.example.test/api/market');

  return {
    method: input.method ?? 'POST',
    headers: headers(input.headers ?? {}),
    nextUrl: {
      origin: url.origin,
      pathname: url.pathname,
    },
  } as any;
}

test('origin normalization accepts valid origins and rejects invalid values', () => {
  assert.equal(normalizeOrigin('https://Game.Example.Test/path?q=1'), 'https://game.example.test');
  assert.equal(normalizeOrigin('not a url'), null);
  assert.equal(normalizeOrigin(null), null);
});

test('trusted origin parser de-duplicates and drops invalid origins', () => {
  assert.deepEqual(parseTrustedOrigins('https://a.test, invalid, https://a.test/path, https://b.test'), [
    'https://a.test',
    'https://b.test',
  ]);
});

test('safe methods pass origin checks without requiring origin headers', () => {
  const decision = evaluateMutationOrigin(requestFixture({ method: 'GET', headers: {} }));

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'safe_method');
});

test('same-origin mutations pass origin checks', () => {
  const decision = evaluateMutationOrigin(requestFixture({ headers: { origin: 'https://game.example.test' } }));

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'same_origin');
});

test('untrusted cross-origin mutations are rejected', () => {
  const decision = evaluateMutationOrigin(requestFixture({ headers: { origin: 'https://evil.example.test' } }));

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'untrusted_origin');
});

test('security headers include baseline browser protections', () => {
  const headers = securityHeaders();

  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
});

import {
  attachRequestId,
  getRequestIdFromHeaders,
  normalizeRequestId,
  redactError,
  requestMetadata,
  runtimeDiagnostics,
} from '../observability';

test('request id normalization accepts safe ids and rejects unsafe ids', () => {
  assert.equal(normalizeRequestId(' request-01:abc.def '), 'request-01:abc.def');
  assert.equal(normalizeRequestId('short'), null);
  assert.equal(normalizeRequestId('bad id with spaces'), null);
  assert.equal(normalizeRequestId('x'.repeat(129)), null);
});

test('request id lookup prefers x-request-id then x-correlation-id', () => {
  assert.equal(getRequestIdFromHeaders(headers({ 'x-request-id': 'request-id-123' })), 'request-id-123');
  assert.equal(getRequestIdFromHeaders(headers({ 'x-correlation-id': 'correlation-id-123' })), 'correlation-id-123');
  assert.equal(
    getRequestIdFromHeaders(headers({ 'x-request-id': 'request-id-123', 'x-correlation-id': 'correlation-id-123' })),
    'request-id-123',
  );
});

test('request metadata includes request id and non-negative duration', () => {
  const metadata = requestMetadata({ requestId: 'request-id-123', startedAt: Date.now() - 5 });

  assert.equal(metadata.requestId, 'request-id-123');
  assert.equal(typeof metadata.timestamp, 'string');
  assert.equal(metadata.durationMs >= 0, true);
});

test('attachRequestId writes the response header', () => {
  const response = new Response('{}');
  attachRequestId(response, 'request-id-123');

  assert.equal(response.headers.get('x-request-id'), 'request-id-123');
});

test('redacted errors hide production stack details', () => {
  const originalEnv = process.env.NODE_ENV;
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

  const safeError = redactError(new Error('database password leaked here'));

  (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;

  assert.equal(safeError.name, 'Error');
  assert.equal(safeError.message, 'Unhandled server error.');
  assert.equal(safeError.stack, undefined);
});

test('runtime diagnostics expose process health without secrets', () => {
  const diagnostics = runtimeDiagnostics();

  assert.equal(typeof diagnostics.nodeEnv, 'string');
  assert.equal(typeof diagnostics.uptimeSeconds, 'number');
  assert.equal(typeof diagnostics.pid, 'number');
  assert.equal(typeof diagnostics.nodeVersion, 'string');
  assert.equal('DATABASE_URL' in diagnostics, false);
});
