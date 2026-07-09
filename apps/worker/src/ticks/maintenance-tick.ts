import { runMaintenanceCleanup } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const DEFAULT_MAINTENANCE_TICK_MS = positiveIntegerOrDefault(
  Number(process.env.MAINTENANCE_TICK_MS),
  15 * 60 * 1000,
);
const DEFAULT_DIGEST_RETENTION_DAYS = positiveIntegerOrDefault(
  Number(process.env.NOTIFICATION_DIGEST_RETENTION_DAYS),
  30,
);
const DEFAULT_ACTION_LOCK_RETENTION_MINUTES = positiveIntegerOrDefault(
  Number(process.env.ACTION_LOCK_RETENTION_MINUTES),
  60,
);

function positiveIntegerOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function startMaintenanceTick(intervalMs = DEFAULT_MAINTENANCE_TICK_MS) {
  return scheduleWorkerTick({
    name: 'maintenance-cleanup',
    intervalMs,
    runImmediately: true,
    deadLetterPayload: {
      digestRetentionDays: DEFAULT_DIGEST_RETENTION_DAYS,
      actionLockRetentionMinutes: DEFAULT_ACTION_LOCK_RETENTION_MINUTES,
    },
    run: async () => {
      const result = await runMaintenanceCleanup({
        digestRetentionDays: DEFAULT_DIGEST_RETENTION_DAYS,
        actionLockRetentionMinutes: DEFAULT_ACTION_LOCK_RETENTION_MINUTES,
      });

      const totalDeleted =
        result.expiredIdempotencyKeys +
        result.expiredSessions +
        result.expiredActionLocks +
        result.oldNotificationDigests;

      if (totalDeleted > 0) {
        console.log('maintenance cleanup completed', result);
      }
    },
  });
}
