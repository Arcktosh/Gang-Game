import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders, evaluateMutationOrigin, SAFE_HTTP_METHODS } from './lib/security';
import { attachRequestId, getOrCreateRequestId } from './lib/edge-observability';

function jsonSecurityError(message: string, status = 403) {
  return NextResponse.json({ error: { code: 'forbidden', message } }, { status });
}

export function proxy(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);

  if (request.nextUrl.pathname.startsWith('/api/') && !SAFE_HTTP_METHODS.has(request.method.toUpperCase())) {
    const decision = evaluateMutationOrigin(request);

    if (!decision.allowed) {
      const response = jsonSecurityError('Cross-origin mutation requests are not allowed.');
      response.headers.set('x-origin-check', decision.reason);
      attachRequestId(response, requestId);
      return applySecurityHeaders(response);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  attachRequestId(response, requestId);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
