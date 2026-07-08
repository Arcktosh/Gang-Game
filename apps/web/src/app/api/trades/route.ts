import { createPlayerTradeOffer, listPlayerTradeCenter } from '@drugdeal/db';
import { createPlayerTradeOfferSchema, tradeCenterQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:trades', auth.userId), windowSeconds: 60, maxRequests: 60 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = tradeCenterQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId') ?? undefined,
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid trade query.', 400, query.error.flatten());
    }

    const result = await listPlayerTradeCenter({ userId: auth.userId, characterId: query.data.characterId });

    if (!result.ok) {
      return jsonError(result.code, result.message, result.code === 'not_found' ? 404 : 403);
    }

    return jsonOk(result.data);
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'actions:trades', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, createPlayerTradeOfferSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'trades:create',
      fingerprint: body.data,
      handler: async () => {
        const result = await createPlayerTradeOffer({ ...body.data, userId: auth.userId });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
