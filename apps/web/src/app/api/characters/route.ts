import { createCharacter, listCharactersForUser } from '@drugdeal/db';
import { createCharacterSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:characters', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const characters = await listCharactersForUser(auth.userId);
    return jsonOk({ characters });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:characters', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, createCharacterSchema);

    if (!body.ok) {
      return body.response;
    }

    const character = await createCharacter({ userId: auth.userId, name: body.data.name });
    return jsonOk({ character }, { status: 201 });
  });
}
