import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { paginationQuerySchema, publicPaginationQuerySchema } from '@drugdeal/validators';
import { getSessionFromRequest } from './auth';

export const API_ERROR_CODES = [
  'bad_request',
  'invalid_query',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'server_error',
  'cooldown_active',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export function normalizeApiErrorCode(code: ApiErrorCode | string): ApiErrorCode {
  return (API_ERROR_CODES as readonly string[]).includes(code)
    ? (code as ApiErrorCode)
    : 'server_error';
}

export type Pagination = {
  limit: number;
  offset: number;
};

export type ApiResponseMeta = {
  requestId?: string;
  timestamp?: string;
  durationMs?: number;
};

export function jsonOk<T>(data: T, init?: ResponseInit, meta?: ApiResponseMeta) {
  return NextResponse.json(meta ? { data, meta } : { data }, init);
}

export function jsonError(
  code: ApiErrorCode | string,
  message: string,
  status = 400,
  details?: unknown,
  meta?: ApiResponseMeta,
) {
  return NextResponse.json(
    {
      error: { code: normalizeApiErrorCode(code), message, details },
      ...(meta ? { meta } : {}),
    },
    { status },
  );
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false as const,
      response: jsonError('bad_request', 'Invalid request body.', 400, parsed.error.flatten()),
    };
  }

  return { ok: true as const, data: parsed.data as z.infer<TSchema> };
}

export function parsePaginationSearchParams(
  searchParams: URLSearchParams,
  mode: 'public' | 'admin' = 'public',
) {
  const schema = mode === 'admin' ? paginationQuerySchema : publicPaginationQuerySchema;
  return schema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });
}

export function parsePagination(request: NextRequest, mode: 'public' | 'admin' = 'public') {
  const parsed = parsePaginationSearchParams(request.nextUrl.searchParams, mode);

  if (!parsed.success) {
    return {
      ok: false as const,
      response: jsonError('bad_request', 'Invalid pagination query.', 400, parsed.error.flatten()),
    };
  }

  return { ok: true as const, pagination: parsed.data };
}

export function paginationMeta({ limit, offset, count }: Pagination & { count: number }) {
  return {
    limit,
    offset,
    count,
    nextOffset: count === limit ? offset + limit : null,
    previousOffset: offset > 0 ? Math.max(0, offset - limit) : null,
  };
}

export async function getRequestUserId(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (session) {
    return session.user.id;
  }

  if (process.env.NODE_ENV !== 'production') {
    return request.headers.get('x-user-id');
  }

  return null;
}

export async function requireRequestUserId(request: NextRequest) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return { ok: false as const, response: jsonError('unauthorized', 'Login required.', 401) };
  }

  return { ok: true as const, userId };
}
