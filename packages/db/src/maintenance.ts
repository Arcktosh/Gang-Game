import { lt, sql } from 'drizzle-orm';
import { db } from './client';
import { apiIdempotencyKeys, characterActionLocks, emailVerificationTokens, notificationDigests, passwordResetTokens, userSessions } from './schema';
import { cleanupExpiredMessages } from './queries/messages';

export type MaintenanceCleanupOptions = {
  digestRetentionDays?: number;
  actionLockRetentionMinutes?: number;
  messageRetentionDays?: number;
};

export type MaintenanceCleanupResult = {
  expiredIdempotencyKeys: number;
  expiredSessions: number;
  expiredActionLocks: number;
  oldNotificationDigests: number;
  expiredAccountTokens: number;
  expiredMessages: number;
};

const DEFAULT_DIGEST_RETENTION_DAYS = 30;
const DEFAULT_ACTION_LOCK_RETENTION_MINUTES = 60;

function positiveIntegerOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export async function cleanupExpiredIdempotencyKeys() {
  const deleted = await db
    .delete(apiIdempotencyKeys)
    .where(lt(apiIdempotencyKeys.expiresAt, sql`now()`))
    .returning({ id: apiIdempotencyKeys.id });

  return deleted.length;
}

export async function cleanupExpiredSessions() {
  const deleted = await db
    .delete(userSessions)
    .where(lt(userSessions.expiresAt, sql`now()`))
    .returning({ id: userSessions.id });

  return deleted.length;
}

export async function cleanupExpiredActionLocks(retentionMinutes = DEFAULT_ACTION_LOCK_RETENTION_MINUTES) {
  const safeRetentionMinutes = positiveIntegerOrDefault(retentionMinutes, DEFAULT_ACTION_LOCK_RETENTION_MINUTES);
  const deleted = await db
    .delete(characterActionLocks)
    .where(sql`${characterActionLocks.lockedUntil} < now() - (${safeRetentionMinutes}::text || ' minutes')::interval`)
    .returning({ id: characterActionLocks.id });

  return deleted.length;
}

export async function cleanupOldNotificationDigests(retentionDays = DEFAULT_DIGEST_RETENTION_DAYS) {
  const safeRetentionDays = positiveIntegerOrDefault(retentionDays, DEFAULT_DIGEST_RETENTION_DAYS);
  const deleted = await db
    .delete(notificationDigests)
    .where(sql`${notificationDigests.createdAt} < now() - (${safeRetentionDays}::text || ' days')::interval`)
    .returning({ id: notificationDigests.id });

  return deleted.length;
}


export async function cleanupExpiredAccountTokens() {
  const [passwordTokens, emailTokens] = await Promise.all([
    db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} <= now() OR ${passwordResetTokens.usedAt} IS NOT NULL`)
      .returning({ id: passwordResetTokens.id }),
    db
      .delete(emailVerificationTokens)
      .where(sql`${emailVerificationTokens.expiresAt} <= now() OR ${emailVerificationTokens.usedAt} IS NOT NULL`)
      .returning({ id: emailVerificationTokens.id }),
  ]);

  return passwordTokens.length + emailTokens.length;
}

export async function runMaintenanceCleanup(options: MaintenanceCleanupOptions = {}): Promise<MaintenanceCleanupResult> {
  const digestRetentionDays = options.digestRetentionDays ?? DEFAULT_DIGEST_RETENTION_DAYS;
  const actionLockRetentionMinutes = options.actionLockRetentionMinutes ?? DEFAULT_ACTION_LOCK_RETENTION_MINUTES;

  const [expiredIdempotencyKeys, expiredSessions, expiredActionLocks, oldNotificationDigests, expiredAccountTokens, expiredMessages] = await Promise.all([
    cleanupExpiredIdempotencyKeys(),
    cleanupExpiredSessions(),
    cleanupExpiredActionLocks(actionLockRetentionMinutes),
    cleanupOldNotificationDigests(digestRetentionDays),
    cleanupExpiredAccountTokens(),
    cleanupExpiredMessages(),
  ]);

  return {
    expiredIdempotencyKeys,
    expiredSessions,
    expiredActionLocks,
    oldNotificationDigests,
    expiredAccountTokens,
    expiredMessages,
  };
}
