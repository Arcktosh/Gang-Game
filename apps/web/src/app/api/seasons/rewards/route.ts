import { claimSeasonReward } from '@drugdeal/db';
import { claimSeasonRewardSchema } from '@drugdeal/validators';
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

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:seasons:rewards', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, claimSeasonRewardSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await claimSeasonReward({ userId: auth.userId, ...body.data });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : result.code === 'conflict' ? 409 : 403;
      return jsonError(result.code, result.message, status, 'details' in result ? result.details : undefined);
    }

    return jsonOk(result.data);
  });
}
