import { performTerritoryAction } from '@drugdeal/db';
import { territoryActionSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:territories:actions', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, territoryActionSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await performTerritoryAction({ userId: auth.userId, ...body.data });

    if (!result.ok) {
      return jsonError(
        result.code,
        result.message,
        result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 409 : 403,
      );
    }

    return jsonOk({ territory: result.territory, outcome: result.outcome, power: result.power });
  });
}
