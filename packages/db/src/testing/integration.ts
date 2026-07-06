import { sql } from 'drizzle-orm';
import { db } from '../client';
import { characters, users } from '../schema';

export const INTEGRATION_TEST_USER_EMAIL = 'mvp-test-player@example.test';
export const INTEGRATION_TEST_ADMIN_EMAIL = 'mvp-test-admin@example.test';
export const INTEGRATION_TEST_CHARACTER_NAME = 'MVP Test Runner';

export function shouldRunDbIntegrationTests() {
  return process.env.RUN_DB_INTEGRATION_TESTS === 'true';
}

export function getIntegrationDatabaseUrl() {
  return process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? null;
}

export function assertSafeIntegrationDatabaseUrl() {
  const databaseUrl = getIntegrationDatabaseUrl();

  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL is required for DB integration tests.');
  }

  if (/prod|production/i.test(databaseUrl)) {
    throw new Error('Refusing to run integration tests against a database URL that looks like production.');
  }

  if (!/test|localhost|127\.0\.0\.1/i.test(databaseUrl)) {
    throw new Error('Integration tests require TEST_DATABASE_URL to contain test, localhost, or 127.0.0.1.');
  }

  return databaseUrl;
}

export async function resetMvpIntegrationState() {
  assertSafeIntegrationDatabaseUrl();

  await db.execute(sql`
    TRUNCATE TABLE
      idempotency_keys,
      player_events,
      job_runs,
      crime_attempts,
      jail_sentences,
      hospital_stays,
      financial_transactions,
      action_locks,
      character_jobs,
      inventory_items,
      characters,
      user_sessions,
      users
    RESTART IDENTITY CASCADE
  `);
}

export async function createIntegrationUser(input: { email?: string; passwordHash?: string; displayName?: string; isAdmin?: boolean }) {
  const [user] = await db
    .insert(users)
    .values({
      email: (input.email ?? INTEGRATION_TEST_USER_EMAIL).toLowerCase(),
      passwordHash: input.passwordHash ?? 'integration-test-password-hash',
      displayName: input.displayName ?? 'MVP Test Player',
      isAdmin: input.isAdmin ?? false,
      adminRole: input.isAdmin ? 'owner' : 'none',
    })
    .returning();

  return user;
}

export async function createIntegrationCharacter(input: { userId: string; name?: string }) {
  const [character] = await db
    .insert(characters)
    .values({
      userId: input.userId,
      name: input.name ?? INTEGRATION_TEST_CHARACTER_NAME,
      labour: 10,
      intelligence: 10,
      dexterity: 10,
      endurance: 10,
      defense: 10,
      energy: 100,
      nerve: 20,
      cash: 500,
    })
    .returning();

  return character;
}
