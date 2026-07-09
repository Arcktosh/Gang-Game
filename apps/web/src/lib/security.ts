import { NextRequest, NextResponse } from 'next/server';

export const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type OriginDecision = {
  allowed: boolean;
  reason: 'safe_method' | 'same_origin' | 'trusted_origin' | 'missing_origin' | 'untrusted_origin';
  origin: string | null;
  trustedOrigins: string[];
};

export function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function parseTrustedOrigins(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const origins = new Set<string>();

  for (const candidate of value.split(',')) {
    const normalized = normalizeOrigin(candidate.trim());

    if (normalized) {
      origins.add(normalized);
    }
  }

  return [...origins].sort();
}

export function getRequestOrigin(request: NextRequest) {
  const origin = normalizeOrigin(request.headers.get('origin'));

  if (origin) {
    return origin;
  }

  return normalizeOrigin(request.headers.get('referer'));
}

export function getTrustedOrigins(request: NextRequest) {
  const trusted = new Set<string>();
  const requestOrigin = normalizeOrigin(request.nextUrl.origin);
  const appOrigin = normalizeOrigin(process.env.APP_ORIGIN);
  const publicAppOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);

  if (requestOrigin) {
    trusted.add(requestOrigin);
  }

  if (appOrigin) {
    trusted.add(appOrigin);
  }

  if (publicAppOrigin) {
    trusted.add(publicAppOrigin);
  }

  for (const origin of parseTrustedOrigins(process.env.TRUSTED_ORIGINS)) {
    trusted.add(origin);
  }

  return [...trusted].sort();
}

export function evaluateMutationOrigin(request: NextRequest): OriginDecision {
  const trustedOrigins = getTrustedOrigins(request);

  if (SAFE_HTTP_METHODS.has(request.method.toUpperCase())) {
    return {
      allowed: true,
      reason: 'safe_method',
      origin: getRequestOrigin(request),
      trustedOrigins,
    };
  }

  const origin = getRequestOrigin(request);

  if (!origin) {
    return {
      allowed: process.env.NODE_ENV !== 'production',
      reason: 'missing_origin',
      origin,
      trustedOrigins,
    };
  }

  if (origin === normalizeOrigin(request.nextUrl.origin)) {
    return { allowed: true, reason: 'same_origin', origin, trustedOrigins };
  }

  if (trustedOrigins.includes(origin)) {
    return { allowed: true, reason: 'trusted_origin', origin, trustedOrigins };
  }

  return { allowed: false, reason: 'untrusted_origin', origin, trustedOrigins };
}

export function securityHeaders() {
  const isProduction = process.env.NODE_ENV === 'production';
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    isProduction ? 'upgrade-insecure-requests' : '',
  ]
    .filter(Boolean)
    .join('; ');

  const headers: Record<string, string> = {
    'Content-Security-Policy': csp,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-DNS-Prefetch-Control': 'off',
    'X-Frame-Options': 'DENY',
  };

  if (isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}

export function applySecurityHeaders(response: NextResponse) {
  for (const [name, value] of Object.entries(securityHeaders())) {
    response.headers.set(name, value);
  }

  return response;
}
