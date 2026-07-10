export type ResourceRegenerationInput = {
  energy: number;
  nerve: number;
  maxEnergy: number;
  maxNerve: number;
  endurance: number;
  lastResourceTickAt: Date | string | null;
  now?: Date;
};

export type ResourceRegenerationResult = {
  energy: number;
  nerve: number;
  changed: boolean;
  minutesElapsed: number;
};

export function calculateRegeneratedResources(input: ResourceRegenerationInput): ResourceRegenerationResult {
  const now = input.now ?? new Date();
  const lastTickAt = input.lastResourceTickAt ? new Date(input.lastResourceTickAt) : now;
  const minutesElapsed = Math.max(0, Math.floor((now.getTime() - lastTickAt.getTime()) / 60_000));

  if (minutesElapsed <= 0) {
    return { energy: input.energy, nerve: input.nerve, changed: false, minutesElapsed: 0 };
  }

  const energyPerMinute = 1 + Math.floor(Math.max(0, input.endurance) / 10);
  const nerveEveryFiveMinutes = 1 + Math.floor(Math.max(0, input.endurance) / 25);
  const energyGain = minutesElapsed * energyPerMinute;
  const nerveGain = Math.floor(minutesElapsed / 5) * nerveEveryFiveMinutes;
  const energy = Math.min(input.maxEnergy, input.energy + energyGain);
  const nerve = Math.min(input.maxNerve, input.nerve + nerveGain);

  return {
    energy,
    nerve,
    changed: energy !== input.energy || nerve !== input.nerve,
    minutesElapsed,
  };
}

export function calculateMaxEnergy(endurance: number): number {
  return 100 + Math.max(0, endurance - 1) * 2;
}

export function calculateMaxNerve(level: number): number {
  return 20 + Math.max(0, level - 1);
}
