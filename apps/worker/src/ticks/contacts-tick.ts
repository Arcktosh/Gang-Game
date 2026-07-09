import { completeReadyContactAssignments } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const CONTACTS_TICK_MS = 60_000;

export function startContactsTick() {
  return scheduleWorkerTick({
    name: 'contacts',
    intervalMs: CONTACTS_TICK_MS,
    run: completeReadyContactAssignments,
  });
}
