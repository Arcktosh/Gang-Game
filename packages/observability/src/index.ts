export type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error';
export type AlertSeverity = 'warning' | 'critical';

export type TelemetryEvent = {
  timestamp: string;
  level: TelemetryLevel;
  service: string;
  event: string;
  message?: string;
  requestId?: string;
  correlationId?: string;
  durationMs?: number;
  context?: Record<string, unknown>;
};

export type TelemetryAlert = {
  timestamp: string;
  service: string;
  alert: string;
  severity: AlertSeverity;
  summary: string;
  requestId?: string;
  context?: Record<string, unknown>;
};

export type TelemetryTransport = {
  sendEvent(event: TelemetryEvent): Promise<void> | void;
  sendAlert(alert: TelemetryAlert): Promise<void> | void;
};

export type TelemetryOptions = {
  service: string;
  transport?: TelemetryTransport | null;
  environment?: string;
  release?: string;
  now?: () => Date;
  console?: Pick<Console, 'log' | 'warn' | 'error'>;
};

const SENSITIVE_KEY_PATTERN = /(?:password|passwd|secret|token|authorization|cookie|session|api[-_]?key|private[-_]?key|message|body|content|email|ip(?:address)?|credit|card|cvv)/i;
const MAX_DEPTH = 8;
const MAX_STRING_LENGTH = 2_000;

export function redactTelemetryValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > MAX_DEPTH) return '[truncated]';
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]` : value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name || 'Error',
      message: value.message || 'Unhandled error',
      stack: process.env.NODE_ENV === 'production' ? undefined : value.stack,
    };
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactTelemetryValue(item, depth + 1, seen));
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redactTelemetryValue(entry, depth + 1, seen);
  }
  return output;
}

function safeContext(context?: Record<string, unknown>) {
  return context ? (redactTelemetryValue(context) as Record<string, unknown>) : undefined;
}

function writeConsole(level: TelemetryLevel, line: string, logger: Pick<Console, 'log' | 'warn' | 'error'>) {
  if (level === 'error') return logger.error(line);
  if (level === 'warn') return logger.warn(line);
  return logger.log(line);
}

export function createHttpTelemetryTransport(options: {
  endpoint?: string | null;
  alertEndpoint?: string | null;
  apiKey?: string | null;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): TelemetryTransport | null {
  const endpoint = options.endpoint?.trim();
  const alertEndpoint = options.alertEndpoint?.trim() || endpoint;
  if (!endpoint && !alertEndpoint) return null;

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = Math.max(250, options.timeoutMs ?? 2_000);

  async function post(url: string | undefined, payload: unknown) {
    if (!url || !fetchImpl) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    timeout.unref?.();
    try {
      await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    sendEvent: (event) => post(endpoint, event),
    sendAlert: (alert) => post(alertEndpoint, alert),
  };
}

export function createTelemetry(options: TelemetryOptions) {
  const logger = options.console ?? console;
  const now = options.now ?? (() => new Date());

  function enrich<T extends TelemetryEvent | TelemetryAlert>(payload: T): T & { environment?: string; release?: string } {
    return {
      ...payload,
      ...(options.environment ? { environment: options.environment } : {}),
      ...(options.release ? { release: options.release } : {}),
    };
  }

  function event(level: TelemetryLevel, name: string, details: Omit<Partial<TelemetryEvent>, 'level' | 'service' | 'event' | 'timestamp'> = {}) {
    const payload = enrich({
      timestamp: now().toISOString(),
      level,
      service: options.service,
      event: name,
      ...details,
      context: safeContext(details.context),
    } satisfies TelemetryEvent);
    writeConsole(level, JSON.stringify(payload), logger);
    if (options.transport) void Promise.resolve(options.transport.sendEvent(payload)).catch((error) => {
      logger.warn(JSON.stringify({ timestamp: now().toISOString(), level: 'warn', service: options.service, event: 'telemetry.transport_failed', error: redactTelemetryValue(error) }));
    });
    return payload;
  }

  function alert(severity: AlertSeverity, name: string, summary: string, details: Pick<TelemetryAlert, 'requestId' | 'context'> = {}) {
    const payload = enrich({
      timestamp: now().toISOString(),
      service: options.service,
      alert: name,
      severity,
      summary,
      ...details,
      context: safeContext(details.context),
    } satisfies TelemetryAlert);
    writeConsole(severity === 'critical' ? 'error' : 'warn', JSON.stringify(payload), logger);
    if (options.transport) void Promise.resolve(options.transport.sendAlert(payload)).catch((error) => {
      logger.warn(JSON.stringify({ timestamp: now().toISOString(), level: 'warn', service: options.service, event: 'telemetry.alert_transport_failed', error: redactTelemetryValue(error) }));
    });
    return payload;
  }

  return {
    debug: (name: string, details?: Parameters<typeof event>[2]) => event('debug', name, details),
    info: (name: string, details?: Parameters<typeof event>[2]) => event('info', name, details),
    warn: (name: string, details?: Parameters<typeof event>[2]) => event('warn', name, details),
    error: (name: string, details?: Parameters<typeof event>[2]) => event('error', name, details),
    alert,
  };
}

export function telemetryConfigurationStatus(env: NodeJS.ProcessEnv = process.env) {
  return {
    enabled: Boolean(env.OBSERVABILITY_HTTP_ENDPOINT || env.OBSERVABILITY_ALERT_ENDPOINT),
    eventSinkConfigured: Boolean(env.OBSERVABILITY_HTTP_ENDPOINT),
    alertSinkConfigured: Boolean(env.OBSERVABILITY_ALERT_ENDPOINT || env.OBSERVABILITY_HTTP_ENDPOINT),
    releaseConfigured: Boolean(env.APP_RELEASE || env.VERCEL_GIT_COMMIT_SHA || env.GIT_COMMIT_SHA),
  };
}
