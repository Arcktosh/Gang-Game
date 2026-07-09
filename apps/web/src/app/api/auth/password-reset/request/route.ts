import { createPasswordResetToken, findUserByEmail } from '@drugdeal/db';
import { requestPasswordResetSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { createOneTimeAccountToken, hashOneTimeAccountToken } from '@/lib/auth';
import { jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'auth:password-reset-request'),
      windowSeconds: 300,
      maxRequests: 5,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, requestPasswordResetSchema);

    if (!body.ok) {
      return body.response;
    }

    const user = await findUserByEmail(body.data.email);
    let resetUrl: string | null = null;

    if (user) {
      const token = createOneTimeAccountToken();
      await createPasswordResetToken({
        userId: user.id,
        tokenHash: hashOneTimeAccountToken(token),
        requestedIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        requestedUserAgent: request.headers.get('user-agent'),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      });
      resetUrl = `/reset-password?token=${encodeURIComponent(token)}`;
    }

    return jsonOk({
      message:
        'If an account exists for that email address, a password reset link has been prepared.',
      resetUrl: process.env.NODE_ENV === 'production' ? null : resetUrl,
    });
  });
}
