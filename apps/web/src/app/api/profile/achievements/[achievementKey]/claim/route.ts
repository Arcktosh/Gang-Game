import { claimAchievement } from '@drugdeal/db';
import { claimAchievementSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ achievementKey: string }> }) {
  return withApiObservability(request, async () => {
    const { achievementKey } = await params;
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:profile:achievements:id:claim', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, claimAchievementSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await claimAchievement({ userId: auth.userId, characterId: body.data.characterId, achievementKey });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : result.code === 'conflict' ? 409 : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk(result.data);
  });
}
