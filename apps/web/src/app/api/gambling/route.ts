import { getGamblingSummary, listGamblingGames, placeGamblingWager } from '@drugdeal/db';
import { gamblingWagerSchema, uuidSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { requireFeatureEnabled } from '@/lib/feature-flags';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';

const gamblingQuerySchema = z.object({
  characterId: uuidSchema.optional(),
});

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:gambling', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = gamblingQuerySchema.safeParse({ characterId: request.nextUrl.searchParams.get('characterId') ?? undefined });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid gambling query.', 400, query.error.flatten());
    }

    const games = await listGamblingGames();
    const summary = query.data.characterId ? await getGamblingSummary(query.data.characterId, auth.userId) : null;

    if (query.data.characterId && !summary) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk({ games, summary });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'actions:gambling', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const feature = await requireFeatureEnabled('feature.gambling');

    if (!feature.ok) {
      return feature.response;
    }

    const body = await parseJsonBody(request, gamblingWagerSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'gambling:wager',
      fingerprint: body.data,
      handler: async () => {
        const result = await placeGamblingWager({ ...body.data, userId: auth.userId });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
