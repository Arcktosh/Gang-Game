import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  calculateLegacyPoints,
  calculatePrestigeReadiness,
  calculatePrestigeReset,
  calculateSeasonPoints,
  getPrestigePerkKey,
  getSeasonRankBand,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characterSeasonProgress,
  characterTitles,
  characters,
  financialTransactions,
  legacyPerks,
  legacyRecords,
  playerEvents,
  seasonRewardTiers,
  seasons,
} from '../schema';
import { getCharacterProgressionProfile } from './achievements';

type Tx = any;

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  return tx.query.characters.findFirst({ where: and(eq(characters.id, characterId), eq(characters.userId, userId)) });
}

async function getActiveSeason(tx: Tx, now = new Date()) {
  return tx.query.seasons.findFirst({
    where: and(eq(seasons.status, 'active'), lte(seasons.startsAt, now), gte(seasons.endsAt, now)),
    orderBy: desc(seasons.startsAt),
  });
}

async function syncSeasonProgress(tx: Tx, input: { character: any; profile: any; seasonId: string }) {
  const seasonPoints = calculateSeasonPoints({
    level: input.character.level,
    experience: input.character.experience,
    cash: input.character.cash,
    bank: input.character.bank,
    profileScore: input.profile?.summary.profileScore ?? 0,
    achievementPoints: input.profile?.summary.achievementPoints ?? 0,
    objectivePoints: input.profile?.summary.objectivePoints ?? 0,
    gamblingReputation: input.character.gamblingReputation ?? 0,
  });

  await tx
    .insert(characterSeasonProgress)
    .values({ characterId: input.character.id, seasonId: input.seasonId, seasonPoints })
    .onConflictDoUpdate({
      target: [characterSeasonProgress.characterId, characterSeasonProgress.seasonId],
      set: { seasonPoints, updatedAt: sql`now()` },
    });

  await tx.update(characters).set({ seasonPoints, updatedAt: sql`now()` }).where(eq(characters.id, input.character.id));

  return tx.query.characterSeasonProgress.findFirst({
    where: and(eq(characterSeasonProgress.characterId, input.character.id), eq(characterSeasonProgress.seasonId, input.seasonId)),
  });
}

export async function getSeasonProfile(input: { userId: string; characterId: string }) {
  const profile = await getCharacterProgressionProfile(input);

  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return null;
    }

    const season = await getActiveSeason(tx);
    const records = await tx.query.legacyRecords.findMany({
      where: eq(legacyRecords.characterId, character.id),
      orderBy: desc(legacyRecords.createdAt),
      limit: 5,
    });
    const perks = await tx.query.legacyPerks.findMany({ where: eq(legacyPerks.characterId, character.id) });

    const prestigeReadiness = calculatePrestigeReadiness({
      level: character.level,
      profileScore: profile?.summary.profileScore ?? 0,
      cash: character.cash,
      bank: character.bank,
      prestigeLevel: character.prestigeLevel ?? 0,
    });

    if (!season) {
      return {
        character,
        season: null,
        progress: null,
        rewards: [],
        rankBand: 'bronze' as const,
        prestigeReadiness,
        legacyRecords: records,
        legacyPerks: perks,
      };
    }

    const progress = await syncSeasonProgress(tx, { character, profile, seasonId: season.id });
    const rewards = await tx.query.seasonRewardTiers.findMany({
      where: eq(seasonRewardTiers.seasonId, season.id),
      orderBy: asc(seasonRewardTiers.tier),
    });

    return {
      character: { ...character, seasonPoints: progress?.seasonPoints ?? character.seasonPoints },
      season,
      progress,
      rewards,
      rankBand: getSeasonRankBand(progress?.seasonPoints ?? 0),
      prestigeReadiness,
      legacyRecords: records,
      legacyPerks: perks,
    };
  });
}

