import { expireOpenPlayerTradeOffers } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const TRADE_TICK_MS = 60_000;

export function startTradeTick() {
  return scheduleWorkerTick({
    name: 'trade-expiry',
    intervalMs: TRADE_TICK_MS,
    deadLetterPayload: { limit: 100 },
    run: async () => {
      const summary = await expireOpenPlayerTradeOffers({ limit: 100 });

      if (summary.expired.length > 0) {
        console.log(`trade tick expired ${summary.expired.length} player trade offer(s)`);
      }
    },
  });
}
