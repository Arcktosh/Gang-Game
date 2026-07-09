import { gt } from 'drizzle-orm';
import { characters, db, refreshCharacterHeat } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const HEAT_TICK_MS = 300_000;

export function startHeatTick() {
  return scheduleWorkerTick({
    name: 'heat-decay',
    intervalMs: HEAT_TICK_MS,
    run: decayCharacterHeat,
  });
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
