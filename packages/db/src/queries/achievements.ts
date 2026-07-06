import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { calculateObjectiveReward, calculateProfileScore, clampProgress, getObjectivePeriod, isProgressComplete, type ObjectiveCadence } from '@drugdeal/game';
import { db } from '../client';
import {
  achievementDefinitions,
  characterAchievements,
  characterObjectives,
  characterTitles,
  characters,
  contracts,
  courseEnrollments,
  crimeAttempts,
  factionMembers,
  gamblingWagers,
  jobRuns,
  objectiveDefinitions,
  playerEvents,
  shopLedgerEntries,
  trainingSessions,
} from '../schema';

const EVENT_METRIC_TYPES: Record<string, string[]> = {
  market_trades: ['market_item_bought', 'market_item_sold'],
};

type Tx = any;
type Window = { start: Date; end: Date } | null;

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  return tx.query.characters.findFirst({ where: and(eq(characters.id, characterId), eq(characters.userId, userId)) });
}

function withWindow<TTable extends { createdAt?: any; startedAt?: any }>(base: any, column: any, window: Window) {
  if (!window) {
    return base;
  }

  return and(base, gte(column, window.start), lt(column, window.end));
}

async function firstCount(query: any) {
  const [row] = await query;
  return Number(row?.count ?? 0);
}

async function countMetric(tx: Tx, characterId: string, metricKey: string, window: Window = null) {
  switch (metricKey) {
    case 'character_created':
      return 1;
    case 'jobs_completed':
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(jobRuns)
          .where(withWindow(eq(jobRuns.characterId, characterId), jobRuns.startedAt, window)),
      );
    case 'crimes_successful':
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(crimeAttempts)
          .where(withWindow(and(eq(crimeAttempts.characterId, characterId), eq(crimeAttempts.outcome, 'success')), crimeAttempts.createdAt, window)),
      );
    case 'crimes_attempted':
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(crimeAttempts)
          .where(withWindow(eq(crimeAttempts.characterId, characterId), crimeAttempts.createdAt, window)),
      );
    case 'training_completed':
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(trainingSessions)
          .where(withWindow(eq(trainingSessions.characterId, characterId), trainingSessions.startedAt, window)),
      );
    case 'courses_completed':
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(courseEnrollments)
          .where(withWindow(eq(courseEnrollments.characterId, characterId), courseEnrollments.startedAt, window)),
      );
    case 'market_trades': {
      const eventTypes = EVENT_METRIC_TYPES.market_trades;
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(playerEvents)
          .where(withWindow(and(eq(playerEvents.characterId, characterId), inArray(playerEvents.type, eventTypes)), playerEvents.createdAt, window)),
      );
    }
    case 'shop_items_sold': {
      const [row] = await tx
        .select({ count: sql<number>`coalesce(sum(${shopLedgerEntries.quantity}), 0)::int` })
        .from(shopLedgerEntries)
        .where(withWindow(eq(shopLedgerEntries.sellerCharacterId, characterId), shopLedgerEntries.createdAt, window));
      return Number(row?.count ?? 0);
    }
    case 'contracts_completed':
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(contracts)
          .where(withWindow(and(eq(contracts.assignedToCharacterId, characterId), eq(contracts.status, 'completed')), contracts.completedAt, window)),
      );
    case 'faction_joined':
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(factionMembers)
          .where(and(eq(factionMembers.characterId, characterId), eq(factionMembers.status, 'active'))),
      );
    case 'gambling_wagers':
      return firstCount(
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(gamblingWagers)
          .where(withWindow(eq(gamblingWagers.characterId, characterId), gamblingWagers.createdAt, window)),
      );
    default:
      return 0;
  }
}

async function ensureCurrentObjectives(tx: Tx, characterId: string, now = new Date()) {
  const definitions = await tx.query.objectiveDefinitions.findMany({ where: eq(objectiveDefinitions.isActive, true) });

  for (const definition of definitions) {
    const cadence = definition.cadence === 'weekly' ? 'weekly' : 'daily';
    const period = getObjectivePeriod(cadence as ObjectiveCadence, now);

    await tx
      .insert(characterObjectives)
      .values({
        characterId,
        objectiveKey: definition.key,
        cadence,
        periodStart: period.start,
        periodEnd: period.end,
        target: definition.target,
      })
      .onConflictDoNothing();
  }
}

