import { completeReadyCraftingJobs } from '@drugdeal/db';

const CRAFTING_TICK_MS = 60_000;

export function startCraftingTick() {
  console.log(`crafting tick scheduled every ${CRAFTING_TICK_MS}ms`);
  setInterval(() => {
    completeReadyCraftingJobs().catch((error) => {
      console.error('crafting tick failed', error);
    });
  }, CRAFTING_TICK_MS);
}
