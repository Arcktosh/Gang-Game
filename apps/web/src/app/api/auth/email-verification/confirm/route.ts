import { verifyEmailWithToken } from '@drugdeal/db';
import { verifyEmailSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { hashOneTimeAccountToken } from '@/lib/auth';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'auth:email-verification-confirm'),
      windowSeconds: 300,
      maxRequests: 10,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, verifyEmailSchema);

    if (!body.ok) {
      return body.response;
    }

    const user = await verifyEmailWithToken(hashOneTimeAccountToken(body.data.token));

    if (!user) {
      return jsonError('bad_request', 'The verification link is invalid or has expired.', 400);
    }

    return jsonOk({ message: 'Email verified successfully.', user });
  });
}
