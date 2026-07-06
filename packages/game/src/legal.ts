export type HeatDecayInput = {
  heat: number;
  legalKnowledge: number;
  hoursElapsed: number;
};

export function calculateHeatDecay(input: HeatDecayInput): number {
  if (input.heat <= 0 || input.hoursElapsed <= 0) {
    return 0;
  }

  const decayPerHour = 1 + Math.floor(Math.max(0, input.legalKnowledge) / 8);
  return Math.min(input.heat, Math.floor(input.hoursElapsed * decayPerHour));
}

export type BribeInput = {
  heat: number;
  intelligence: number;
  cash: number;
  roll?: number;
};

export function calculateBribeAttempt(input: BribeInput) {
  const heat = Math.max(0, input.heat);
  const baseCost = 100 + heat * 35;
  const successChance = Math.max(0.1, Math.min(0.85, 0.45 + input.intelligence * 0.015 - heat * 0.01));
  const success = (input.roll ?? Math.random()) <= successChance;
  const heatReduction = success ? Math.max(1, Math.ceil(heat * 0.35)) : 0;
  const extraHeat = success ? 0 : Math.max(1, Math.ceil(heat * 0.1));

  return {
    cost: baseCost,
    successChance: Number(successChance.toFixed(4)),
    success,
    heatReduction,
    extraHeat,
    canAfford: input.cash >= baseCost,
  };
}

export type LawyerInput = {
  heat: number;
  intelligence: number;
  cash: number;
  tier: 'public' | 'street' | 'firm';
};

const lawyerTiers = {
  public: { cost: 50, reductionRate: 0.12, flatReduction: 1 },
  street: { cost: 300, reductionRate: 0.28, flatReduction: 3 },
  firm: { cost: 1000, reductionRate: 0.5, flatReduction: 7 },
} as const;

export function calculateLawyerService(input: LawyerInput) {
  const tier = lawyerTiers[input.tier];
  const heat = Math.max(0, input.heat);
  const intelligenceBonus = Math.floor(Math.max(0, input.intelligence) / 10);
  const heatReduction = Math.min(heat, tier.flatReduction + intelligenceBonus + Math.floor(heat * tier.reductionRate));

  return {
    tier: input.tier,
    cost: tier.cost,
    heatReduction,
    canAfford: input.cash >= tier.cost,
  };
}

export type CareServiceInput = {
  cash: number;
  service: 'basic' | 'private' | 'specialist';
};

const careServices = {
  basic: { cost: 100, healthGain: 15, timeReductionSeconds: 120 },
  private: { cost: 350, healthGain: 35, timeReductionSeconds: 420 },
  specialist: { cost: 900, healthGain: 70, timeReductionSeconds: 900 },
} as const;

export function calculateCareService(input: CareServiceInput) {
  const service = careServices[input.service];
  return { service: input.service, ...service, canAfford: input.cash >= service.cost };
}
