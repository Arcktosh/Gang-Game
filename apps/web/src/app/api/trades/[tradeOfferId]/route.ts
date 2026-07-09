import { acceptPlayerTradeOffer, cancelPlayerTradeOffer } from '@drugdeal/db';
import { playerTradeOfferActionSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tradeOfferId: string }> },
) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'actions:trade-offer', auth.userId),
      windowSeconds: 60,
      maxRequests: 40,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const { tradeOfferId } = await params;
    const body = await parseJsonBody(request, playerTradeOfferActionSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: `trades:${body.data.action}`,
      fingerprint: { tradeOfferId, ...body.data },
      handler: async () => {
        const result =
          body.data.action === 'accept'
            ? await acceptPlayerTradeOffer({
                userId: auth.userId,
                characterId: body.data.characterId,
                tradeOfferId,
              })
            : await cancelPlayerTradeOffer({
                userId: auth.userId,
                characterId: body.data.characterId,
                tradeOfferId,
              });

        if (!result.ok) {
          const status =
            result.code === 'not_found'
              ? 404
              : result.code === 'cooldown_active'
                ? 429
                : result.code === 'conflict'
                  ? 409
                  : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data, { status: 200 });
      },
    });
  });
}
