import { eq } from 'drizzle-orm';
import { db, getCharacterForUser, inventoryItems } from '@drugdeal/db';
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

    const inventory = await db.query.inventoryItems.findMany({ where: eq(inventoryItems.characterId, character.id) });

    return jsonOk({ inventory });
  });
}
