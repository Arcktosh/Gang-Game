import { and, desc, eq } from 'drizzle-orm';
import {
  db,
  factionMembers,
  getCharacterForUser,
  inventoryItems,
  listCharacterEvents,
  listCharacterProgression,
  travelPlans,
} from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

type RouteContext = {
  params: Promise<{ characterId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { characterId } = await context.params;
    const character = await getCharacterForUser(characterId, auth.userId);

    if (!character) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    const [events, inventory, activeTravel, progression, factionMembership] = await Promise.all([
      listCharacterEvents(character.id, auth.userId, 15),
      db.query.inventoryItems.findMany({ where: eq(inventoryItems.characterId, character.id) }),
      db.query.travelPlans.findFirst({
        where: and(eq(travelPlans.characterId, character.id), eq(travelPlans.status, 'scheduled')),
        orderBy: desc(travelPlans.createdAt),
      }),
      listCharacterProgression(character.id),
      db.query.factionMembers.findFirst({
        where: and(eq(factionMembers.characterId, character.id), eq(factionMembers.status, 'active')),
      }),
    ]);

    return jsonOk({ character, events, inventory, activeTravel, progression, factionMembership });
  });
}
