import { serverEnvSchema } from '@drugdeal/validators';

let cachedEnv: ReturnType<typeof serverEnvSchema.parse> | null = null;

export function getServerEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid server environment: ${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEnvironmentStatus() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  return {
    ok: true,
    environment: parsed.data.NODE_ENV,
    appName: parsed.data.NEXT_PUBLIC_APP_NAME,
    redisConfigured: Boolean(parsed.data.REDIS_URL),
    rateLimitRedisConfigured: Boolean(parsed.data.RATE_LIMIT_REDIS_URL || parsed.data.REDIS_URL),
    appOriginConfigured: Boolean(parsed.data.APP_ORIGIN),
    publicAppUrlConfigured: Boolean(parsed.data.NEXT_PUBLIC_APP_URL),
    trustedOriginsConfigured: Boolean(parsed.data.TRUSTED_ORIGINS),
    messageRetentionDays: parsed.data.MESSAGE_RETENTION_DAYS ?? 365,
    anomalyScanConfigured: Boolean(parsed.data.ANOMALY_SCAN_TICK_MS || parsed.data.ANOMALY_HIGH_NET_WORTH),
  };
}
