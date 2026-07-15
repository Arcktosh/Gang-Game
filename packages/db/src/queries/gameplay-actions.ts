import { and, eq, sql } from 'drizzle-orm';
import {
  calculateActionExperience,
  calculateCrimeSuccessChance,
  calculateFailedCrimeConsequence,
  calculateJobPayout,
  calculateProgressionFromExperience,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characterJobs,
  characters,
  crimeAttempts,
  crimeDefinitions,
  financialTransactions,
  hospitalStays,
  jailSentences,
  jobDefinitions,
  jobRuns,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import { completeJobCharacterUpdate, resolveCrimeCharacterUpdate } from './transaction-safety';

export type GameplayActionFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
};

function failure(code: string, message: string, status: number): GameplayActionFailure {
  return { ok: false, code, message, status };
}

export async function runJobAction(input: {
  userId: string;
  characterId: string;
  jobKey: string;
  action: 'apply' | 'work' | 'resign';
}) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) return failure('not_found', 'Character not found.', 404);

    const refreshedCharacter = await refreshCharacterResources(tx, character);
    if (refreshedCharacter.status !== 'free') return failure('forbidden', 'Character is not available for work.', 403);

    const job = await tx.query.jobDefinitions.findFirst({ where: eq(jobDefinitions.key, input.jobKey) });
    if (!job) return failure('not_found', 'Job not found.', 404);

    const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'job');
    if (!cooldown.ok) return failure(cooldown.code, cooldown.message, 429);

    if (refreshedCharacter.labour < job.requiredLabour || refreshedCharacter.intelligence < job.requiredIntelligence) {
      return failure('forbidden', 'Character does not meet the job requirements.', 403);
    }

    const activeEmployment = await tx.query.characterJobs.findFirst({
      where: and(eq(characterJobs.characterId, refreshedCharacter.id), eq(characterJobs.status, 'active')),
    });

    if (input.action === 'apply') {
      if (activeEmployment) return failure('conflict', 'Character already has an active job.', 409);
      const [employment] = await tx.insert(characterJobs).values({ characterId: refreshedCharacter.id, jobKey: job.key }).returning();
      await tx.insert(playerEvents).values({
        userId: input.userId,
        characterId: refreshedCharacter.id,
        type: 'job_applied',
        payload: { jobKey: job.key, jobName: job.name, rank: employment.rank },
      });
      return { ok: true as const, employment, character: refreshedCharacter };
    }

    if (!activeEmployment || activeEmployment.jobKey !== job.key) {
      return failure('forbidden', 'Apply for this job before working or resigning.', 403);
    }

    if (input.action === 'resign') {
      const [employment] = await tx
        .update(characterJobs)
        .set({ status: 'resigned', endedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(characterJobs.id, activeEmployment.id), eq(characterJobs.status, 'active')))
        .returning();
      await tx.insert(playerEvents).values({
        userId: input.userId,
        characterId: refreshedCharacter.id,
        type: 'job_resigned',
        payload: { jobKey: job.key, jobName: job.name, rank: activeEmployment.rank, shiftsCompleted: activeEmployment.shiftsCompleted },
      });
      return { ok: true as const, employment, character: refreshedCharacter };
    }

    if (refreshedCharacter.energy < job.energyCost) return failure('forbidden', 'Not enough energy.', 403);

    const payout = calculateJobPayout({ baseWage: job.baseWage + activeEmployment.rank * 10, labour: refreshedCharacter.labour });
    const experienceGain = calculateActionExperience({
      base: Math.max(1, Math.floor(payout / 10)),
      difficulty: job.requiredLabour + job.requiredIntelligence + activeEmployment.rank,
      success: true,
    });
    const [jobRun] = await tx.insert(jobRuns).values({ characterId: refreshedCharacter.id, jobKey: job.key, payout, completedAt: sql`now()` }).returning();
    const characterUpdate = await completeJobCharacterUpdate(tx, {
      characterId: refreshedCharacter.id,
      energyCost: job.energyCost,
      payout,
      experienceGain,
    });
    if (!characterUpdate.ok || !characterUpdate.character) return failure('forbidden', 'Not enough energy.', 403);

    const updatedCharacter = characterUpdate.character;
    const nextShiftsCompleted = activeEmployment.shiftsCompleted + 1;
    const nextRank = Math.min(5, Math.floor(nextShiftsCompleted / 5) + 1);
    const promoted = nextRank > activeEmployment.rank;
    const [employment] = await tx
      .update(characterJobs)
      .set({
        rank: nextRank,
        shiftsCompleted: nextShiftsCompleted,
        totalEarned: sql`${characterJobs.totalEarned} + ${payout}`,
        promotedAt: promoted ? sql`now()` : activeEmployment.promotedAt,
        updatedAt: sql`now()`,
      })
      .where(eq(characterJobs.id, activeEmployment.id))
      .returning();
    const progression = calculateProgressionFromExperience(updatedCharacter.experience);
    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: refreshedCharacter.id,
      type: promoted ? 'job_promoted' : 'job_completed',
      payload: { jobKey: job.key, jobName: job.name, payout, energyCost: job.energyCost, experienceGain, rank: employment.rank, shiftsCompleted: employment.shiftsCompleted, progression },
    });
    const lock = await setActionCooldown({
      tx,
      characterId: refreshedCharacter.id,
      actionType: 'job',
      cooldownSeconds: job.durationSeconds,
      metadata: { jobKey: job.key, rank: employment.rank },
    });
    return { ok: true as const, jobRun, employment, character: updatedCharacter, progression, lock };
  });
}

