import { and, eq } from 'drizzle-orm';
import { assertActionUnlocked, characters, db, refreshCharacterResources, requestCourtHearing, setActionCooldown } from '@drugdeal/db';
import { courtHearingSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { withIdempotency } from '@/lib/idempotency';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:legal:court', auth.userId), windowSeconds: 60, maxRequests: 20 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, courtHearingSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'api:legal:court',
      fingerprint: body.data,
      handler: async () => {
        const result = await db.transaction(async (tx) => {
          const character = await tx.query.characters.findFirst({
            where: and(eq(characters.id, body.data.characterId), eq(characters.userId, auth.userId)),
          });

          if (!character) {
            return { error: jsonError('not_found', 'Character not found.', 404) };
          }

          const cooldown = await assertActionUnlocked(tx, character.id, 'legal_court');

          if (!cooldown.ok) {
            return { error: jsonError('cooldown_active', cooldown.message, 429) };
          }

          const refreshedCharacter = await refreshCharacterResources(tx, character);
          const courtResult = await requestCourtHearing({ tx, character: refreshedCharacter, userId: auth.userId, plea: body.data.plea });

          if (!courtResult.ok) {
            return { error: jsonError('forbidden', courtResult.message, 403) };
          }

          const lock = await setActionCooldown({
            tx,
            characterId: character.id,
            actionType: 'legal_court',
            cooldownSeconds: 21_600,
            metadata: { plea: body.data.plea },
          });

          return { data: { ...courtResult, lock } };
        });

        if ('error' in result) {
          return result.error;
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
