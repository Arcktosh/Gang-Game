export type CrimeChanceInput = { intelligence: number; dexterity: number; heat: number; difficulty: number };

export function calculateCrimeSuccessChance(input: CrimeChanceInput): number {
  const statBonus = input.intelligence * 0.015 + input.dexterity * 0.02;
  const heatPenalty = input.heat * 0.01;
  const difficultyPenalty = input.difficulty * 0.05;
  const chance = 0.5 + statBonus - heatPenalty - difficultyPenalty;
  return Math.max(0.05, Math.min(0.95, Number(chance.toFixed(4))));
}

export type FailedCrimeConsequenceInput = {
  heat: number;
  jailRisk: number;
  difficulty: number;
  endurance: number;
  defense: number;
};

export type FailedCrimeConsequence = {
  type: 'hospital' | 'jail' | 'none';
  severity: number;
  durationSeconds: number;
  healthLost: number;
  fine: number;
  bill: number;
};

export function calculateFailedCrimeConsequence(input: FailedCrimeConsequenceInput, roll = Math.random()): FailedCrimeConsequence {
  const jailChance = Math.max(0.02, Math.min(0.7, input.jailRisk * 0.04 + input.heat * 0.008));
  const injuryChance = Math.max(0.05, Math.min(0.65, input.difficulty * 0.08 - input.defense * 0.01));

  if (roll <= jailChance) {
    const severity = Math.max(1, Math.min(5, Math.ceil((input.heat + input.jailRisk + input.difficulty) / 8)));
    return {
      type: 'jail',
      severity,
      durationSeconds: 300 + severity * 300,
      healthLost: 0,
      fine: severity * 75,
      bill: 0,
    };
  }

  if (roll <= jailChance + injuryChance) {
    const severity = Math.max(1, Math.min(5, Math.ceil((input.difficulty + input.jailRisk) / 4)));
    const enduranceReduction = Math.max(0, input.endurance * 2);
    const healthLost = Math.max(5, severity * 14 - enduranceReduction);

    return {
      type: 'hospital',
      severity,
      durationSeconds: 180 + severity * 240,
      healthLost,
      fine: 0,
      bill: severity * 50,
    };
  }

  return { type: 'none', severity: 0, durationSeconds: 0, healthLost: 0, fine: 0, bill: 0 };
}
