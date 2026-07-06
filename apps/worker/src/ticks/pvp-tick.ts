import { expireOpenBounties, resolveEndedFactionWars } from '@drugdeal/db';

const PVP_TICK_MS = 120_000;

export function startPvpTick() {
  console.log(`pvp tick scheduled every ${PVP_TICK_MS}ms`);
  setInterval(() => {
    expireOpenBounties()
      .then(() => resolveEndedFactionWars())
      .catch((error) => {
        console.error('pvp tick failed', error);
      });
  }, PVP_TICK_MS);
}