export async function claimSeasonReward(input: { userId: string; characterId: string; tier: number }) {
  const profile = await getCharacterProgressionProfile({ userId: input.userId, characterId: input.characterId });

  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found' as const, message: 'Character not found.' };
    }

    const season = await getActiveSeason(tx);

    if (!season) {
      return { ok: false as const, code: 'not_found' as const, message: 'No active season is available.' };
    }

    const progress = await syncSeasonProgress(tx, { character, profile, seasonId: season.id });
    const reward = await tx.query.seasonRewardTiers.findFirst({ where: and(eq(seasonRewardTiers.seasonId, season.id), eq(seasonRewardTiers.tier, input.tier)) });

    if (!progress || !reward) {
      return { ok: false as const, code: 'not_found' as const, message: 'Season reward not found.' };
    }

    if (input.tier <= progress.highestClaimedTier) {
      return { ok: false as const, code: 'conflict' as const, message: 'This season reward has already been claimed.' };
    }

    if (input.tier !== progress.highestClaimedTier + 1) {
      return { ok: false as const, code: 'conflict' as const, message: 'Claim season rewards in order.' };
    }

    if (progress.seasonPoints < reward.pointsRequired) {
      return { ok: false as const, code: 'forbidden' as const, message: 'Not enough season points for this reward.' };
    }

    await tx
      .update(characters)
      .set({
        cash: character.cash + reward.rewardCash,
        experience: character.experience + reward.rewardExperience,
        legacyPoints: (character.legacyPoints ?? 0) + reward.rewardLegacyPoints,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, character.id));

    await tx
      .update(characterSeasonProgress)
      .set({ highestClaimedTier: reward.tier, updatedAt: sql`now()` })
      .where(and(eq(characterSeasonProgress.characterId, character.id), eq(characterSeasonProgress.seasonId, season.id)));

    if (reward.titleRewardKey && reward.titleRewardName) {
      await tx
        .insert(characterTitles)
        .values({ characterId: character.id, titleKey: reward.titleRewardKey, title: reward.titleRewardName, source: 'season' })
        .onConflictDoNothing();
    }

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'system',
      amount: String(reward.rewardCash),
      description: `Claimed season tier ${reward.tier}: ${reward.title}`,
      metadata: { seasonKey: season.key, tier: reward.tier },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      visibility: 'public',
      type: 'season_reward_claimed',
      payload: { seasonKey: season.key, tier: reward.tier, title: reward.title },
    });

    return { ok: true as const, data: { season, reward } };
  });
}

export async function prestigeCharacter(input: { userId: string; characterId: string }) {
  const profile = await getCharacterProgressionProfile({ userId: input.userId, characterId: input.characterId });

  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found' as const, message: 'Character not found.' };
    }

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden' as const, message: 'Character must be free before entering legacy prestige.' };
    }

    const readiness = calculatePrestigeReadiness({
      level: character.level,
      profileScore: profile?.summary.profileScore ?? 0,
      cash: character.cash,
      bank: character.bank,
      prestigeLevel: character.prestigeLevel ?? 0,
    });

    if (!readiness.ready) {
      return { ok: false as const, code: 'forbidden' as const, message: 'Prestige requirements have not been met.', details: readiness };
    }

    const legacyPointsAwarded = calculateLegacyPoints({
      level: character.level,
      experience: character.experience,
      profileScore: profile?.summary.profileScore ?? 0,
      cash: character.cash,
      bank: character.bank,
      seasonPoints: character.seasonPoints ?? 0,
      prestigeLevel: character.prestigeLevel ?? 0,
    });
    const totalLegacyPoints = (character.legacyPoints ?? 0) + legacyPointsAwarded;
    const reset = calculatePrestigeReset({ legacyPointsAwarded, totalLegacyPoints, prestigeLevel: character.prestigeLevel ?? 0 });
    const nextPrestigeLevel = (character.prestigeLevel ?? 0) + 1;
    const perkKey = getPrestigePerkKey(nextPrestigeLevel);

    await tx.insert(legacyRecords).values({
      userId: input.userId,
      characterId: character.id,
      prestigeLevel: nextPrestigeLevel,
      legacyPointsAwarded,
      retiredLevel: character.level,
      retiredExperience: character.experience,
      retiredCash: character.cash,
      retiredBank: character.bank,
      profileScore: profile?.summary.profileScore ?? 0,
      snapshot: {
        stats: {
          intelligence: character.intelligence,
          labour: character.labour,
          endurance: character.endurance,
          strength: character.strength,
          stamina: character.stamina,
          defense: character.defense,
          dexterity: character.dexterity,
        },
        seasonPoints: character.seasonPoints,
        heat: character.heat,
      },
    });

    await tx
      .update(characters)
      .set({
        cash: reset.cash,
        bank: reset.bank,
        level: reset.level,
        experience: reset.experience,
        health: reset.health,
        energy: reset.energy,
        maxEnergy: reset.energy,
        nerve: reset.nerve,
        maxNerve: reset.nerve,
        heat: reset.heat,
        prestigeLevel: reset.prestigeLevel,
        legacyPoints: totalLegacyPoints,
        seasonPoints: 0,
        status: 'free',
        statusUntil: null,
        statusReason: null,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, character.id));

    await tx
      .insert(legacyPerks)
      .values({ characterId: character.id, perkKey, tier: nextPrestigeLevel, source: 'prestige' })
      .onConflictDoUpdate({ target: [legacyPerks.characterId, legacyPerks.perkKey], set: { tier: nextPrestigeLevel } });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      visibility: 'public',
      type: 'character_prestiged',
      payload: { prestigeLevel: nextPrestigeLevel, legacyPointsAwarded, totalLegacyPoints, perkKey },
    });

    return { ok: true as const, data: { prestigeLevel: nextPrestigeLevel, legacyPointsAwarded, totalLegacyPoints, perkKey } };
  });
}
