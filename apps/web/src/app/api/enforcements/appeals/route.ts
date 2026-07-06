import { submitEnforcementAppeal } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const appealSchema = z.object({
  characterId: z.string().uuid(),
  enforcementId: z.string().uuid(),
  body: z.string().trim().min(10).max(1000),
});

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:enforcements:appeals', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, appealSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'enforcements:appeals:create',
      fingerprint: body.data,
      handler: async () => {
        try {
          const result = await submitEnforcementAppeal({ userId: auth.userId, ...body.data });
          return jsonOk(result, { status: 201 });
        } catch (caught) {
          return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not submit appeal.', 400);
        }
      },
    });
  });
}
