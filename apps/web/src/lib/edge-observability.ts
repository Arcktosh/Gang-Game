import type { NextRequest } from 'next/server';

export type RequestContext = {
  requestId: string;
  method: string;
  pathname: string;
  startedAt: number;
};

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function normalizeRequestId(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !REQUEST_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function createRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getRequestIdFromHeaders(headers: Headers) {
  return (
    normalizeRequestId(headers.get(REQUEST_ID_HEADER)) ??
    normalizeRequestId(headers.get(CORRELATION_ID_HEADER))
  );
}

export function getOrCreateRequestId(request: Pick<NextRequest, 'headers'>) {
  return getRequestIdFromHeaders(request.headers) ?? createRequestId();
}

export function requestContext(request: NextRequest): RequestContext {
  return {
    requestId: getOrCreateRequestId(request),
    method: request.method.toUpperCase(),
    pathname: request.nextUrl.pathname,
    startedAt: Date.now(),
  };
}

export function attachRequestId<T extends Response>(response: T, requestId: string) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export function requestMetadata(context: Pick<RequestContext, 'requestId' | 'startedAt'>) {
  return {
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    durationMs: Math.max(0, Date.now() - context.startedAt),
  };
}
