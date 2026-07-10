import { buyShopAdvertisement, cancelShopListing, hasActiveCharacterRestriction, reviewShop, updateShopStatus } from '@drugdeal/db';
import { shopActionSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { requireFeatureEnabled } from '@/lib/feature-flags';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

function errorStatus(code: string) {
  return code === 'not_found' ? 404 : code === 'cooldown_active' ? 429 : 403;
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'shops:actions', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const feature = await requireFeatureEnabled('feature.shops');

    if (!feature.ok) {
      return feature.response;
    }

    const body = await parseJsonBody(request, shopActionSchema);

    if (!body.ok) {
      return body.response;
    }

    if (body.data.action !== 'review') {
      const restriction = await hasActiveCharacterRestriction({ characterId: body.data.characterId, actionType: 'shop_restriction' });

      if (restriction) {
        return jsonError('forbidden', 'This character is temporarily restricted from shop operations.', 403);
      }
    }

    const result =
      body.data.action === 'set_status'
        ? await updateShopStatus({ ...body.data, userId: auth.userId })
        : body.data.action === 'cancel_listing'
          ? await cancelShopListing({ ...body.data, userId: auth.userId })
          : body.data.action === 'advertise'
            ? await buyShopAdvertisement({ ...body.data, userId: auth.userId })
            : await reviewShop({ ...body.data, userId: auth.userId });

    if (!result.ok) {
      return jsonError(result.code, result.message, errorStatus(result.code));
    }

    return jsonOk(result);
  });
}
