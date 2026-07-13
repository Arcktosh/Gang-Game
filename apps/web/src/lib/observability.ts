import type { NextRequest } from 'next/server';
import {
  createHttpTelemetryTransport,
  createTelemetry,
  redactTelemetryValue,
  telemetryConfigurationStatus,
} from '@drugdeal/observability';
import { jsonError } from './api';
import { attachRequestId, requestContext, requestMetadata } from './edge-observability';
import type { RequestContext } from './edge-observability';

export { attachRequestId, createRequestId, getOrCreateRequestId, getRequestIdFromHeaders, normalizeRequestId, requestContext, requestMetadata } from './edge-observability';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const transport = createHttpTelemetryTransport({
  endpoint: process.env.OBSERVABILITY_HTTP_ENDPOINT,
  alertEndpoint: process.env.OBSERVABILITY_ALERT_ENDPOINT,
  apiKey: process.env.OBSERVABILITY_API_KEY,
  timeoutMs: Number(process.env.OBSERVABILITY_TIMEOUT_MS) || 2_000,
});

export const telemetry = createTelemetry({
  service: 'web-api',
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.APP_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA,
  transport,
});

export function logEvent(level: LogLevel, message: string, context?: Record<string, unknown>) {
  return telemetry[level](message, { context });
}

export type RedactedError = {
  name: string;
  message: string;
  stack?: string;
};

export function redactError(error: unknown): RedactedError {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: process.env.NODE_ENV === 'production' ? 'Unhandled server error.' : error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }

  const redacted = redactTelemetryValue(error);
  return {
    name: 'UnknownError',
    message: process.env.NODE_ENV === 'production' ? 'Unhandled server error.' : String(redacted ?? 'Unhandled server error.'),
  };
}


export async function withApiObservability(
  request: NextRequest,
  handler: (context: RequestContext) => Promise<Response | undefined> | Response | undefined,
) {
  const context = requestContext(request);

  try {
    const response = await handler(context) ?? jsonError('server_error', 'API route completed without a response.', 500, undefined, requestMetadata(context));
    const durationMs = Math.max(0, Date.now() - context.startedAt);
    attachRequestId(response, context.requestId);
    response.headers.set('x-response-time-ms', String(durationMs));

    telemetry.info('api.request.completed', {
      requestId: context.requestId,
      durationMs,
      context: {
        method: context.method,
        pathname: context.pathname,
        status: response.status,
      },
    });

    if (response.status >= 500) {
      telemetry.alert('critical', 'api.server_error', 'An API request returned a server error.', {
        requestId: context.requestId,
        context: { method: context.method, pathname: context.pathname, status: response.status, durationMs },
      });
    }

    return response;
  } catch (error) {
    const durationMs = Math.max(0, Date.now() - context.startedAt);
    const safeError = redactError(error);

    telemetry.error('api.request.unhandled_error', {
      requestId: context.requestId,
      durationMs,
      context: {
        method: context.method,
        pathname: context.pathname,
        error: safeError,
      },
    });
    telemetry.alert('critical', 'api.unhandled_error', 'An API route threw an unhandled error.', {
      requestId: context.requestId,
      context: { method: context.method, pathname: context.pathname, durationMs, error: safeError },
    });

    const response = jsonError('server_error', 'Unexpected server error.', 500, undefined, requestMetadata(context));
    attachRequestId(response, context.requestId);
    response.headers.set('x-response-time-ms', String(durationMs));
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
    observability: telemetryConfigurationStatus(),
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
