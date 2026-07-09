import { listInventoryProfile, transferInventoryItem, useInventoryItem } from '@drugdeal/db';
import { inventoryActionSchema, inventoryProfileQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:inventory', auth.userId),
      windowSeconds: 60,
      maxRequests: 60,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const query = inventoryProfileQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId'),
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid inventory query.', 400, query.error.flatten());
    }

    const result = await listInventoryProfile({
      userId: auth.userId,
      characterId: query.data.characterId,
    });

    if (!result.ok) {
      return jsonError(result.code, result.message, result.code === 'not_found' ? 404 : 403);
    }

    return jsonOk(result.data);
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'actions:inventory', auth.userId),
      windowSeconds: 60,
      maxRequests: 40,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, inventoryActionSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: `inventory:${body.data.action}`,
      fingerprint: body.data,
      handler: async () => {
        const result =
          body.data.action === 'use'
            ? await useInventoryItem({
                userId: auth.userId,
                characterId: body.data.characterId,
                inventoryItemId: body.data.inventoryItemId,
              })
            : await transferInventoryItem({
                userId: auth.userId,
                characterId: body.data.characterId,
                recipientCharacterId: body.data.recipientCharacterId,
                inventoryItemId: body.data.inventoryItemId,
                quantity: body.data.quantity,
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

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
