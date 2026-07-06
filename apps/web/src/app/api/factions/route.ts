import { and, eq } from 'drizzle-orm';
import { db, characters, factionMembers, factions, listFactions, playerEvents } from '@drugdeal/db';
import { createFactionSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET() {
  const factionList = await listFactions();
  return jsonOk({ factions: factionList });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:factions', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, createFactionSchema);

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

      const existingMembership = await tx.query.factionMembers.findFirst({
        where: and(eq(factionMembers.characterId, character.id), eq(factionMembers.status, 'active')),
      });

      if (existingMembership) {
        return { error: jsonError('conflict', 'Character is already in a faction.', 409) };
      }

      const [faction] = await tx
        .insert(factions)
        .values({
          name: body.data.name,
          tag: body.data.tag,
          description: body.data.description,
          createdByCharacterId: character.id,
        })
        .returning();

      await tx.insert(factionMembers).values({
        factionId: faction.id,
        characterId: character.id,
        role: 'boss',
        status: 'active',
      });

      await tx.insert(playerEvents).values({
        userId: auth.userId,
        characterId: character.id,
        visibility: 'public',
        type: 'faction_created',
        payload: { factionId: faction.id, name: faction.name, tag: faction.tag },
      });

      return { data: { faction } };
    });

    if ('error' in result) {
      return result.error;
    }

    return jsonOk(result.data, { status: 201 });
  });
}
