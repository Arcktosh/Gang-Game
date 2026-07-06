import { createShop, hasActiveCharacterRestriction, listShops } from '@drugdeal/db';
import { createShopSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, paginationMeta, parseJsonBody, parsePagination, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const pagination = parsePagination(request);

    if (!pagination.ok) {
      return pagination.response;
    }

    const location = request.nextUrl.searchParams.get('location');
    const shops = await listShops(location, pagination.pagination);
    return jsonOk({ shops, pagination: paginationMeta({ ...pagination.pagination, count: shops.length }) });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'shops:create', auth.userId), windowSeconds: 60, maxRequests: 10 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, createShopSchema);

    if (!body.ok) {
      return body.response;
    }

    const restriction = await hasActiveCharacterRestriction({ characterId: body.data.characterId, actionType: 'shop_restriction' });

    if (restriction) {
      return jsonError('forbidden', 'This character is temporarily restricted from shop operations.', 403);
    }

    const result = await createShop({ ...body.data, userId: auth.userId });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk({ shop: result.shop }, { status: 201 });
  });
}
