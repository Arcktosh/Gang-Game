import { hasActiveCharacterRestriction, listMessageCenter, runMessageAction } from '@drugdeal/db';
import { messageActionSchema, messageCenterQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { requireFeatureEnabled } from '@/lib/feature-flags';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:messages', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = messageCenterQuerySchema.safeParse({ characterId: request.nextUrl.searchParams.get('characterId') ?? undefined });

    if (!query.success) {
      return jsonError('bad_request', 'Invalid message center query.', 400, query.error.flatten());
    }

    const center = await listMessageCenter({ userId: auth.userId, characterId: query.data.characterId });

    if (!center) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk(center);
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'messages:mutate', auth.userId), windowSeconds: 60, maxRequests: 40 });

    if (!limit.ok) {
      return limit.response;
    }

    const feature = await requireFeatureEnabled('feature.messages');

    if (!feature.ok) {
      return feature.response;
    }

    const body = await parseJsonBody(request, messageActionSchema);

    if (!body.ok) {
      return body.response;
    }

    if (body.data.action === 'send') {
      const restriction = await hasActiveCharacterRestriction({ characterId: body.data.senderCharacterId, actionType: 'social_mute' });

      if (restriction) {
        return jsonError('forbidden', 'This character is temporarily muted by moderation.', 403);
      }
    }

    const result = await runMessageAction({ userId: auth.userId, ...body.data });

    if (!result.ok) {
      return jsonError(result.code, result.message, result.code === 'forbidden' ? 403 : result.code === 'bad_request' ? 400 : 404);
    }

    return jsonOk(result.data, { status: body.data.action === 'send' || body.data.action === 'report' ? 201 : 200 });
  });
}
