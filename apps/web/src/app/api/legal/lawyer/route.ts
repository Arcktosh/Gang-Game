import { and, eq } from 'drizzle-orm';
import { characters, db, hireLawyer, refreshCharacterHeat } from '@drugdeal/db';
import { hireLawyerSchema } from '@drugdeal/validators';
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

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:legal:lawyer', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, hireLawyerSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await db.transaction(async (tx) => {
      const character = await tx.query.characters.findFirst({
        where: and(eq(characters.id, body.data.characterId), eq(characters.userId, auth.userId)),
      });

      if (!character) {
        return { error: jsonError('not_found', 'Character not found.', 404) };
      }

      const refreshedCharacter = await refreshCharacterHeat(tx, character);
      const lawyerResult = await hireLawyer({
        tx,
        character: refreshedCharacter,
        userId: auth.userId,
        tier: body.data.tier,
      });

      if (!lawyerResult.ok) {
        return { error: jsonError('forbidden', lawyerResult.message, 403) };
      }

      return { data: lawyerResult };
    });

    if ('error' in result) {
      return result.error;
    }

    return jsonOk(result.data, { status: 201 });
  });
}
