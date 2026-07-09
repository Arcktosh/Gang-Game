import { createEmailVerificationToken, findUserByEmail } from '@drugdeal/db';
import { requestEmailVerificationSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { createOneTimeAccountToken, hashOneTimeAccountToken } from '@/lib/auth';
import { jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'auth:email-verification-request'),
      windowSeconds: 300,
      maxRequests: 5,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, requestEmailVerificationSchema);

    if (!body.ok) {
      return body.response;
    }

    const user = await findUserByEmail(body.data.email);
    let verificationUrl: string | null = null;

    if (user && !user.emailVerifiedAt) {
      const token = createOneTimeAccountToken();
      await createEmailVerificationToken({
        userId: user.id,
        tokenHash: hashOneTimeAccountToken(token),
        requestedIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        requestedUserAgent: request.headers.get('user-agent'),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      });
      verificationUrl = `/verify-email?token=${encodeURIComponent(token)}`;
    }

    return jsonOk({
      message:
        'If verification is needed for that email address, a verification link has been prepared.',
      verificationUrl: process.env.NODE_ENV === 'production' ? null : verificationUrl,
    });
  });
}
