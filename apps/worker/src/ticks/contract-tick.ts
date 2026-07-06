import { expireOpenContracts } from '@drugdeal/db';

const CONTRACT_TICK_MS = 120_000;

export function startContractTick() {
  console.log(`contract tick scheduled every ${CONTRACT_TICK_MS}ms`);
  setInterval(() => {
    expireOpenContracts().catch((error) => {
      console.error('contract tick failed', error);
    });
  }, CONTRACT_TICK_MS);
}
