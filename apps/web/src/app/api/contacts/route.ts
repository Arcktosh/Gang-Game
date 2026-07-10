import { listContactsProfile, runContactAction } from '@drugdeal/db';
import { contactActionSchema, contactsProfileQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:contacts', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = contactsProfileQuerySchema.safeParse({ characterId: request.nextUrl.searchParams.get('characterId') });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid contacts query.', 400, query.error.flatten());
    }

    const profile = await listContactsProfile({ userId: auth.userId, characterId: query.data.characterId });

    if (!profile) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk(profile);
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:contacts', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, contactActionSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await runContactAction({ userId: auth.userId, ...body.data });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk(result.data, { status: 201 });
  });
}
