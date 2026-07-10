import { listAssetPriceHistory } from '@drugdeal/db';
import { financePriceHistoryQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:finance:history', auth.userId), windowSeconds: 60, maxRequests: 60 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = financePriceHistoryQuerySchema.safeParse({
      assetKey: request.nextUrl.searchParams.get('assetKey') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid finance history query.', 400, query.error.flatten());
    }

    const history = await listAssetPriceHistory(query.data);

    if (!history) {
      return jsonError('not_found', 'Asset not found.', 404);
    }

    return jsonOk(history);
  });
}
