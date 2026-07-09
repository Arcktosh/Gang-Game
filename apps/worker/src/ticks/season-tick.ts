import { and, eq, lt, sql } from 'drizzle-orm';
import { db, seasons } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const SEASON_TICK_MS = 10 * 60 * 1000;

export function startSeasonTick() {
  return scheduleWorkerTick({
    name: 'seasons',
    intervalMs: SEASON_TICK_MS,
    run: async () => {
      await db
        .update(seasons)
        .set({ status: 'completed', updatedAt: sql`now()` })
        .where(and(eq(seasons.status, 'active'), lt(seasons.endsAt, new Date())));
    },
  });
}
