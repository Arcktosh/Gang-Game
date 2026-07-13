import { createHttpTelemetryTransport, createTelemetry, telemetryConfigurationStatus } from '@drugdeal/observability';

const transport = createHttpTelemetryTransport({
  endpoint: process.env.OBSERVABILITY_HTTP_ENDPOINT,
  alertEndpoint: process.env.OBSERVABILITY_ALERT_ENDPOINT,
  apiKey: process.env.OBSERVABILITY_API_KEY,
  timeoutMs: Number(process.env.OBSERVABILITY_TIMEOUT_MS) || 2_000,
});

export const workerTelemetry = createTelemetry({
  service: 'worker',
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.APP_RELEASE ?? process.env.GIT_COMMIT_SHA,
  transport,
});

export function workerRuntimeDiagnostics() {
  const memory = process.memoryUsage();
  return {
    pid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    observability: telemetryConfigurationStatus(),
    memory: {
      rssBytes: memory.rss,
      heapTotalBytes: memory.heapTotal,
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external,
    },
  };
}
