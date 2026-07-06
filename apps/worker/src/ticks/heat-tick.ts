import { gt } from 'drizzle-orm';
import { characters, db, refreshCharacterHeat } from '@drugdeal/db';

const HEAT_TICK_MS = 300_000;

export function startHeatTick() {
  console.log(`heat tick scheduled every ${HEAT_TICK_MS}ms`);
  setInterval(() => {
    decayCharacterHeat().catch((error) => {
      console.error('heat tick failed', error);
    });
  }, HEAT_TICK_MS);
}

export async function decayCharacterHeat() {
  const candidates = await db.query.characters.findMany({
    where: gt(characters.heat, 0),
    limit: 250,
  });

  let updated = 0;

  for (const character of candidates) {
    if (character.lastHeatTickAt > new Date(Date.now() - 60_000)) {
      continue;
    }

    const refreshed = await db.transaction((tx) => refreshCharacterHeat(tx, character));

    if (refreshed.heat !== character.heat) {
      updated += 1;
    }
  }

  return { scanned: candidates.length, updated };
}
