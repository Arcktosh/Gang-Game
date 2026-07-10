import { completeDueProgression } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const PROGRESSION_TICK_MS = 60_000;

export function startProgressionTick() {
  return scheduleWorkerTick({
    name: 'progression',
    intervalMs: PROGRESSION_TICK_MS,
    deadLetterPayload: { limit: 100 },
    run: async () => {
      const summary = await completeDueProgression(100);

      if (summary.processed > 0) {
        console.log(`progression tick completed ${summary.completedTraining} training session(s) and ${summary.completedCourses} course(s)`);
      }
    },
  });
}
