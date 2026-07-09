import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { hospitalStays, jailSentences } from '../schema';

async function getActiveHospitalStay(characterId: string) {
  return db.query.hospitalStays.findFirst({
    where: and(eq(hospitalStays.characterId, characterId), eq(hospitalStays.status, 'active')),
  });
}

async function getActiveJailSentence(characterId: string) {
  return db.query.jailSentences.findFirst({
    where: and(eq(jailSentences.characterId, characterId), eq(jailSentences.status, 'active')),
  });
}

export async function getCharacterStatusDetail(characterId: string) {
  const [hospitalStay, jailSentence] = await Promise.all([
    getActiveHospitalStay(characterId),
    getActiveJailSentence(characterId),
  ]);

  return {
    hospitalStay,
    jailSentence,
    blockedUntil: hospitalStay?.releasedAt ?? jailSentence?.releaseAt ?? null,
    reason: hospitalStay?.reason ?? jailSentence?.reason ?? null,
  };
}
