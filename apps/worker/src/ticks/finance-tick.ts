import { tickAssetPrices } from '@drugdeal/db';

const FINANCE_TICK_MS = 120_000;

export function startFinanceTick() {
  console.log(`finance tick scheduled every ${FINANCE_TICK_MS}ms`);
  setInterval(() => {
    tickAssetPrices().catch((error) => {
      console.error('finance tick failed', error);
    });
  }, FINANCE_TICK_MS);
}
