import { NextRequest, NextResponse } from 'next/server';
import { clearSessionFromRequest } from '@/lib/auth';
import { jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const limit = await assertRateLimit({ key: rateLimitKey(request, 'auth:logout'), windowSeconds: 60, maxRequests: 20 });

    if (!limit.ok) {
      return limit.response;
    }
    const response = jsonOk({ loggedOut: true });
    return clearSessionFromRequest(request, response as NextResponse);
  });
}
