import { declareFactionWar, getPvpProfile } from '@drugdeal/db';
import { declareFactionWarSchema, pvpProfileQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:faction-wars', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const query = pvpProfileQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId'),
    });

    if (!query.success) {
      return jsonError('bad_request', 'Invalid war query.', 400, query.error.flatten());
    }

    const result = await getPvpProfile({
      userId: auth.userId,
      characterId: query.data.characterId,
    });

    if (!result) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk({ activeWars: result.activeWars });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:faction-wars', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, declareFactionWarSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await declareFactionWar({ ...body.data, userId: auth.userId });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk(result.data, { status: 201 });
  });
}
