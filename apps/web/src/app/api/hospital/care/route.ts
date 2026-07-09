import { and, eq } from 'drizzle-orm';
import { buyHospitalCare, characters, db, refreshCharacterResources } from '@drugdeal/db';
import { hospitalCareSchema } from '@drugdeal/validators';
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

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:hospital:care', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, hospitalCareSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'api:hospital:care',
      fingerprint: body.data,
      handler: async () => {
        const result = await db.transaction(async (tx) => {
          const character = await tx.query.characters.findFirst({
            where: and(
              eq(characters.id, body.data.characterId),
              eq(characters.userId, auth.userId),
            ),
          });

          if (!character) {
            return { error: jsonError('not_found', 'Character not found.', 404) };
          }

          const refreshedCharacter = await refreshCharacterResources(tx, character);
          const careResult = await buyHospitalCare({
            tx,
            character: refreshedCharacter,
            userId: auth.userId,
            service: body.data.service,
          });

          if (!careResult.ok) {
            return { error: jsonError('forbidden', careResult.message, 403) };
          }

          return { data: careResult };
        });

        if ('error' in result) {
          return result.error;
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
