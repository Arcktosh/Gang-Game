import { payTerritoryIncomeTick } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const TERRITORY_INCOME_TICK_MS = 300_000;

export function startTerritoryIncomeTick() {
  return scheduleWorkerTick({
    name: 'territory-income',
    intervalMs: TERRITORY_INCOME_TICK_MS,
    run: payTerritoryIncomeTick,
  });
}
