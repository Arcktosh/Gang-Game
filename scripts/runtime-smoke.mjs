#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const BASE_URL = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? DEFAULT_BASE_URL);
const TIMEOUT_MS = parsePositiveInteger(process.env.SMOKE_TIMEOUT_MS, 5000);
const STRICT_HEALTH_OK = parseBoolean(process.env.SMOKE_STRICT_HEALTH_OK, false);
const RETRIES = parseNonNegativeInteger(process.env.SMOKE_RETRIES, 0);
const RETRY_DELAY_MS = parseNonNegativeInteger(process.env.SMOKE_RETRY_DELAY_MS, 500);

const REQUIRED_SECURITY_HEADERS = [
  'content-security-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'permissions-policy',
  'referrer-policy',
  'x-content-type-options',
  'x-dns-prefetch-control',
  'x-frame-options',
];

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function endpoint(path) {
  return `${BASE_URL}${path}`;
}

function hasJsonContentType(response) {
  return response.headers.get('content-type')?.includes('application/json') ?? false;
}

function headerSnapshot(response, names) {
  return Object.fromEntries(names.map((name) => [name, response.headers.get(name)]));
}

function missingHeaders(response, names) {
  return names.filter((name) => !response.headers.has(name));
}

async function fetchWithTimeout(path, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(endpoint(path), {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  if (!hasJsonContentType(response)) {
    return null;
  }

  return response.json().catch(() => null);
}

function pass(name, details = {}) {
  return { name, ok: true, severity: 'pass', details };
}

function fail(name, message, details = {}) {
  return { name, ok: false, severity: 'error', message, details };
}

function warn(name, message, details = {}) {
  return { name, ok: true, severity: 'warning', message, details };
}

async function runStepWithRetry(step) {
  let lastResult;

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const result = await step.run();

      if (result.ok || attempt === RETRIES) {
        return { ...result, attempts: attempt + 1 };
      }

      lastResult = result;
    } catch (error) {
      lastResult = fail(step.name, error instanceof Error ? error.message : String(error));

      if (attempt === RETRIES) {
        return { ...lastResult, attempts: attempt + 1 };
      }
    }

    await delay(RETRY_DELAY_MS);
  }

  return { ...lastResult, attempts: RETRIES + 1 };
}

async function healthStep() {
  const requestId = 'smoke-health-request-id';
  const response = await fetchWithTimeout('/api/health', {
    headers: { 'x-request-id': requestId },
  });
  const body = await readJson(response);
  const missingSecurityHeaders = missingHeaders(response, REQUIRED_SECURITY_HEADERS);
  const returnedRequestId = response.headers.get('x-request-id');
  const responseTime = response.headers.get('x-response-time-ms');
  const details = {
    status: response.status,
    returnedRequestId,
    responseTime,
    securityHeaders: headerSnapshot(response, REQUIRED_SECURITY_HEADERS),
    body,
  };

  if (missingSecurityHeaders.length > 0) {
    return fail('health-security-headers', 'Health response is missing baseline security headers.', {
      ...details,
      missingSecurityHeaders,
    });
  }

  if (returnedRequestId !== requestId) {
    return fail('health-request-id', 'Health response did not preserve the supplied request id.', details);
  }

  if (!hasJsonContentType(response) || !body || typeof body !== 'object') {
    return fail('health-json-shape', 'Health response did not return a JSON object.', details);
  }

  if (response.ok) {
    const data = body.data;

    if (data?.status !== 'ok' || data?.service !== 'web-api' || !data?.runtime || !data?.environment) {
      return fail('health-success-shape', 'Healthy response is missing expected status, runtime, or environment fields.', details);
    }

    return pass('health', details);
  }

  const code = body.error?.code;

  if (!STRICT_HEALTH_OK && response.status === 500 && code === 'server_error') {
    return warn('health-degraded', 'Health endpoint is reachable but reports degraded server environment.', details);
  }

  return fail('health-status', `Health endpoint returned unexpected status ${response.status}.`, details);
}

