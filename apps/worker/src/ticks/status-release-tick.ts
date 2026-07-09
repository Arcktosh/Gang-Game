import { and, eq, lte, sql } from 'drizzle-orm';
import { characters, db, hospitalStays, jailSentences, playerEvents } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const STATUS_RELEASE_TICK_MS = 30_000;

export function startStatusReleaseTick() {
  return scheduleWorkerTick({
    name: 'status-release',
    intervalMs: STATUS_RELEASE_TICK_MS,
    run: async () => {
      await releaseDueHospitalStays();
      await releaseDueJailSentences();
    },
  });
}

export async function releaseDueHospitalStays() {
  const dueStays = await db.query.hospitalStays.findMany({
    where: and(eq(hospitalStays.status, 'active'), lte(hospitalStays.releasedAt, new Date())),
    limit: 50,
  });

  for (const stay of dueStays) {
    await db.transaction(async (tx) => {
      const character = await tx.query.characters.findFirst({
        where: eq(characters.id, stay.characterId),
      });

      await tx
        .update(hospitalStays)
        .set({ status: 'completed', completedAt: sql`now()` })
        .where(eq(hospitalStays.id, stay.id));

      if (!character) {
        return;
      }

      await tx
        .update(characters)
        .set({
          status: 'free',
          statusUntil: null,
          statusReason: null,
          health: Math.max(character.health, 35),
          updatedAt: sql`now()`,
        })
        .where(eq(characters.id, character.id));

      await tx.insert(playerEvents).values({
        userId: character.userId,
        characterId: character.id,
        type: 'hospital_released',
        payload: { hospitalStayId: stay.id, reason: stay.reason, bill: stay.bill },
      });
    });
  }

  return dueStays.length;
}

export async function releaseDueJailSentences() {
  const dueSentences = await db.query.jailSentences.findMany({
    where: and(eq(jailSentences.status, 'active'), lte(jailSentences.releaseAt, new Date())),
    limit: 50,
  });

  for (const sentence of dueSentences) {
    await db.transaction(async (tx) => {
      const character = await tx.query.characters.findFirst({
        where: eq(characters.id, sentence.characterId),
      });

      await tx
        .update(jailSentences)
        .set({ status: 'completed', completedAt: sql`now()` })
        .where(eq(jailSentences.id, sentence.id));

      if (!character) {
        return;
      }

      await tx
        .update(characters)
        .set({
          status: 'free',
          statusUntil: null,
          statusReason: null,
          heat: Math.max(0, character.heat - 2),
          updatedAt: sql`now()`,
        })
        .where(eq(characters.id, character.id));

      await tx.insert(playerEvents).values({
        userId: character.userId,
        characterId: character.id,
        type: 'jail_released',
        payload: { jailSentenceId: sentence.id, reason: sentence.reason, fine: sentence.fine },
      });
    });
  }

  return dueSentences.length;
}
