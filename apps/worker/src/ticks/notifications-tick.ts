import { createDailyNotificationDigests, createNotificationsFromRecentEvents } from '@drugdeal/db';

const NOTIFICATIONS_TICK_MS = 60_000;
const DIGEST_TICK_MS = 60 * 60 * 1000;

export function startNotificationsTick() {
  console.log(`notifications tick scheduled every ${NOTIFICATIONS_TICK_MS}ms`);
  setInterval(() => {
    createNotificationsFromRecentEvents().catch((error) => {
      console.error('notifications tick failed', error);
    });
  }, NOTIFICATIONS_TICK_MS);

  setInterval(() => {
    createDailyNotificationDigests().catch((error) => {
      console.error('notification digest tick failed', error);
    });
  }, DIGEST_TICK_MS);
}
