import { eq, lt, sql } from 'drizzle-orm';
import { calculateRegeneratedResources } from '@drugdeal/game';
import { characters, db } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const RESOURCE_TICK_MS = 60_000;

export function startResourceTick() {
  return scheduleWorkerTick({
    name: 'resource-regeneration',
    intervalMs: RESOURCE_TICK_MS,
    run: regenerateCharacterResources,
  });
}

export async function regenerateCharacterResources() {
  const candidates = await db.query.characters.findMany({
    where: lt(characters.lastResourceTickAt, sql`now() - interval '1 minute'`),
    limit: 200,
  });

  let updated = 0;

  for (const character of candidates) {
    const regenerated = calculateRegeneratedResources({
      energy: character.energy,
      nerve: character.nerve,
      maxEnergy: character.maxEnergy,
      maxNerve: character.maxNerve,
      endurance: character.endurance,
      lastResourceTickAt: character.lastResourceTickAt,
    });

    if (!regenerated.changed) {
      await db.update(characters).set({ lastResourceTickAt: sql`now()` }).where(eq(characters.id, character.id));
      continue;
    }

    await db
      .update(characters)
      .set({
        energy: regenerated.energy,
        nerve: regenerated.nerve,
        lastResourceTickAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, character.id));
    updated += 1;
  }

  return updated;
}
