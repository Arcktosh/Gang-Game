import { completeReadyContactAssignments } from '@drugdeal/db';

const CONTACTS_TICK_MS = 60_000;

export function startContactsTick() {
  console.log(`contacts tick scheduled every ${CONTACTS_TICK_MS}ms`);
  setInterval(() => {
    completeReadyContactAssignments().catch((error) => {
      console.error('contacts tick failed', error);
    });
  }, CONTACTS_TICK_MS);
}
