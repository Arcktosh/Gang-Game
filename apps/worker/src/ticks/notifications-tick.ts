import { createDailyNotificationDigests, createNotificationsFromRecentEvents } from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const NOTIFICATIONS_TICK_MS = 60_000;
const DIGEST_TICK_MS = 60 * 60 * 1000;

export function startNotificationsTick() {
  const notificationTick = scheduleWorkerTick({
    name: 'notifications',
    intervalMs: NOTIFICATIONS_TICK_MS,
    run: createNotificationsFromRecentEvents,
  });

  const digestTick = scheduleWorkerTick({
    name: 'notification-digests',
    intervalMs: DIGEST_TICK_MS,
    run: createDailyNotificationDigests,
  });

  return [notificationTick, digestTick];
}
