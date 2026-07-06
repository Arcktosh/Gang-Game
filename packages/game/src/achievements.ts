export type ObjectiveCadence = 'daily' | 'weekly';

export type PeriodWindow = {
  start: Date;
  end: Date;
};

export function clampProgress(progress: number, target: number) {
  return Math.max(0, Math.min(Math.floor(progress), Math.max(1, Math.floor(target))));
}

export function isProgressComplete(progress: number, target: number) {
  return clampProgress(progress, target) >= Math.max(1, Math.floor(target));
}

export function getObjectivePeriod(cadence: ObjectiveCadence, now = new Date()): PeriodWindow {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  if (cadence === 'weekly') {
    const day = start.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + (cadence === 'weekly' ? 7 : 1));

  return { start, end };
}

export function calculateProfileScore(input: { achievementPoints: number; objectivePoints: number; level: number; reputationBonus?: number }) {
  return Math.max(0, input.achievementPoints + input.objectivePoints + input.level * 10 + (input.reputationBonus ?? 0));
}

export function calculateObjectiveReward(input: { rewardCash: number; rewardExperience: number; cadence: string }) {
  const cadenceMultiplier = input.cadence === 'weekly' ? 1 : 1;
  return {
    cash: Math.max(0, Math.floor(input.rewardCash * cadenceMultiplier)),
    experience: Math.max(0, Math.floor(input.rewardExperience * cadenceMultiplier)),
  };
}
