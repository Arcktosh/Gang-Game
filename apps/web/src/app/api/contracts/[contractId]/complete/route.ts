import { completeContract } from '@drugdeal/db';
import { contractCharacterActionSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { requireFeatureEnabled } from '@/lib/feature-flags';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ contractId: string }> }) {
  return withApiObservability(request, async () => {
    const { contractId } = await params;
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:contracts:id:complete', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const feature = await requireFeatureEnabled('feature.contracts');

    if (!feature.ok) {
      return feature.response;
    }

    const body = await parseJsonBody(request, contractCharacterActionSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'contracts:complete',
      fingerprint: { ...body.data, contractId },
      handler: async () => {
        const result = await completeContract({ userId: auth.userId, characterId: body.data.characterId, contractId });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : result.code === 'conflict' ? 409 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data);
      },
    });
  });
}
