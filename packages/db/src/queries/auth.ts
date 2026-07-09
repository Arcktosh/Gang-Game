import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '../client';
import { userSessions, users } from '../schema';

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  displayName?: string | null;
};

export type CreateUserSessionInput = {
  userId: string;
  sessionTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
};

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
}

export async function findUserById(userId: string) {
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}

export async function createUser(input: CreateUserInput) {
  const [user] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      displayName: input.displayName ?? null,
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
      adminRole: users.adminRole,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    });

  return user;
}

export async function createUserSession(input: CreateUserSessionInput) {
  const [session] = await db
    .insert(userSessions)
    .values({
      userId: input.userId,
      sessionTokenHash: input.sessionTokenHash,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt: input.expiresAt,
    })
    .returning();

  return session;
}

export async function findActiveUserBySessionTokenHash(sessionTokenHash: string) {
  const session = await db.query.userSessions.findFirst({
    where: and(
      eq(userSessions.sessionTokenHash, sessionTokenHash),
      gt(userSessions.expiresAt, sql`now()`),
    ),
    with: { user: true },
  });

  if (!session || !session.user) {
    return null;
  }

  return {
    session,
    user: {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      isAdmin: session.user.isAdmin,
      adminRole: session.user.adminRole,
      emailVerifiedAt: session.user.emailVerifiedAt,
      createdAt: session.user.createdAt,
    },
  };
}

export async function touchUserSession(sessionTokenHash: string) {
  await db
    .update(userSessions)
    .set({ lastSeenAt: sql`now()` })
    .where(eq(userSessions.sessionTokenHash, sessionTokenHash));
}

export async function deleteUserSession(sessionTokenHash: string) {
  await db.delete(userSessions).where(eq(userSessions.sessionTokenHash, sessionTokenHash));
}

export async function deleteExpiredUserSessions() {
  await db.delete(userSessions).where(sql`${userSessions.expiresAt} <= now()`);
}
