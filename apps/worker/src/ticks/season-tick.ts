import { db, seasons } from '@drugdeal/db';
import { and, eq, lt, sql } from 'drizzle-orm';

export function startSeasonTick() {
  setInterval(async () => {
    try {
      await db
        .update(seasons)
        .set({ status: 'completed', updatedAt: sql`now()` })
        .where(and(eq(seasons.status, 'active'), lt(seasons.endsAt, new Date())));
    } catch (error) {
      console.error('season tick failed', error);
    }
  }, 10 * 60 * 1000);
}
