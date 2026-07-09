import { runMarketEventTick } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const MARKET_TICK_MS = 60_000;

export function startMarketTick() {
  return scheduleWorkerTick({
    name: 'market-events',
    intervalMs: MARKET_TICK_MS,
    run: async () => {
      const summary = await runMarketEventTick();

      if (summary.scheduled.length || summary.published.length || summary.expired.length) {
        console.log(
          `market tick processed ${summary.scheduled.length} scheduled, ${summary.published.length} published, ${summary.expired.length} expired events`,
        );
      }
    },
  });
}
