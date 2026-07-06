export type MarketPriceInput = {
  basePrice: number;
  supply: number;
  demand: number;
  volatility: number;
};

export function calculateMarketPrice(input: MarketPriceInput): number {
  const supply = Math.max(1, input.supply);
  const demand = Math.max(1, input.demand);
  const pressure = demand / supply;
  const volatilityMultiplier = 1 + input.volatility * 0.03;
  return Math.max(1, Math.floor(input.basePrice * pressure * volatilityMultiplier));
}

export type MoneySinkPaymentSource = 'cash' | 'bank';

export type MoneySinkDefinition = {
  key: string;
  name: string;
  category: 'lifestyle' | 'security' | 'services' | 'maintenance';
  description: string;
  cost: number;
  durationHours: number;
  benefit: string;
};

export const MONEY_SINKS: MoneySinkDefinition[] = [
  {
    key: 'safehouse_upkeep',
    name: 'Safehouse upkeep',
    category: 'maintenance',
    description: 'Pay routine rent, repairs, and supplies for a private hideout.',
    cost: 75,
    durationHours: 24,
    benefit: 'Adds an audit/event trail for routine upkeep spending.',
  },
  {
    key: 'private_transport',
    name: 'Private transport retainer',
    category: 'services',
    description: 'Reserve fictional private transport capacity for the next day.',
    cost: 150,
    durationHours: 24,
    benefit: 'Creates a low-risk cash drain before future travel convenience hooks.',
  },
  {
    key: 'personal_security',
    name: 'Personal security detail',
    category: 'security',
    description: 'Hire a short-term protective presence around your public-facing assets.',
    cost: 250,
    durationHours: 24,
    benefit: 'Records protective spending without adding combat advantage yet.',
  },
  {
    key: 'luxury_lifestyle',
    name: 'Luxury lifestyle package',
    category: 'lifestyle',
    description: 'Spend heavily on status symbols, hospitality, and comfort.',
    cost: 500,
    durationHours: 48,
    benefit: 'Provides a larger optional money sink for high-cash characters.',
  },
];

export type MoneySinkPurchaseInput = {
  cash: number;
  bank: number;
  sinkKey: string;
  paymentSource: MoneySinkPaymentSource;
};

export function listMoneySinkDefinitions() {
  return MONEY_SINKS.map((sink) => ({ ...sink }));
}

export function getMoneySinkDefinition(sinkKey: string) {
  return MONEY_SINKS.find((sink) => sink.key === sinkKey) ?? null;
}

export function calculateMoneySinkPurchase(input: MoneySinkPurchaseInput) {
  const sink = getMoneySinkDefinition(input.sinkKey);
  const cash = Math.max(0, Math.floor(input.cash));
  const bank = Math.max(0, Math.floor(input.bank));

  if (!sink) {
    return {
      ok: false as const,
      code: 'not_found' as const,
      message: 'Money sink not found.',
      sink: null,
      paymentSource: input.paymentSource,
      cost: 0,
      cashBefore: cash,
      bankBefore: bank,
      cashAfter: cash,
      bankAfter: bank,
    };
  }

  const cost = Math.max(1, Math.floor(sink.cost));
  const hasFunds = input.paymentSource === 'cash' ? cash >= cost : bank >= cost;

  return {
    ok: hasFunds,
    code: hasFunds ? 'ok' as const : 'insufficient_funds' as const,
    message: hasFunds ? 'Money sink purchased.' : `Not enough ${input.paymentSource} balance.`,
    sink,
    paymentSource: input.paymentSource,
    cost,
    cashBefore: cash,
    bankBefore: bank,
    cashAfter: input.paymentSource === 'cash' && hasFunds ? cash - cost : cash,
    bankAfter: input.paymentSource === 'bank' && hasFunds ? bank - cost : bank,
  };
}



export type LoanOfferDefinition = {
  key: string;
  name: string;
  description: string;
  principal: number;
  fee: number;
  dueHours: number;
  minimumLevel: number;
};

export const LOAN_OFFERS: LoanOfferDefinition[] = [
  {
    key: 'starter_float',
    name: 'Starter float',
    description: 'A small bank-backed cashflow boost for early-game purchases.',
    principal: 250,
    fee: 25,
    dueHours: 72,
    minimumLevel: 1,
  },
  {
    key: 'street_credit',
    name: 'Street credit line',
    description: 'A medium fictional credit line with a flat repayment fee.',
    principal: 750,
    fee: 120,
    dueHours: 96,
    minimumLevel: 2,
  },
  {
    key: 'business_bridge',
    name: 'Business bridge loan',
    description: 'A larger bridge loan intended for shop, vehicle, and market expansion.',
    principal: 2000,
    fee: 400,
    dueHours: 168,
    minimumLevel: 4,
  },
];

export type LoanRequestInput = {
  level: number;
  hasActiveLoan: boolean;
  offerKey: string;
};

export function listLoanOfferDefinitions() {
  return LOAN_OFFERS.map((offer) => ({ ...offer, totalDue: offer.principal + offer.fee }));
}

export function getLoanOfferDefinition(offerKey: string) {
  return LOAN_OFFERS.find((offer) => offer.key === offerKey) ?? null;
}

