import { expireDueCharacterEnforcements } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const DEFAULT_INTERVAL_MS = Number(process.env.ENFORCEMENT_EXPIRY_TICK_MS ?? 60_000);

export function startEnforcementExpiryTick(intervalMs = DEFAULT_INTERVAL_MS) {
  return scheduleWorkerTick({
    name: 'enforcement-expiry',
    intervalMs,
    runImmediately: true,
    run: async () => {
      const result = await expireDueCharacterEnforcements({ limit: 100 });

      if (result.expired > 0) {
        console.log(`enforcement expiry tick released ${result.expired} enforcement(s)`);
      }
    },
  });
}
