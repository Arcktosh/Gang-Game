import { payTerritoryIncomeTick } from '@drugdeal/db';

const TERRITORY_INCOME_TICK_MS = 300_000;

export function startTerritoryIncomeTick() {
  console.log(`territory income tick scheduled every ${TERRITORY_INCOME_TICK_MS}ms`);
  setInterval(() => {
    payTerritoryIncomeTick().catch((error) => {
      console.error('territory income tick failed', error);
    });
  }, TERRITORY_INCOME_TICK_MS);
}