export function calculateLoanRequest(input: LoanRequestInput) {
  const offer = getLoanOfferDefinition(input.offerKey);
  const level = Math.max(1, Math.floor(input.level));

  if (!offer) {
    return {
      ok: false as const,
      code: 'not_found' as const,
      message: 'Loan offer not found.',
      offer: null,
      level,
      principal: 0,
      fee: 0,
      totalDue: 0,
    };
  }

  if (input.hasActiveLoan) {
    return {
      ok: false as const,
      code: 'conflict' as const,
      message: 'Repay the active loan before opening another one.',
      offer,
      level,
      principal: offer.principal,
      fee: offer.fee,
      totalDue: offer.principal + offer.fee,
    };
  }

  if (level < offer.minimumLevel) {
    return {
      ok: false as const,
      code: 'forbidden' as const,
      message: `Requires level ${offer.minimumLevel}.`,
      offer,
      level,
      principal: offer.principal,
      fee: offer.fee,
      totalDue: offer.principal + offer.fee,
    };
  }

  return {
    ok: true as const,
    code: 'ok' as const,
    message: 'Loan approved.',
    offer,
    level,
    principal: offer.principal,
    fee: offer.fee,
    totalDue: offer.principal + offer.fee,
  };
}



export const DEFAULT_LOAN_DEFAULT_GRACE_HOURS = 24;

export type LoanLifecycleStatus = 'active' | 'overdue' | 'defaulted' | 'repaid' | 'cancelled';

export function calculateLoanLifecycle(input: {
  status: string;
  dueAt: Date | string | number;
  now?: Date | string | number;
  defaultGraceHours?: number;
}) {
  const dueAt = new Date(input.dueAt);
  const now = new Date(input.now ?? Date.now());
  const graceHours = Math.max(1, Math.floor(input.defaultGraceHours ?? DEFAULT_LOAN_DEFAULT_GRACE_HOURS));
  const defaultAt = new Date(dueAt.getTime() + graceHours * 60 * 60 * 1000);
  const hoursPastDue = Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / (60 * 60 * 1000)));

  if (input.status === 'repaid' || input.status === 'cancelled') {
    return {
      lifecycleStatus: input.status as LoanLifecycleStatus,
      isOverdue: false,
      isDefaulted: false,
      hoursPastDue: 0,
      defaultAt,
      graceHours,
    };
  }

  if (input.status === 'defaulted') {
    return {
      lifecycleStatus: 'defaulted' as const,
      isOverdue: true,
      isDefaulted: true,
      hoursPastDue,
      defaultAt,
      graceHours,
    };
  }

  if (now.getTime() >= defaultAt.getTime()) {
    return {
      lifecycleStatus: 'defaulted' as const,
      isOverdue: true,
      isDefaulted: true,
      hoursPastDue,
      defaultAt,
      graceHours,
    };
  }

  if (now.getTime() > dueAt.getTime()) {
    return {
      lifecycleStatus: 'overdue' as const,
      isOverdue: true,
      isDefaulted: false,
      hoursPastDue,
      defaultAt,
      graceHours,
    };
  }

  return {
    lifecycleStatus: 'active' as const,
    isOverdue: false,
    isDefaulted: false,
    hoursPastDue: 0,
    defaultAt,
    graceHours,
  };
}

export function calculateLoanOutstanding(input: { principal: number; fee: number; repaidAmount?: number | null }) {
  const principal = Math.max(0, Math.floor(input.principal));
  const fee = Math.max(0, Math.floor(input.fee));
  const repaidAmount = Math.max(0, Math.floor(input.repaidAmount ?? 0));
  const totalDue = principal + fee;

  return {
    principal,
    fee,
    totalDue,
    repaidAmount: Math.min(repaidAmount, totalDue),
    outstanding: Math.max(0, totalDue - repaidAmount),
  };
}


export type LoanRepaymentInput = {
  principal: number;
  fee: number;
  repaidAmount?: number | null;
  bank: number;
  requestedAmount?: number | null;
};

export function calculateLoanRepayment(input: LoanRepaymentInput) {
  const outstanding = calculateLoanOutstanding({
    principal: input.principal,
    fee: input.fee,
    repaidAmount: input.repaidAmount,
  });
  const bank = Math.max(0, Math.floor(input.bank));
  const normalizedRequest = Math.max(0, Math.floor(input.requestedAmount ?? outstanding.outstanding));
  const requestedAmount = normalizedRequest > 0 ? normalizedRequest : outstanding.outstanding;
  const paymentAmount = Math.min(outstanding.outstanding, requestedAmount);
  const sufficientFunds = bank >= paymentAmount;
  const newRepaidAmount = outstanding.repaidAmount + (sufficientFunds ? paymentAmount : 0);
  const remainingOutstanding = Math.max(0, outstanding.totalDue - newRepaidAmount);

  return {
    ok: outstanding.outstanding > 0 && paymentAmount > 0 && sufficientFunds,
    code: outstanding.outstanding <= 0
      ? 'settled' as const
      : paymentAmount <= 0
        ? 'invalid_amount' as const
        : sufficientFunds
          ? 'ok' as const
          : 'insufficient_funds' as const,
    message: outstanding.outstanding <= 0
      ? 'Loan has no outstanding balance.'
      : paymentAmount <= 0
        ? 'Repayment amount must be greater than zero.'
        : sufficientFunds
          ? 'Loan payment accepted.'
          : 'Not enough bank balance for this loan payment.',
    ...outstanding,
    bankBefore: bank,
    requestedAmount,
    paymentAmount,
    newRepaidAmount,
    remainingOutstanding,
    bankAfter: sufficientFunds ? bank - paymentAmount : bank,
    isFullRepayment: remainingOutstanding === 0 && sufficientFunds,
  };
}
