import { factionBankActionSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { transferFactionFunds } from '@drugdeal/db';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ factionId: string }> },
) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:factions:id:bank', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, factionBankActionSchema);

    if (!body.ok) {
      return body.response;
    }

    const { factionId } = await context.params;
    const result = await transferFactionFunds({ userId: auth.userId, factionId, ...body.data });

    if (!result.ok) {
      return jsonError(result.code, result.message, result.code === 'not_found' ? 404 : 403);
    }

    return jsonOk({ faction: result.faction });
  });
}
