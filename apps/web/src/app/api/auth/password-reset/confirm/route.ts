import { resetPasswordWithToken } from '@drugdeal/db';
import { resetPasswordSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { hashOneTimeAccountToken } from '@/lib/auth';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { hashPassword } from '@/lib/password';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'auth:password-reset-confirm'),
      windowSeconds: 300,
      maxRequests: 10,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, resetPasswordSchema);

    if (!body.ok) {
      return body.response;
    }

    const passwordHash = await hashPassword(body.data.password);
    const user = await resetPasswordWithToken({
      tokenHash: hashOneTimeAccountToken(body.data.token),
      passwordHash,
    });

    if (!user) {
      return jsonError('bad_request', 'The reset link is invalid or has expired.', 400);
    }

    return jsonOk({
      message: 'Password reset complete. Please sign in with your new password.',
      user,
    });
  });
}
