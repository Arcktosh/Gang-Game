import { expireDueCharacterEnforcements } from '@drugdeal/db';

const DEFAULT_INTERVAL_MS = Number(process.env.ENFORCEMENT_EXPIRY_TICK_MS ?? 60_000);

async function runEnforcementExpiryTick() {
  try {
    const result = await expireDueCharacterEnforcements({ limit: 100 });

    if (result.expired > 0) {
      console.log(`enforcement expiry tick released ${result.expired} enforcement(s)`);
    }
  } catch (error) {
    console.error('enforcement expiry tick failed', error);
  }
}

export function startEnforcementExpiryTick(intervalMs = DEFAULT_INTERVAL_MS) {
  void runEnforcementExpiryTick();
  return setInterval(() => void runEnforcementExpiryTick(), intervalMs);
}
