import { buyMarketItem, listMarketForLocation, sellMarketItem } from '@drugdeal/db';
import { marketActionSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const location = request.nextUrl.searchParams.get('location') ?? 'starter-city';
    const market = await listMarketForLocation(location);
    return jsonOk({ location, market });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'actions:market', auth.userId), windowSeconds: 60, maxRequests: 60 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, marketActionSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'market:action',
      fingerprint: body.data,
      handler: async () => {
        const result = body.data.action === 'buy'
          ? await buyMarketItem({ ...body.data, userId: auth.userId })
          : await sellMarketItem({ ...body.data, userId: auth.userId });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
