import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bankHistoryQuerySchema,
  paginationQuerySchema,
  publicPaginationQuerySchema,
  rateLimitOptionsSchema,
  serverEnvSchema,
} from '../index';

test('server environment validation rejects unsafe production secrets', () => {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_NAME: 'DrugDeal Game',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/drugdeal',
    AUTH_SECRET: 'short',
  });

  assert.equal(parsed.success, false);
});

test('server environment validation accepts a complete postgres runtime config', () => {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_NAME: 'DrugDeal Game',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/drugdeal',
    AUTH_SECRET: 'a-safe-secret-with-enough-length',
    REDIS_URL: 'redis://localhost:6379',
  });

  assert.equal(parsed.success, true);
});

test('public pagination is stricter than admin pagination', () => {
  assert.equal(publicPaginationQuerySchema.safeParse({ limit: '75', offset: '0' }).success, false);
  assert.equal(paginationQuerySchema.safeParse({ limit: '75', offset: '0' }).success, true);
});

test('rate-limit options reject impossible windows and oversized limits', () => {
  assert.equal(rateLimitOptionsSchema.safeParse({ windowSeconds: 0, maxRequests: 10 }).success, false);
  assert.equal(rateLimitOptionsSchema.safeParse({ windowSeconds: 60, maxRequests: 10001 }).success, false);
  assert.equal(rateLimitOptionsSchema.safeParse({ windowSeconds: 60, maxRequests: 100 }).success, true);
});

test('server environment validation accepts worker retry settings', () => {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_NAME: 'DrugDeal Game',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/drugdeal',
    AUTH_SECRET: 'a-safe-secret-with-enough-length',
    WORKER_TICK_MAX_ATTEMPTS: '3',
    WORKER_TICK_RETRY_BASE_MS: '1000',
    WORKER_TICK_RETRY_MAX_MS: '30000',
    WORKER_DEAD_LETTER_DISABLED: 'false',
    MESSAGE_RETENTION_DAYS: '365',
  });

  assert.equal(parsed.success, true);
});

test('server environment validation accepts canonical and trusted origins', () => {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_NAME: 'DrugDeal Game',
    NEXT_PUBLIC_APP_URL: 'https://drugdeal.example.test',
    APP_ORIGIN: 'https://drugdeal.example.test',
    TRUSTED_ORIGINS: 'https://preview.example.test,https://admin.example.test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/drugdeal',
    AUTH_SECRET: 'a-safe-secret-with-enough-length',
  });

  assert.equal(parsed.success, true);
});

test('server environment validation rejects malformed canonical origins', () => {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_NAME: 'DrugDeal Game',
    NEXT_PUBLIC_APP_URL: 'not-a-url',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/drugdeal',
    AUTH_SECRET: 'a-safe-secret-with-enough-length',
  });

  assert.equal(parsed.success, false);
});


test('bank statement query validation normalizes filters and rejects inverted date ranges', () => {
  const parsed = bankHistoryQuerySchema.safeParse({
    characterId: '00000000-0000-4000-8000-000000000001',
    action: 'loan_partial_repayment',
    format: 'csv',
    limit: '100',
    offset: '25',
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-01-31T23:59:59.000Z',
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.action, 'loan_partial_repayment');
    assert.equal(parsed.data.format, 'csv');
    assert.equal(parsed.data.limit, 100);
    assert.equal(parsed.data.offset, 25);
  }

  assert.equal(
    bankHistoryQuerySchema.safeParse({
      characterId: '00000000-0000-4000-8000-000000000001',
      from: '2026-02-01T00:00:00.000Z',
      to: '2026-01-01T00:00:00.000Z',
    }).success,
    false,
  );
});
