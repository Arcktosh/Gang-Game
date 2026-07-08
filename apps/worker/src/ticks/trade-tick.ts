import { expireOpenPlayerTradeOffers } from '@drugdeal/db';

const TRADE_TICK_MS = 60_000;

export function startTradeTick() {
  console.log(`trade tick scheduled every ${TRADE_TICK_MS}ms`);
  setInterval(() => {
    expireOpenPlayerTradeOffers({ limit: 100 }).then((summary) => {
      if (summary.expired.length > 0) {
        console.log(`trade tick expired ${summary.expired.length} player trade offer(s)`);
      }
    }).catch((error) => {
      console.error('trade tick failed', error);
    });
  }, TRADE_TICK_MS);
}
