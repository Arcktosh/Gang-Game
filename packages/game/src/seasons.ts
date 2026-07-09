export type SeasonRankBand = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';

export function calculateSeasonPoints(input: {
  level: number;
  experience: number;
  cash: number;
  bank: number;
  profileScore: number;
  achievementPoints: number;
  objectivePoints: number;
  factionPower?: number;
  gamblingReputation?: number;
}) {
  const levelPoints = input.level * 40;
  const experiencePoints = Math.floor(input.experience / 20);
  const wealthPoints = Math.floor((input.cash + input.bank) / 500);
  const profilePoints = Math.floor(input.profileScore / 2);
  const achievementPoints = input.achievementPoints;
  const objectivePoints = input.objectivePoints;
  const socialPoints = Math.floor((input.factionPower ?? 0) / 5);
  const gamblingPoints = Math.floor((input.gamblingReputation ?? 0) / 2);

  return Math.max(
    0,
    levelPoints +
      experiencePoints +
      wealthPoints +
      profilePoints +
      achievementPoints +
      objectivePoints +
      socialPoints +
      gamblingPoints,
  );
}

export function getSeasonRankBand(points: number): SeasonRankBand {
  if (points >= 3000) return 'legend';
  if (points >= 1500) return 'platinum';
  if (points >= 750) return 'gold';
  if (points >= 300) return 'silver';
  return 'bronze';
}

export function calculatePrestigeReadiness(input: {
  level: number;
  profileScore: number;
  cash: number;
  bank: number;
  prestigeLevel: number;
}) {
  const requiredLevel = 10 + input.prestigeLevel * 2;
  const requiredProfileScore = 1000 + input.prestigeLevel * 350;
  const requiredNetWorth = 50000 + input.prestigeLevel * 25000;
  const netWorth = input.cash + input.bank;

  return {
    requiredLevel,
    requiredProfileScore,
    requiredNetWorth,
    netWorth,
    ready:
      input.level >= requiredLevel &&
      input.profileScore >= requiredProfileScore &&
      netWorth >= requiredNetWorth,
  };
}

export function calculateLegacyPoints(input: {
  level: number;
  experience: number;
  profileScore: number;
  cash: number;
  bank: number;
  seasonPoints: number;
  prestigeLevel: number;
}) {
  const netWorth = input.cash + input.bank;
  return Math.max(
    1,
    Math.floor(
      input.level * 2 +
        input.experience / 500 +
        input.profileScore / 100 +
        netWorth / 10000 +
        input.seasonPoints / 1000 +
        input.prestigeLevel,
    ),
  );
}

export function calculatePrestigeReset(input: {
  legacyPointsAwarded: number;
  totalLegacyPoints: number;
  prestigeLevel: number;
}) {
  return {
    cash: 500 + input.totalLegacyPoints * 25,
    bank: 0,
    level: 1,
    experience: 0,
    health: 100,
    energy: 100 + Math.min(50, input.totalLegacyPoints),
    nerve: 20 + Math.min(30, Math.floor(input.totalLegacyPoints / 2)),
    heat: 0,
    prestigeLevel: input.prestigeLevel + 1,
  };
}

export function getPrestigePerkKey(prestigeLevel: number) {
  if (prestigeLevel >= 5) return 'legacy_empire';
  if (prestigeLevel >= 3) return 'legacy_operator';
  if (prestigeLevel >= 1) return 'legacy_starter';
  return 'legacy_seed';
}
