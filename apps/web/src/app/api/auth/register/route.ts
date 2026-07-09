import { createEmailVerificationToken, createUser, findUserByEmail } from '@drugdeal/db';
import { registerSchema } from '@drugdeal/validators';
import { NextRequest, NextResponse } from 'next/server';
import {
  createOneTimeAccountToken,
  createSessionResponse,
  hashOneTimeAccountToken,
} from '@/lib/auth';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { hashPassword } from '@/lib/password';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'auth:register'),
      windowSeconds: 300,
      maxRequests: 5,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, registerSchema);

    if (!body.ok) {
      return body.response;
    }

    const existingUser = await findUserByEmail(body.data.email);

    if (existingUser) {
      return jsonError('conflict', 'An account already exists for this email address.', 409);
    }

    const passwordHash = await hashPassword(body.data.password);
    const user = await createUser({
      email: body.data.email,
      passwordHash,
      displayName: body.data.displayName,
    });

    const verificationToken = createOneTimeAccountToken();
    await createEmailVerificationToken({
      userId: user.id,
      tokenHash: hashOneTimeAccountToken(verificationToken),
      requestedIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      requestedUserAgent: request.headers.get('user-agent'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    const response = NextResponse.json(
      {
        data: {
          user,
          verificationUrl:
            process.env.NODE_ENV === 'production'
              ? null
              : `/verify-email?token=${encodeURIComponent(verificationToken)}`,
        },
      },
      { status: 201 },
    );
    return createSessionResponse({ request, userId: user.id, response });
  });
}
