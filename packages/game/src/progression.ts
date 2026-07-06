export type TrainingCostInput = {
  baseEnergyCost: number;
  currentStat: number;
};

export function calculateScaledTrainingEnergyCost(input: TrainingCostInput): number {
  return Math.max(input.baseEnergyCost, Math.floor(input.baseEnergyCost + input.currentStat * 0.15));
}

export function calculateExperienceForLevel(level: number): number {
  const normalizedLevel = Math.max(1, Math.floor(level));
  return Math.pow(normalizedLevel - 1, 2) * 100;
}

export function calculateLevelFromExperience(experience: number): number {
  const normalizedExperience = Math.max(0, Math.floor(experience));
  return Math.max(1, Math.floor(Math.sqrt(normalizedExperience / 100)) + 1);
}

export type ProgressionRewards = {
  maxNerve: number;
  energyCapBonus: number;
  title: string;
};

export function calculateProgressionRewards(level: number): ProgressionRewards {
  const normalizedLevel = Math.max(1, Math.floor(level));

  const maxNerve = 20 + normalizedLevel - 1;

  if (normalizedLevel >= 25) {
    return { maxNerve, energyCapBonus: 24, title: 'Kingpin' };
  }

  if (normalizedLevel >= 15) {
    return { maxNerve, energyCapBonus: 16, title: 'Boss' };
  }

  if (normalizedLevel >= 8) {
    return { maxNerve, energyCapBonus: 8, title: 'Operator' };
  }

  if (normalizedLevel >= 3) {
    return { maxNerve, energyCapBonus: 2, title: 'Runner' };
  }

  return { maxNerve, energyCapBonus: 0, title: 'New Blood' };
}

export type ProgressionSnapshot = {
  level: number;
  experience: number;
  currentLevelExperience: number;
  nextLevelExperience: number;
  experienceIntoLevel: number;
  experienceForNextLevel: number;
  progressPercent: number;
  rewards: ProgressionRewards;
};

export function calculateProgressionFromExperience(experience: number): ProgressionSnapshot {
  const normalizedExperience = Math.max(0, Math.floor(experience));
  const level = calculateLevelFromExperience(normalizedExperience);
  const currentLevelExperience = calculateExperienceForLevel(level);
  const nextLevelExperience = calculateExperienceForLevel(level + 1);
  const experienceIntoLevel = Math.max(0, normalizedExperience - currentLevelExperience);
  const experienceForNextLevel = Math.max(1, nextLevelExperience - currentLevelExperience);
  const progressPercent = Number(Math.min(100, Math.max(0, (experienceIntoLevel / experienceForNextLevel) * 100)).toFixed(2));

  return {
    level,
    experience: normalizedExperience,
    currentLevelExperience,
    nextLevelExperience,
    experienceIntoLevel,
    experienceForNextLevel,
    progressPercent,
    rewards: calculateProgressionRewards(level),
  };
}

export type ActionExperienceInput = {
  base: number;
  difficulty?: number;
  success?: boolean;
};

export function calculateActionExperience(input: ActionExperienceInput): number {
  const base = Math.max(1, Math.floor(input.base));
  const difficulty = Math.max(1, Math.floor(input.difficulty ?? 1));
  const successMultiplier = input.success === false ? 0.25 : 1;
  return Math.max(1, Math.floor((base + difficulty * 2) * successMultiplier));
}