async function syncAchievements(tx: Tx, characterId: string) {
  const definitions = await tx.query.achievementDefinitions.findMany({ where: eq(achievementDefinitions.isActive, true) });

  for (const definition of definitions) {
    const progress = clampProgress(await countMetric(tx, characterId, definition.metricKey), definition.target);
    const completed = isProgressComplete(progress, definition.target);
    const existing = await tx.query.characterAchievements.findFirst({ where: and(eq(characterAchievements.characterId, characterId), eq(characterAchievements.achievementKey, definition.key)) });

    if (!existing) {
      await tx.insert(characterAchievements).values({
        characterId,
        achievementKey: definition.key,
        progress,
        target: definition.target,
        isCompleted: completed,
        completedAt: completed ? sql`now()` : null,
      });
      continue;
    }

    await tx
      .update(characterAchievements)
      .set({
        progress,
        target: definition.target,
        isCompleted: completed,
        completedAt: completed && !existing.completedAt ? sql`now()` : existing.completedAt,
        updatedAt: sql`now()`,
      })
      .where(and(eq(characterAchievements.characterId, characterId), eq(characterAchievements.achievementKey, definition.key)));
  }
}

async function syncObjectives(tx: Tx, characterId: string, now = new Date()) {
  await ensureCurrentObjectives(tx, characterId, now);

  const activeObjectives = await tx
    .select({
      objective: characterObjectives,
      definition: objectiveDefinitions,
    })
    .from(characterObjectives)
    .innerJoin(objectiveDefinitions, eq(characterObjectives.objectiveKey, objectiveDefinitions.key))
    .where(and(eq(characterObjectives.characterId, characterId), eq(characterObjectives.status, 'active'), gte(characterObjectives.periodEnd, now)));

  for (const row of activeObjectives) {
    const progress = clampProgress(await countMetric(tx, characterId, row.definition.metricKey, { start: row.objective.periodStart, end: row.objective.periodEnd }), row.objective.target);
    const completed = isProgressComplete(progress, row.objective.target);

    await tx
      .update(characterObjectives)
      .set({
        progress,
        status: completed ? 'completed' : 'active',
        completedAt: completed && !row.objective.completedAt ? sql`now()` : row.objective.completedAt,
        updatedAt: sql`now()`,
      })
      .where(eq(characterObjectives.id, row.objective.id));
  }
}

export async function getCharacterProgressionProfile(input: { userId: string; characterId: string }) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return null;
    }

    await syncAchievements(tx, character.id);
    await syncObjectives(tx, character.id);

    const achievements = await tx
      .select({ progress: characterAchievements, definition: achievementDefinitions })
      .from(characterAchievements)
      .innerJoin(achievementDefinitions, eq(characterAchievements.achievementKey, achievementDefinitions.key))
      .where(eq(characterAchievements.characterId, character.id))
      .orderBy(desc(characterAchievements.isCompleted), desc(characterAchievements.completedAt), achievementDefinitions.category, achievementDefinitions.title);

    const objectives = await tx
      .select({ objective: characterObjectives, definition: objectiveDefinitions })
      .from(characterObjectives)
      .innerJoin(objectiveDefinitions, eq(characterObjectives.objectiveKey, objectiveDefinitions.key))
      .where(and(eq(characterObjectives.characterId, character.id), gte(characterObjectives.periodEnd, new Date())))
      .orderBy(characterObjectives.cadence, characterObjectives.periodEnd, objectiveDefinitions.title);

    const titles = await tx.query.characterTitles.findMany({ where: eq(characterTitles.characterId, character.id), orderBy: desc(characterTitles.earnedAt) });
    const completedAchievements = achievements.filter((entry: any) => entry.progress.isCompleted);
    const claimedObjectives = objectives.filter((entry: any) => entry.objective.claimedAt);
    const achievementPoints = completedAchievements.reduce((total: number, entry: any) => total + Number(entry.definition.points ?? 0), 0);
    const objectivePoints = claimedObjectives.reduce((total: number, entry: any) => total + Number(entry.definition.rewardPoints ?? 0), 0);

    return {
      characterId: character.id,
      activeTitle: titles.find((title: any) => title.isActive) ?? null,
      titles,
      summary: {
        achievementPoints,
        objectivePoints,
        profileScore: calculateProfileScore({ achievementPoints, objectivePoints, level: character.level, reputationBonus: character.legalReputation + character.gamblingReputation }),
        completedAchievements: completedAchievements.length,
        totalAchievements: achievements.length,
        claimableAchievements: achievements.filter((entry: any) => entry.progress.isCompleted && !entry.progress.claimedAt).length,
        claimableObjectives: objectives.filter((entry: any) => entry.objective.status === 'completed' && !entry.objective.claimedAt).length,
      },
      achievements,
      objectives,
    };
  });
}

