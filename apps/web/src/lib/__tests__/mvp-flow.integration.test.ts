import assert from 'node:assert/strict';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import {
  characterActionLocks,
  characterJobs,
  characters,
  createIntegrationCharacter,
  createIntegrationUser,
  crimeAttempts,
  db,
  jobRuns,
  playerEvents,
  resetMvpIntegrationState,
  runCrimeAction,
  runJobAction,
  shouldRunDbIntegrationTests,
} from '@drugdeal/db';
import { calculateProgressionFromExperience } from '@drugdeal/game';

const integrationEnabled = shouldRunDbIntegrationTests();

test('MVP database integration suite is explicitly opt-in', () => {
  assert.equal(typeof integrationEnabled, 'boolean');
});

test('MVP flow persists character, employment, work, crime, and event state', { skip: !integrationEnabled }, async () => {
  await resetMvpIntegrationState();

  const user = await createIntegrationUser({});
  const character = await createIntegrationCharacter({ userId: user.id });
  const job = await db.query.jobDefinitions.findFirst({ orderBy: (table, { asc }) => asc(table.requiredLabour) });
  const crime = await db.query.crimeDefinitions.findFirst({ orderBy: (table, { asc }) => asc(table.requiredLevel) });

  assert.ok(job, 'seeded job definition is required');
  assert.ok(crime, 'seeded crime definition is required');

  await db
    .update(characters)
    .set({
      labour: Math.max(character.labour, job.requiredLabour),
      intelligence: Math.max(character.intelligence, job.requiredIntelligence, 100),
      dexterity: 100,
      level: Math.max(character.level, crime.requiredLevel),
      nerve: Math.max(character.nerve, crime.requiredNerve + 10),
      energy: Math.max(character.energy, job.energyCost + 10),
    })
    .where(eq(characters.id, character.id));

  const applied = await runJobAction({ userId: user.id, characterId: character.id, jobKey: job.key, action: 'apply' });
  assert.equal(applied.ok, true);

  const worked = await runJobAction({ userId: user.id, characterId: character.id, jobKey: job.key, action: 'work' });
  assert.equal(worked.ok, true);
  if (!worked.ok) return;
  assert.ok(worked.jobRun.payout > 0);
  assert.equal(worked.employment.shiftsCompleted, 1);

  await db.delete(characterActionLocks).where(and(eq(characterActionLocks.characterId, character.id), eq(characterActionLocks.actionType, 'job')));
  const resigned = await runJobAction({ userId: user.id, characterId: character.id, jobKey: job.key, action: 'resign' });
  assert.equal(resigned.ok, true);

  const crimeResult = await runCrimeAction({ userId: user.id, characterId: character.id, crimeKey: crime.key, random: () => 0 });
  assert.equal(crimeResult.ok, true);
  if (!crimeResult.ok) return;
  assert.equal(crimeResult.attempt.outcome, 'success');

  const [persistedCharacter, employment, runs, attempts, events] = await Promise.all([
    db.query.characters.findFirst({ where: eq(characters.id, character.id) }),
    db.query.characterJobs.findFirst({ where: eq(characterJobs.characterId, character.id) }),
    db.query.jobRuns.findMany({ where: eq(jobRuns.characterId, character.id) }),
    db.query.crimeAttempts.findMany({ where: eq(crimeAttempts.characterId, character.id) }),
    db.query.playerEvents.findMany({ where: eq(playerEvents.characterId, character.id) }),
  ]);

  assert.ok(persistedCharacter);
  assert.equal(employment?.status, 'resigned');
  assert.equal(runs.length, 1);
  assert.equal(attempts.length, 1);
  assert.ok(events.some((event) => event.type === 'job_applied'));
  assert.ok(events.some((event) => event.type === 'job_completed'));
  assert.ok(events.some((event) => event.type === 'job_resigned'));
  assert.ok(events.some((event) => event.type === 'crime_succeeded'));
  assert.equal(calculateProgressionFromExperience(persistedCharacter.experience).level, persistedCharacter.level);
});

test('MVP gameplay mutations roll back when requirements are not met', { skip: !integrationEnabled }, async () => {
  await resetMvpIntegrationState();
  const user = await createIntegrationUser({ email: 'mvp-test-rollback@example.test' });
  const character = await createIntegrationCharacter({ userId: user.id, name: 'Rollback Runner' });
  const job = await db.query.jobDefinitions.findFirst({ orderBy: (table, { desc }) => desc(table.requiredLabour) });
  assert.ok(job);

  await db.update(characters).set({ labour: 0, intelligence: 0 }).where(eq(characters.id, character.id));
  const result = await runJobAction({ userId: user.id, characterId: character.id, jobKey: job.key, action: 'apply' });
  assert.equal(result.ok, false);

  const employmentCount = await db.$count(characterJobs, eq(characterJobs.characterId, character.id));
  const eventCount = await db.$count(playerEvents, eq(playerEvents.characterId, character.id));
  assert.equal(employmentCount, 0);
  assert.equal(eventCount, 0);
});
