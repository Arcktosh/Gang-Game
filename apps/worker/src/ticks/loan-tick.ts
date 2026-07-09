import { processLoanDefaults } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const LOAN_TICK_MS = 120_000;

export function startLoanTick() {
  return scheduleWorkerTick({
    name: 'loans',
    intervalMs: LOAN_TICK_MS,
    run: processLoanDefaults,
  });
}
