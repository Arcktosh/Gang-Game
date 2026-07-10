import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../client';
import { emailVerificationTokens, passwordResetTokens, userSessions, users } from '../schema';

export type CreateAccountTokenInput = {
  userId: string;
  tokenHash: string;
  requestedIp?: string | null;
  requestedUserAgent?: string | null;
  expiresAt: Date;
};

export async function createPasswordResetToken(input: CreateAccountTokenInput) {
  const [token] = await db
    .insert(passwordResetTokens)
    .values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      requestedIp: input.requestedIp ?? null,
      requestedUserAgent: input.requestedUserAgent ?? null,
      expiresAt: input.expiresAt,
    })
    .returning();

  return token;
}

export async function createEmailVerificationToken(input: CreateAccountTokenInput) {
  const [token] = await db
    .insert(emailVerificationTokens)
    .values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      requestedIp: input.requestedIp ?? null,
      requestedUserAgent: input.requestedUserAgent ?? null,
      expiresAt: input.expiresAt,
    })
    .returning();

  return token;
}

export async function resetPasswordWithToken(input: { tokenHash: string; passwordHash: string }) {
  return db.transaction(async (tx) => {
    const token = await tx.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, input.tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, sql`now()`),
      ),
    });

    if (!token) {
      return null;
    }

    const [user] = await tx
      .update(users)
      .set({ passwordHash: input.passwordHash, updatedAt: sql`now()` })
      .where(eq(users.id, token.userId))
      .returning({ id: users.id, email: users.email, displayName: users.displayName, isAdmin: users.isAdmin, adminRole: users.adminRole });

    await tx.update(passwordResetTokens).set({ usedAt: sql`now()` }).where(eq(passwordResetTokens.id, token.id));
    await tx.delete(userSessions).where(eq(userSessions.userId, token.userId));

    return user ?? null;
  });
}

export async function verifyEmailWithToken(tokenHash: string) {
  return db.transaction(async (tx) => {
    const token = await tx.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, sql`now()`),
      ),
    });

    if (!token) {
      return null;
    }

    const [user] = await tx
      .update(users)
      .set({ emailVerifiedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(users.id, token.userId))
      .returning({ id: users.id, email: users.email, displayName: users.displayName, isAdmin: users.isAdmin, adminRole: users.adminRole });

    await tx.update(emailVerificationTokens).set({ usedAt: sql`now()` }).where(eq(emailVerificationTokens.id, token.id));

    return user ?? null;
  });
}

export async function deleteExpiredAccountRecoveryTokens() {
  await db.delete(passwordResetTokens).where(sql`${passwordResetTokens.expiresAt} <= now() OR ${passwordResetTokens.usedAt} IS NOT NULL`);
  await db.delete(emailVerificationTokens).where(sql`${emailVerificationTokens.expiresAt} <= now() OR ${emailVerificationTokens.usedAt} IS NOT NULL`);
}
