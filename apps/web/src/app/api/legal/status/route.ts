import { and, eq } from 'drizzle-orm';
import {
  characters,
  db,
  getActiveHospitalStay,
  getActiveJailSentence,
  listLegalServiceLogs,
  refreshCharacterHeat,
  refreshCharacterResources,
} from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const characterId = request.nextUrl.searchParams.get('characterId');

    if (!characterId) {
      return jsonError('bad_request', 'characterId is required.', 400);
    }

    const result = await db.transaction(async (tx) => {
      const character = await tx.query.characters.findFirst({
        where: and(eq(characters.id, characterId), eq(characters.userId, auth.userId)),
      });

      if (!character) {
        return { error: jsonError('not_found', 'Character not found.', 404) };
      }

      const refreshedHeatCharacter = await refreshCharacterHeat(tx, character);
      const refreshedCharacter = await refreshCharacterResources(tx, refreshedHeatCharacter);
      return { data: { character: refreshedCharacter } };
    });

    if ('error' in result) {
      return result.error;
    }

    const [activeJailSentence, activeHospitalStay, legalLogs] = await Promise.all([
      getActiveJailSentence(characterId),
      getActiveHospitalStay(characterId),
      listLegalServiceLogs(characterId),
    ]);

    return jsonOk({
      character: result.data.character,
      activeJailSentence,
      activeHospitalStay,
      legalLogs,
      options: {
        lawyers: [
          { tier: 'public', cost: 50, label: 'Public defender' },
          { tier: 'street', cost: 300, label: 'Street lawyer' },
          { tier: 'firm', cost: 1000, label: 'Private firm' },
        ],
        bribe: {
          available: result.data.character.heat > 0,
          estimatedMinimumCost: 100 + result.data.character.heat * 35,
        },
        hospitalCare: [
          { service: 'basic', cost: 100, label: 'Basic treatment' },
          { service: 'private', cost: 350, label: 'Private room' },
          { service: 'specialist', cost: 900, label: 'Specialist care' },
        ],
      },
    });
  });
}
