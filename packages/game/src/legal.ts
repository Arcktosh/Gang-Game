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
  const successChance = Math.max(
    0.1,
    Math.min(0.85, 0.45 + input.intelligence * 0.015 - heat * 0.01),
  );
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
  const heatReduction = Math.min(
    heat,
    tier.flatReduction + intelligenceBonus + Math.floor(heat * tier.reductionRate),
  );

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

export type LegalPaymentSource = 'cash' | 'bank';

export type JailPaymentInput = {
  fine: number;
  severity: number;
  remainingSeconds: number;
  cash: number;
  bank: number;
  paymentSource: LegalPaymentSource;
};

function getAvailableFunds(input: Pick<JailPaymentInput, 'cash' | 'bank' | 'paymentSource'>) {
  return input.paymentSource === 'bank' ? Math.max(0, input.bank) : Math.max(0, input.cash);
}

export function calculateFineSettlement(input: JailPaymentInput) {
  const severity = Math.max(1, input.severity);
  const cost = Math.max(Math.max(0, input.fine), severity * 75);
  const remainingSeconds = Math.max(0, input.remainingSeconds);
  const heatReduction = Math.min(
    3 + Math.floor(severity / 2),
    severity + Math.ceil(remainingSeconds / 1800),
  );

  return {
    action: 'pay_fine' as const,
    cost,
    paymentSource: input.paymentSource,
    remainingSeconds,
    releaseNow: true,
    heatReduction,
    canAfford: getAvailableFunds(input) >= cost,
  };
}

export function calculateBailSettlement(input: JailPaymentInput) {
  const severity = Math.max(1, input.severity);
  const remainingSeconds = Math.max(0, input.remainingSeconds);
  const timePremium = Math.ceil(remainingSeconds / 900) * 25;
  const cost = Math.max(Math.max(0, input.fine), severity * 125) + timePremium;

  return {
    action: 'post_bail' as const,
    cost,
    paymentSource: input.paymentSource,
    remainingSeconds,
    releaseNow: true,
    heatReduction: Math.min(2, severity),
    canAfford: getAvailableFunds(input) >= cost,
  };
}

export type CourtPlea = 'responsible' | 'contest' | 'defer';

export type CourtOutcomeInput = {
  severity: number;
  heat: number;
  legalReputation: number;
  intelligence: number;
  remainingSeconds: number;
  fine: number;
  plea: CourtPlea;
  roll?: number;
};

export function calculateCourtOutcome(input: CourtOutcomeInput) {
  const severity = Math.max(1, input.severity);
  const heat = Math.max(0, input.heat);
  const remainingSeconds = Math.max(0, input.remainingSeconds);
  const legalModifier =
    Math.max(0, input.legalReputation) * 0.018 + Math.max(0, input.intelligence) * 0.01;
  const heatPenalty = heat * 0.006 + severity * 0.035;
  const pleaModifier = input.plea === 'responsible' ? 0.1 : input.plea === 'contest' ? -0.03 : 0.04;
  const favorableChance = Math.max(
    0.12,
    Math.min(0.82, 0.42 + legalModifier + pleaModifier - heatPenalty),
  );
  const roll = input.roll ?? Math.random();

  if (roll <= favorableChance * 0.22) {
    return {
      plea: input.plea,
      outcome: 'dismissed' as const,
      favorableChance: Number(favorableChance.toFixed(4)),
      releaseNow: true,
      sentenceReductionSeconds: remainingSeconds,
      sentenceExtensionSeconds: 0,
      fineDelta: -Math.max(0, input.fine),
      heatReduction: Math.min(heat, 4 + severity),
      legalReputationGain: 2,
    };
  }

  if (roll <= favorableChance) {
    const reductionRate =
      input.plea === 'responsible' ? 0.45 : input.plea === 'defer' ? 0.35 : 0.28;
    return {
      plea: input.plea,
      outcome: 'reduced' as const,
      favorableChance: Number(favorableChance.toFixed(4)),
      releaseNow: remainingSeconds <= 300,
      sentenceReductionSeconds: Math.max(300, Math.floor(remainingSeconds * reductionRate)),
      sentenceExtensionSeconds: 0,
      fineDelta: -Math.min(Math.max(0, input.fine), severity * 50),
      heatReduction: Math.min(heat, 2 + Math.floor(severity / 2)),
      legalReputationGain: 1,
    };
  }

  if (roll >= 0.94 && input.plea === 'contest') {
    const extensionSeconds = Math.max(300, Math.ceil(remainingSeconds * 0.18));
    return {
      plea: input.plea,
      outcome: 'extended' as const,
      favorableChance: Number(favorableChance.toFixed(4)),
      releaseNow: false,
      sentenceReductionSeconds: 0,
      sentenceExtensionSeconds: extensionSeconds,
      fineDelta: severity * 40,
      heatReduction: 0,
      legalReputationGain: 0,
    };
  }

  return {
    plea: input.plea,
    outcome: 'unchanged' as const,
    favorableChance: Number(favorableChance.toFixed(4)),
    releaseNow: false,
    sentenceReductionSeconds: 0,
    sentenceExtensionSeconds: 0,
    fineDelta: 0,
    heatReduction: 0,
    legalReputationGain: input.plea === 'defer' ? 1 : 0,
  };
}

export type JailActivity = 'library' | 'work_detail' | 'fitness_yard';

export type JailActivityInput = {
  activity: JailActivity;
  severity: number;
  remainingSeconds: number;
  intelligence: number;
  labour: number;
  endurance: number;
  strength: number;
};

const jailActivities = {
  library: {
    releaseReductionSeconds: 300,
    experience: 10,
    intelligenceGain: 1,
    labourGain: 0,
    strengthGain: 0,
    enduranceGain: 0,
  },
  work_detail: {
    releaseReductionSeconds: 420,
    experience: 12,
    intelligenceGain: 0,
    labourGain: 1,
    strengthGain: 0,
    enduranceGain: 0,
  },
  fitness_yard: {
    releaseReductionSeconds: 240,
    experience: 8,
    intelligenceGain: 0,
    labourGain: 0,
    strengthGain: 1,
    enduranceGain: 1,
  },
} as const;

export function calculateJailActivity(input: JailActivityInput) {
  const activity = jailActivities[input.activity];
  const severityPenalty = Math.max(0, Math.max(1, input.severity) - 1) * 30;
  const statBonus =
    input.activity === 'library'
      ? Math.floor(Math.max(0, input.intelligence) / 12) * 30
      : input.activity === 'work_detail'
        ? Math.floor(Math.max(0, input.labour) / 10) * 30
        : Math.floor((Math.max(0, input.strength) + Math.max(0, input.endurance)) / 18) * 30;
  const releaseReductionSeconds = Math.min(
    Math.max(0, input.remainingSeconds),
    Math.max(60, activity.releaseReductionSeconds + statBonus - severityPenalty),
  );

  return {
    activity: input.activity,
    releaseReductionSeconds,
    experience: activity.experience + Math.floor(releaseReductionSeconds / 120),
    intelligenceGain: activity.intelligenceGain,
    labourGain: activity.labourGain,
    strengthGain: activity.strengthGain,
    enduranceGain: activity.enduranceGain,
    releaseNow: releaseReductionSeconds >= Math.max(0, input.remainingSeconds),
  };
}
