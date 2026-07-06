import { and, eq } from 'drizzle-orm';
import { characters, db, getCharacterStatusDetail } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

type Params = { params: Promise<{ characterId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { characterId } = await params;
    const character = await db.query.characters.findFirst({
      where: and(eq(characters.id, characterId), eq(characters.userId, auth.userId)),
    });

    if (!character) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    const status = await getCharacterStatusDetail(character.id);
    return jsonOk({ character, status });
  });
}
