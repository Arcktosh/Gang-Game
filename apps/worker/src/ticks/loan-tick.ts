import { processLoanDefaults } from '@drugdeal/db';

const LOAN_TICK_MS = 120_000;

export function startLoanTick() {
  console.log(`loan tick scheduled every ${LOAN_TICK_MS}ms`);
  setInterval(() => {
    processLoanDefaults().catch((error) => {
      console.error('loan tick failed', error);
    });
  }, LOAN_TICK_MS);
}
