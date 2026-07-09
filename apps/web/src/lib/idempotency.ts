import { createHash } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { apiIdempotencyKeys, db } from '@drugdeal/db';
import { jsonError } from './api';

const IDEMPOTENCY_TTL_HOURS = 24;
const MAX_KEY_LENGTH = 128;
const KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

type IdempotencyOptions = {
  request: NextRequest;
  userId: string;
  routeScope: string;
  fingerprint: unknown;
  handler: () => Promise<Response | undefined>;
};

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
}

export function buildIdempotencyRequestHash(routeScope: string, fingerprint: unknown) {
  return createHash('sha256')
    .update(`${routeScope}:${stableStringify(fingerprint)}`)
    .digest('hex');
}

export function parseIdempotencyKey(rawKey: string | null) {
  const key = rawKey?.trim();

  if (!key) {
    return { ok: true as const, key: null };
  }

  if (key.length > MAX_KEY_LENGTH || !KEY_PATTERN.test(key)) {
    return { ok: false as const, error: 'Invalid Idempotency-Key header.' };
  }

  return { ok: true as const, key };
}

function getIdempotencyKey(request: NextRequest) {
  const parsed = parseIdempotencyKey(request.headers.get('idempotency-key'));

  if (!parsed.ok) {
    return { ok: false as const, response: jsonError('bad_request', parsed.error, 400) };
  }

  return parsed;
}

async function clearExpiredIdempotencyKeys() {
  await db.delete(apiIdempotencyKeys).where(lt(apiIdempotencyKeys.expiresAt, sql`now()`));
}

export async function withIdempotency(options: IdempotencyOptions) {
  const parsedKey = getIdempotencyKey(options.request);

  if (parsedKey.ok === false) {
    return parsedKey.response;
  }

  if (!parsedKey.key) {
    return (
      (await options.handler()) ??
      jsonError('server_error', 'Idempotent request completed without a response.', 500)
    );
  }

  await clearExpiredIdempotencyKeys();

  const hash = buildIdempotencyRequestHash(options.routeScope, options.fingerprint);
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);

  const [inserted] = await db
    .insert(apiIdempotencyKeys)
    .values({
      userId: options.userId,
      requestKey: parsedKey.key,
      routeScope: options.routeScope,
      requestHash: hash,
      expiresAt,
    })
    .onConflictDoNothing()
    .returning();

  if (!inserted) {
    const existing = await db.query.apiIdempotencyKeys.findFirst({
      where: and(
        eq(apiIdempotencyKeys.userId, options.userId),
        eq(apiIdempotencyKeys.requestKey, parsedKey.key),
        eq(apiIdempotencyKeys.routeScope, options.routeScope),
      ),
    });

    if (!existing) {
      return jsonError(
        'conflict',
        'Idempotency state could not be resolved. Retry with a new key.',
        409,
      );
    }

    if (existing.requestHash !== hash) {
      return jsonError(
        'conflict',
        'Idempotency key was already used for a different request payload.',
        409,
      );
    }

    if (existing.status === 'completed' && existing.responseBody && existing.responseStatus) {
      return NextResponse.json(existing.responseBody, {
        status: existing.responseStatus,
        headers: { 'x-idempotency-replayed': 'true' },
      });
    }

    return jsonError(
      'conflict',
      'A request with this idempotency key is still processing. Retry shortly or use a new key.',
      409,
    );
  }

  const response =
    (await options.handler()) ??
    jsonError('server_error', 'Idempotent request completed without a response.', 500);
  const responseBody = await response
    .clone()
    .json()
    .catch(() => null);

  if (response.status >= 200 && response.status < 300 && responseBody) {
    await db
      .update(apiIdempotencyKeys)
      .set({
        status: 'completed',
        responseStatus: response.status,
        responseBody,
        completedAt: sql`now()`,
      })
      .where(eq(apiIdempotencyKeys.id, inserted.id));
  } else {
    await db.delete(apiIdempotencyKeys).where(eq(apiIdempotencyKeys.id, inserted.id));
  }

  response.headers.set('x-idempotency-replayed', 'false');
  return response;
}
