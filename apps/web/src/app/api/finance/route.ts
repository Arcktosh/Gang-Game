import { listAssetOrders, listCharacterPortfolio, listFinanceMarket, tradeAsset } from '@drugdeal/db';
import { financeTradeSchema, uuidSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const portfolioQuerySchema = z.object({
  characterId: uuidSchema.optional(),
});

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:finance', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = portfolioQuerySchema.safeParse({ characterId: request.nextUrl.searchParams.get('characterId') ?? undefined });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid finance query.', 400, query.error.flatten());
    }

    const market = await listFinanceMarket();
    const portfolio = query.data.characterId ? await listCharacterPortfolio(query.data.characterId, auth.userId) : [];
    const orders = query.data.characterId ? await listAssetOrders(query.data.characterId, auth.userId, 10) : [];

    if (query.data.characterId && portfolio === null) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk({ market, portfolio, orders: orders ?? [] });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:finance', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, financeTradeSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'finance:trade',
      fingerprint: body.data,
      handler: async () => {
        const result = await tradeAsset({ ...body.data, userId: auth.userId });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : result.code === 'conflict' ? 409 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
