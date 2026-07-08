import { completeDueProgression } from '@drugdeal/db';

const PROGRESSION_TICK_MS = 60_000;

export function startProgressionTick() {
  console.log(`progression tick scheduled every ${PROGRESSION_TICK_MS}ms`);
  setInterval(() => {
    completeDueProgression(100)
      .then((summary) => {
        if (summary.processed > 0) {
          console.log(
            `progression tick completed ${summary.completedTraining} training session(s) and ${summary.completedCourses} course(s)`,
          );
        }
      })
      .catch((error) => {
        console.error('progression tick failed', error);
      });
  }, PROGRESSION_TICK_MS);
}