export async function claimAchievement(input: { userId: string; characterId: string; achievementKey: string }) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    await syncAchievements(tx, character.id);

    const [row] = await tx
      .select({ progress: characterAchievements, definition: achievementDefinitions })
      .from(characterAchievements)
      .innerJoin(achievementDefinitions, eq(characterAchievements.achievementKey, achievementDefinitions.key))
      .where(and(eq(characterAchievements.characterId, character.id), eq(characterAchievements.achievementKey, input.achievementKey)))
      .limit(1);

    if (!row) {
      return { ok: false as const, code: 'not_found', message: 'Achievement not found.' };
    }

    if (!row.progress.isCompleted) {
      return { ok: false as const, code: 'forbidden', message: 'Achievement is not complete yet.' };
    }

    if (row.progress.claimedAt) {
      return { ok: false as const, code: 'conflict', message: 'Achievement has already been claimed.' };
    }

    await tx
      .update(characterAchievements)
      .set({ claimedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(characterAchievements.characterId, character.id), eq(characterAchievements.achievementKey, input.achievementKey)));

    await tx
      .update(characters)
      .set({ cash: character.cash + row.definition.cashReward, experience: character.experience + row.definition.experienceReward, updatedAt: sql`now()` })
      .where(eq(characters.id, character.id));

    if (row.definition.titleRewardKey && row.definition.titleRewardName) {
      await tx
        .insert(characterTitles)
        .values({ characterId: character.id, titleKey: row.definition.titleRewardKey, title: row.definition.titleRewardName, source: 'achievement' })
        .onConflictDoNothing();
    }

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      visibility: 'public',
      type: 'achievement_claimed',
      payload: { achievementKey: input.achievementKey, title: row.definition.title, cashReward: row.definition.cashReward, experienceReward: row.definition.experienceReward },
    });

    return { ok: true as const, data: { achievement: row.definition } };
  });
}

export async function claimObjective(input: { userId: string; characterId: string; objectiveId: string }) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    await syncObjectives(tx, character.id);

    const [row] = await tx
      .select({ objective: characterObjectives, definition: objectiveDefinitions })
      .from(characterObjectives)
      .innerJoin(objectiveDefinitions, eq(characterObjectives.objectiveKey, objectiveDefinitions.key))
      .where(and(eq(characterObjectives.id, input.objectiveId), eq(characterObjectives.characterId, character.id)))
      .limit(1);

    if (!row) {
      return { ok: false as const, code: 'not_found', message: 'Objective not found.' };
    }

    if (row.objective.status !== 'completed') {
      return { ok: false as const, code: 'forbidden', message: 'Objective is not complete yet.' };
    }

    if (row.objective.claimedAt) {
      return { ok: false as const, code: 'conflict', message: 'Objective has already been claimed.' };
    }

    const reward = calculateObjectiveReward({ rewardCash: row.definition.rewardCash, rewardExperience: row.definition.rewardExperience, cadence: row.definition.cadence });

    await tx.update(characterObjectives).set({ status: 'claimed', claimedAt: sql`now()`, updatedAt: sql`now()` }).where(eq(characterObjectives.id, row.objective.id));
    await tx.update(characters).set({ cash: character.cash + reward.cash, experience: character.experience + reward.experience, updatedAt: sql`now()` }).where(eq(characters.id, character.id));
    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: 'objective_claimed',
      payload: { objectiveId: row.objective.id, objectiveKey: row.definition.key, cashReward: reward.cash, experienceReward: reward.experience },
    });

    return { ok: true as const, data: { objective: row.definition, reward } };
  });
}

export async function setActiveTitle(input: { userId: string; characterId: string; titleKey: string | null }) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    if (input.titleKey) {
      const ownedTitle = await tx.query.characterTitles.findFirst({ where: and(eq(characterTitles.characterId, character.id), eq(characterTitles.titleKey, input.titleKey)) });
      if (!ownedTitle) {
        return { ok: false as const, code: 'not_found', message: 'Title not found.' };
      }
    }

    await tx.update(characterTitles).set({ isActive: false }).where(eq(characterTitles.characterId, character.id));

    if (input.titleKey) {
      await tx.update(characterTitles).set({ isActive: true }).where(and(eq(characterTitles.characterId, character.id), eq(characterTitles.titleKey, input.titleKey)));
    }

    await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'title_changed', payload: { titleKey: input.titleKey } });
    return { ok: true as const, data: { titleKey: input.titleKey } };
  });
}
