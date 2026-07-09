import { and, eq } from 'drizzle-orm';
import {
  assertActionUnlocked,
  attemptBribe,
  characters,
  db,
  refreshCharacterHeat,
  setActionCooldown,
} from '@drugdeal/db';
import { bribeSchema } from '@drugdeal/validators';
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
      key: rateLimitKey(request, 'api:legal:bribe', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, bribeSchema);

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

      const cooldown = await assertActionUnlocked(tx, character.id, 'legal_bribe');

      if (!cooldown.ok) {
        return { error: jsonError('cooldown_active', cooldown.message, 429) };
      }

      const refreshedCharacter = await refreshCharacterHeat(tx, character);
      const bribeResult = await attemptBribe({
        tx,
        character: refreshedCharacter,
        userId: auth.userId,
      });

      if (!bribeResult.ok) {
        return { error: jsonError('forbidden', bribeResult.message, 403) };
      }

      const lock = await setActionCooldown({
        tx,
        characterId: character.id,
        actionType: 'legal_bribe',
        cooldownSeconds: 1800,
        metadata: { service: 'bribe' },
      });
      return { data: { ...bribeResult, lock } };
    });

    if ('error' in result) {
      return result.error;
    }

    return jsonOk(result.data, { status: 201 });
  });
}
