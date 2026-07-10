export type TrainingCostInput = {
  baseEnergyCost: number;
  currentStat: number;
};

export function calculateScaledTrainingEnergyCost(input: TrainingCostInput): number {
  return Math.max(input.baseEnergyCost, Math.floor(input.baseEnergyCost + input.currentStat * 0.15));
}

export type TimedProgressionPlanInput = {
  baseEnergyCost: number;
  baseCashCost: number;
  baseDurationSeconds: number;
  currentStat?: number;
  now?: Date;
};

export type TimedProgressionPlan = {
  energyCost: number;
  cashCost: number;
  durationSeconds: number;
  startedAt: Date;
  dueAt: Date;
};

export function calculateTimedProgressionPlan(input: TimedProgressionPlanInput): TimedProgressionPlan {
  const startedAt = input.now ?? new Date();
  const currentStat = Math.max(0, Math.floor(input.currentStat ?? 0));
  const baseDurationSeconds = Math.max(60, Math.floor(input.baseDurationSeconds));
  const statDurationPenalty = currentStat > 0 ? Math.floor(currentStat / 10) * 60 : 0;
  const durationSeconds = Math.min(86_400, baseDurationSeconds + statDurationPenalty);
  const energyCost = calculateScaledTrainingEnergyCost({
    baseEnergyCost: Math.max(0, Math.floor(input.baseEnergyCost)),
    currentStat,
  });
  const cashCost = Math.max(0, Math.floor(input.baseCashCost));

  return {
    energyCost,
    cashCost,
    durationSeconds,
    startedAt,
    dueAt: new Date(startedAt.getTime() + durationSeconds * 1000),
  };
}

export type CourseRequirementInput = {
  characterLevel: number;
  completedCourseKeys: string[];
  requiredLevel?: number | null;
  prerequisiteCourseKey?: string | null;
};

export type CourseRequirementResult =
  | { ok: true; code: 'ok'; message: 'Course requirements met.' }
  | { ok: false; code: 'level_required'; message: string; requiredLevel: number }
  | { ok: false; code: 'course_required'; message: string; prerequisiteCourseKey: string };

export function evaluateCourseRequirements(input: CourseRequirementInput): CourseRequirementResult {
  const characterLevel = Math.max(1, Math.floor(input.characterLevel));
  const requiredLevel = Math.max(1, Math.floor(input.requiredLevel ?? 1));

  if (characterLevel < requiredLevel) {
    return {
      ok: false,
      code: 'level_required',
      message: `Requires level ${requiredLevel}.`,
      requiredLevel,
    };
  }

  const prerequisiteCourseKey = input.prerequisiteCourseKey?.trim();

  if (prerequisiteCourseKey && !new Set(input.completedCourseKeys).has(prerequisiteCourseKey)) {
    return {
      ok: false,
      code: 'course_required',
      message: `Requires course ${prerequisiteCourseKey}.`,
      prerequisiteCourseKey,
    };
  }

  return { ok: true, code: 'ok', message: 'Course requirements met.' };
}

export type ProgressionQueueSnapshotInput = {
  training: Array<{ status: string; dueAt?: Date | string | null }>;
  courses: Array<{ status: string; dueAt?: Date | string | null }>;
  now?: Date;
};

export type ProgressionQueueSnapshot = {
  activeTraining: number;
  activeCourses: number;
  overdueCompletions: number;
  nextDueAt: Date | null;
};

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function summarizeProgressionQueue(input: ProgressionQueueSnapshotInput): ProgressionQueueSnapshot {
  const now = input.now ?? new Date();
  const scheduledTraining = input.training.filter((entry) => entry.status === 'scheduled');
  const scheduledCourses = input.courses.filter((entry) => entry.status === 'scheduled');
  const dueDates = [...scheduledTraining, ...scheduledCourses]
    .map((entry) => coerceDate(entry.dueAt))
    .filter((date): date is Date => Boolean(date))
    .sort((left, right) => left.getTime() - right.getTime());

  return {
    activeTraining: scheduledTraining.length,
    activeCourses: scheduledCourses.length,
    overdueCompletions: dueDates.filter((date) => date.getTime() <= now.getTime()).length,
    nextDueAt: dueDates[0] ?? null,
  };
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