export async function runCrimeAction(input: {
  userId: string;
  characterId: string;
  crimeKey: string;
  random?: () => number;
}) {
  const random = input.random ?? Math.random;
  const randomInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;

  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });
    if (!character) return failure('not_found', 'Character not found.', 404);

    const refreshedCharacter = await refreshCharacterResources(tx, character);
    if (refreshedCharacter.status !== 'free') return failure('forbidden', 'Character cannot commit crimes right now.', 403);

    const crime = await tx.query.crimeDefinitions.findFirst({ where: eq(crimeDefinitions.key, input.crimeKey) });
    if (!crime) return failure('not_found', 'Crime not found.', 404);

    const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'crime');
    if (!cooldown.ok) return failure(cooldown.code, cooldown.message, 429);
    if (refreshedCharacter.level < crime.requiredLevel || refreshedCharacter.nerve < crime.requiredNerve) {
      return failure('forbidden', 'Character does not meet the crime requirements.', 403);
    }

    const chance = calculateCrimeSuccessChance({
      intelligence: refreshedCharacter.intelligence,
      dexterity: refreshedCharacter.dexterity,
      heat: refreshedCharacter.heat,
      difficulty: crime.difficulty,
    });
    const success = random() <= chance;
    const reward = success ? randomInt(crime.minReward, crime.maxReward) : 0;
    const consequence = success
      ? null
      : calculateFailedCrimeConsequence({
          heat: refreshedCharacter.heat,
          jailRisk: crime.jailRisk,
          difficulty: crime.difficulty,
          endurance: refreshedCharacter.endurance,
          defense: refreshedCharacter.defense,
        });
    const outcome = success ? 'success' : consequence?.type === 'jail' ? 'critical_failure' : 'failure';
    const heatGained = crime.heatGain;
    const experienceGain = calculateActionExperience({ base: success ? crime.difficulty * 4 : 1, difficulty: crime.difficulty, success });
    const [attempt] = await tx.insert(crimeAttempts).values({ characterId: refreshedCharacter.id, crimeKey: crime.key, outcome, reward, heatGained }).returning();
    const statusUntil = consequence && consequence.type !== 'none' ? new Date(Date.now() + consequence.durationSeconds * 1000) : null;
    const nextStatus = consequence?.type === 'jail' ? 'jailed' : consequence?.type === 'hospital' ? 'hospitalized' : 'free';
    const nextHealth = consequence?.type === 'hospital' ? Math.max(1, refreshedCharacter.health - consequence.healthLost) : refreshedCharacter.health;
    const totalPenalty = (consequence?.fine ?? 0) + (consequence?.bill ?? 0);
    const characterUpdate = await resolveCrimeCharacterUpdate(tx, {
      characterId: refreshedCharacter.id,
      cashDelta: reward - totalPenalty,
      nerveCost: crime.requiredNerve,
      heatGain: heatGained,
      health: nextHealth,
      status: nextStatus,
      statusUntil,
      statusReason: consequence && consequence.type !== 'none' ? `${consequence.type}: ${crime.name}` : null,
      experienceGain,
    });
    if (!characterUpdate.ok || !characterUpdate.character) return failure('forbidden', 'Not enough nerve.', 403);

    const updatedCharacter = characterUpdate.character;
    if (consequence?.type === 'hospital' && statusUntil) {
      await tx.insert(hospitalStays).values({ characterId: refreshedCharacter.id, reason: `Injured during ${crime.name}`, severity: consequence.severity, healthLost: consequence.healthLost, bill: consequence.bill, releasedAt: statusUntil });
    }
    if (consequence?.type === 'jail' && statusUntil) {
      await tx.insert(jailSentences).values({ characterId: refreshedCharacter.id, reason: `Arrested after ${crime.name}`, severity: consequence.severity, fine: consequence.fine, releaseAt: statusUntil });
    }
    if (totalPenalty > 0) {
      await tx.insert(financialTransactions).values({ characterId: refreshedCharacter.id, type: 'system', amount: String(-totalPenalty), description: consequence?.type === 'jail' ? `Fine after ${crime.name}` : `Hospital bill after ${crime.name}`, metadata: { crimeKey: crime.key, consequence } });
    }
    const progression = calculateProgressionFromExperience(updatedCharacter.experience);
    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: refreshedCharacter.id,
      type: success ? 'crime_succeeded' : consequence?.type === 'jail' ? 'crime_arrested' : consequence?.type === 'hospital' ? 'crime_injury' : 'crime_failed',
      payload: { crimeKey: crime.key, crimeName: crime.name, chance, reward, heatGained, consequence, experienceGain, progression },
    });
    const lock = await setActionCooldown({ tx, characterId: refreshedCharacter.id, actionType: 'crime', cooldownSeconds: crime.cooldownSeconds, metadata: { crimeKey: crime.key } });
    return { ok: true as const, attempt, character: updatedCharacter, chance, consequence, progression, lock };
  });
}
