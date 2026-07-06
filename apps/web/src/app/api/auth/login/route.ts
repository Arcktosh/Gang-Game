import { findUserByEmail } from '@drugdeal/db';
import { loginSchema } from '@drugdeal/validators';
import { NextRequest, NextResponse } from 'next/server';
import { createSessionResponse } from '@/lib/auth';
import { jsonError, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { verifyPassword } from '@/lib/password';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const limit = await assertRateLimit({ key: rateLimitKey(request, 'auth:login'), windowSeconds: 60, maxRequests: 10 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, loginSchema);

    if (!body.ok) {
      return body.response;
    }

    const userRecord = await findUserByEmail(body.data.email);

    if (!userRecord) {
      return jsonError('unauthorized', 'Invalid email or password.', 401);
    }

    const passwordValid = await verifyPassword(body.data.password, userRecord.passwordHash);

    if (!passwordValid) {
      return jsonError('unauthorized', 'Invalid email or password.', 401);
    }

    const user = {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.displayName,
      isAdmin: userRecord.isAdmin,
      emailVerifiedAt: userRecord.emailVerifiedAt,
      createdAt: userRecord.createdAt,
    };
    const response = NextResponse.json({ data: { user } });
    return createSessionResponse({ request, userId: user.id, response });
  });
}
