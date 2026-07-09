import { tickAssetPrices } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const FINANCE_TICK_MS = 120_000;

export function startFinanceTick() {
  return scheduleWorkerTick({
    name: 'finance',
    intervalMs: FINANCE_TICK_MS,
    run: tickAssetPrices,
  });
}
