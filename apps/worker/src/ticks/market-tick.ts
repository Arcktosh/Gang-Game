const MARKET_TICK_MS = 60_000;

export function startMarketTick() {
  console.log(`market tick scheduled every ${MARKET_TICK_MS}ms`);
  setInterval(() => {
    console.log('market tick placeholder: update regional prices here');
  }, MARKET_TICK_MS);
}
