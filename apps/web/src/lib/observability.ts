import type { NextRequest } from 'next/server';
import { jsonError } from './api';
import { attachRequestId, requestContext, requestMetadata } from './edge-observability';
import type { RequestContext } from './edge-observability';

export { attachRequestId, createRequestId, getOrCreateRequestId, getRequestIdFromHeaders, normalizeRequestId, requestContext, requestMetadata } from './edge-observability';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function logEvent(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    service: 'web-api',
    timestamp: new Date().toISOString(),
    ...context,
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function redactError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: process.env.NODE_ENV === 'production' ? 'Unhandled server error.' : error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: 'Unhandled server error.',
  };
}

export async function withApiObservability(
  request: NextRequest,
  handler: (context: RequestContext) => Promise<Response | undefined> | Response | undefined,
) {
  const context = requestContext(request);

  try {
    const response = await handler(context) ?? jsonError('server_error', 'API route completed without a response.', 500, undefined, requestMetadata(context));
    attachRequestId(response, context.requestId);
    response.headers.set('x-response-time-ms', String(Math.max(0, Date.now() - context.startedAt)));
    return response;
  } catch (error) {
    const safeError = redactError(error);

    logEvent('error', 'Unhandled API route error.', {
      requestId: context.requestId,
      method: context.method,
      pathname: context.pathname,
      durationMs: Math.max(0, Date.now() - context.startedAt),
      error: safeError,
    });

    const response = jsonError('server_error', 'Unexpected server error.', 500, undefined, requestMetadata(context));
    attachRequestId(response, context.requestId);
    response.headers.set('x-response-time-ms', String(Math.max(0, Date.now() - context.startedAt)));
    return response;
  }
}

export function runtimeDiagnostics() {
  const memory = process.memoryUsage?.();

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    uptimeSeconds: Math.round(process.uptime?.() ?? 0),
    pid: process.pid,
    platform: process.platform,
    nodeVersion: process.version,
    memory: memory
      ? {
          rssBytes: memory.rss,
          heapTotalBytes: memory.heapTotal,
          heapUsedBytes: memory.heapUsed,
          externalBytes: memory.external,
        }
      : null,
  };
}
