import { expireOpenContracts } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const CONTRACT_TICK_MS = 120_000;

export function startContractTick() {
  return scheduleWorkerTick({
    name: 'contracts',
    intervalMs: CONTRACT_TICK_MS,
    run: expireOpenContracts,
  });
}
