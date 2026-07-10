import { factionInventoryActionSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { transferFactionInventory } from '@drugdeal/db';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { requireFeatureEnabled } from '@/lib/feature-flags';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest, context: { params: Promise<{ factionId: string }> }) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:factions:id:inventory', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const feature = await requireFeatureEnabled('feature.factions');

    if (!feature.ok) {
      return feature.response;
    }

    const body = await parseJsonBody(request, factionInventoryActionSchema);

    if (!body.ok) {
      return body.response;
    }

    const { factionId } = await context.params;

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'factions:inventory',
      fingerprint: { factionId, ...body.data },
      handler: async () => {
        const result = await transferFactionInventory({ userId: auth.userId, factionId, ...body.data });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : result.code === 'conflict' ? 409 : result.code === 'bad_request' ? 400 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data);
      },
    });
  });
}
