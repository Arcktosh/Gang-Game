import { prestigeCharacter } from '@drugdeal/db';
import { prestigeCharacterSchema } from '@drugdeal/validators';
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

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:prestige', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, prestigeCharacterSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await prestigeCharacter({ userId: auth.userId, characterId: body.data.characterId });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : 403;
      return jsonError(result.code, result.message, status, 'details' in result ? result.details : undefined);
    }

    return jsonOk(result.data);
  });
}
