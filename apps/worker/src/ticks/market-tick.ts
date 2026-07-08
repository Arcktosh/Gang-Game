import { runMarketEventTick } from '@drugdeal/db';

const MARKET_TICK_MS = 60_000;

export function startMarketTick() {
  console.log(`market tick scheduled every ${MARKET_TICK_MS}ms`);
  setInterval(() => {
    runMarketEventTick().then((summary) => {
      if (summary.scheduled.length || summary.published.length || summary.expired.length) {
        console.log(
          `market tick processed ${summary.scheduled.length} scheduled, ${summary.published.length} published, ${summary.expired.length} expired events`,
        );
      }
    }).catch((error) => {
      console.error('market tick failed', error);
    });
  }, MARKET_TICK_MS);
}