async function authMeStep() {
  const response = await fetchWithTimeout('/api/auth/me', {
    headers: { 'x-request-id': 'smoke-auth-me-request-id' },
  });
  const body = await readJson(response);
  const details = {
    status: response.status,
    returnedRequestId: response.headers.get('x-request-id'),
    securityHeaders: headerSnapshot(response, REQUIRED_SECURITY_HEADERS),
    body,
  };

  if (missingHeaders(response, REQUIRED_SECURITY_HEADERS).length > 0) {
    return fail('auth-me-security-headers', 'Auth me response is missing baseline security headers.', details);
  }

  if (response.status !== 401) {
    return fail('auth-me-unauthorized', 'Unauthenticated /api/auth/me should return 401.', details);
  }

  if (body?.error?.code !== 'unauthorized') {
    return fail('auth-me-error-shape', 'Unauthenticated /api/auth/me should return the standard unauthorized error shape.', details);
  }

  return pass('auth-me-unauthorized', details);
}

async function crossOriginMutationStep() {
  const response = await fetchWithTimeout('/api/auth/logout', {
    method: 'POST',
    headers: {
      origin: 'https://evil.example',
      'content-type': 'application/json',
      'x-request-id': 'smoke-cross-origin-request-id',
    },
    body: '{}',
  });
  const body = await readJson(response);
  const details = {
    status: response.status,
    returnedRequestId: response.headers.get('x-request-id'),
    originCheck: response.headers.get('x-origin-check'),
    securityHeaders: headerSnapshot(response, REQUIRED_SECURITY_HEADERS),
    body,
  };

  if (missingHeaders(response, REQUIRED_SECURITY_HEADERS).length > 0) {
    return fail('cross-origin-security-headers', 'Cross-origin rejection response is missing baseline security headers.', details);
  }

  if (response.status !== 403) {
    return fail('cross-origin-rejection', 'Cross-origin unsafe mutation should be rejected with 403.', details);
  }

  if (body?.error?.code !== 'forbidden') {
    return fail('cross-origin-error-shape', 'Cross-origin rejection should use the standard forbidden error shape.', details);
  }

  return pass('cross-origin-rejection', details);
}

async function standardNotFoundStep() {
  const response = await fetchWithTimeout('/api/__smoke_missing_route__', {
    headers: { 'x-request-id': 'smoke-missing-route-request-id' },
  });
  const details = {
    status: response.status,
    returnedRequestId: response.headers.get('x-request-id'),
    securityHeaders: headerSnapshot(response, REQUIRED_SECURITY_HEADERS),
  };

  if (missingHeaders(response, REQUIRED_SECURITY_HEADERS).length > 0) {
    return fail('not-found-security-headers', '404 response is missing baseline security headers.', details);
  }

  if (!response.headers.get('x-request-id')) {
    return fail('not-found-request-id', '404 response is missing request id propagation.', details);
  }

  return pass('not-found-middleware-headers', details);
}

async function main() {
  const startedAt = new Date();
  const steps = [
    { name: 'health', run: healthStep },
    { name: 'auth-me-unauthorized', run: authMeStep },
    { name: 'cross-origin-rejection', run: crossOriginMutationStep },
    { name: 'not-found-middleware-headers', run: standardNotFoundStep },
  ];

  const results = [];

  for (const step of steps) {
    results.push(await runStepWithRetry(step));
  }

  const errors = results.filter((result) => !result.ok);
  const warnings = results.filter((result) => result.severity === 'warning');
  const summary = {
    checkedAt: startedAt.toISOString(),
    baseUrl: BASE_URL,
    timeoutMs: TIMEOUT_MS,
    retries: RETRIES,
    strictHealthOk: STRICT_HEALTH_OK,
    total: results.length,
    passed: results.filter((result) => result.severity === 'pass').length,
    warnings: warnings.length,
    errors: errors.length,
    ok: errors.length === 0,
  };

  console.log(JSON.stringify({ summary, results }, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    summary: {
      checkedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      timeoutMs: TIMEOUT_MS,
      ok: false,
      errors: 1,
    },
    results: [fail('runtime-smoke', error instanceof Error ? error.message : String(error))],
  }, null, 2));
  process.exitCode = 1;
});
