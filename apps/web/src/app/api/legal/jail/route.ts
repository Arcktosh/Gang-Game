import { and, eq } from 'drizzle-orm';
import { assertActionUnlocked, characters, db, performJailActivity, refreshCharacterResources, setActionCooldown, settleJailPayment } from '@drugdeal/db';
import { jailActionSchema } from '@drugdeal/validators';
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

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:legal:jail', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, jailActionSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'api:legal:jail',
      fingerprint: body.data,
      handler: async () => {
        const result = await db.transaction(async (tx) => {
          const character = await tx.query.characters.findFirst({
            where: and(eq(characters.id, body.data.characterId), eq(characters.userId, auth.userId)),
          });

          if (!character) {
            return { error: jsonError('not_found', 'Character not found.', 404) };
          }

          const refreshedCharacter = await refreshCharacterResources(tx, character);

          if (body.data.action === 'jail_activity') {
            const cooldown = await assertActionUnlocked(tx, character.id, 'jail_activity');

            if (!cooldown.ok) {
              return { error: jsonError('cooldown_active', cooldown.message, 429) };
            }

            const activityResult = await performJailActivity({ tx, character: refreshedCharacter, userId: auth.userId, activity: body.data.activity });

            if (!activityResult.ok) {
              return { error: jsonError('forbidden', activityResult.message, 403) };
            }

            const lock = await setActionCooldown({
              tx,
              characterId: character.id,
              actionType: 'jail_activity',
              cooldownSeconds: 3600,
              metadata: { activity: body.data.activity },
            });

            return { data: { ...activityResult, lock } };
          }

          const paymentResult = await settleJailPayment({
            tx,
            character: refreshedCharacter,
            userId: auth.userId,
            action: body.data.action,
            paymentSource: body.data.paymentSource,
          });

          if (!paymentResult.ok) {
            return { error: jsonError('forbidden', paymentResult.message, 403) };
          }

          return { data: paymentResult };
        });

        if ('error' in result) {
          return result.error;
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
