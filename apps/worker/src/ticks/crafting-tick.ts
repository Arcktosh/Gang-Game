import { completeReadyCraftingJobs } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const CRAFTING_TICK_MS = 60_000;

export function startCraftingTick() {
  return scheduleWorkerTick({
    name: 'crafting',
    intervalMs: CRAFTING_TICK_MS,
    run: completeReadyCraftingJobs,
  });
}
