import { expireOpenBounties, resolveEndedFactionWars } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const PVP_TICK_MS = 120_000;

export function startPvpTick() {
  return scheduleWorkerTick({
    name: 'pvp',
    intervalMs: PVP_TICK_MS,
    run: async () => {
      await expireOpenBounties();
      await resolveEndedFactionWars();
    },
  });
}
