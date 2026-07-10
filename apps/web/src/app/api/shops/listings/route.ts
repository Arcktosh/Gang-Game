import { createShopListing, hasActiveCharacterRestriction } from '@drugdeal/db';
import { createShopListingSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { requireFeatureEnabled } from '@/lib/feature-flags';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'shops:listings', auth.userId), windowSeconds: 60, maxRequests: 20 });

    if (!limit.ok) {
      return limit.response;
    }

    const feature = await requireFeatureEnabled('feature.shops');

    if (!feature.ok) {
      return feature.response;
    }

    const body = await parseJsonBody(request, createShopListingSchema);

    if (!body.ok) {
      return body.response;
    }

    const restriction = await hasActiveCharacterRestriction({ characterId: body.data.characterId, actionType: 'shop_restriction' });

    if (restriction) {
      return jsonError('forbidden', 'This character is temporarily restricted from shop operations.', 403);
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'shops:listings:create',
      fingerprint: body.data,
      handler: async () => {
        const result = await createShopListing({ ...body.data, userId: auth.userId });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk({ listing: result.listing }, { status: 201 });
      },
    });
  });
}
