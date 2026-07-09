import { claimObjective } from '@drugdeal/db';
import { claimObjectiveSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ objectiveId: string }> },
) {
  return withApiObservability(request, async () => {
    const { objectiveId } = await params;
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:profile:objectives:id:claim', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, claimObjectiveSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await claimObjective({
      userId: auth.userId,
      characterId: body.data.characterId,
      objectiveId,
    });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : result.code === 'conflict' ? 409 : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk(result.data);
  });
}
