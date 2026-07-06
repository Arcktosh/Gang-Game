import { and, eq } from 'drizzle-orm';
import { db, characters, factionMembers, factions, playerEvents } from '@drugdeal/db';
import { uuidSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const joinFactionSchema = z.object({
  characterId: uuidSchema,
});

export async function POST(request: NextRequest, context: { params: Promise<{ factionId: string }> }) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:factions:id:join', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, joinFactionSchema);

    if (!body.ok) {
      return body.response;
    }

    const { factionId } = await context.params;
    const result = await db.transaction(async (tx) => {
      const character = await tx.query.characters.findFirst({
        where: and(eq(characters.id, body.data.characterId), eq(characters.userId, auth.userId)),
      });

      if (!character) {
        return { error: jsonError('not_found', 'Character not found.', 404) };
      }

      const faction = await tx.query.factions.findFirst({ where: eq(factions.id, factionId) });

      if (!faction) {
        return { error: jsonError('not_found', 'Faction not found.', 404) };
      }

      const existingMembership = await tx.query.factionMembers.findFirst({
        where: and(eq(factionMembers.characterId, character.id), eq(factionMembers.status, 'active')),
      });

      if (existingMembership) {
        return { error: jsonError('conflict', 'Character is already in a faction.', 409) };
      }

      const [membership] = await tx
        .insert(factionMembers)
        .values({ factionId, characterId: character.id, role: 'recruit', status: 'active' })
        .returning();

      await tx.insert(playerEvents).values({
        userId: auth.userId,
        characterId: character.id,
        visibility: 'faction',
        type: 'faction_joined',
        payload: { factionId, factionName: faction.name },
      });

      return { data: { membership } };
    });

    if ('error' in result) {
      return result.error;
    }

    return jsonOk(result.data, { status: 201 });
  });
}
