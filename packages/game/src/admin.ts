export type BalanceConfigValue = Record<string, unknown>;

export type CashAdjustmentInput = {
  currentCash: number;
  amount: number;
};

export type BankAdjustmentInput = {
  currentBank: number;
  amount: number;
};

export type CharacterFlagInput = {
  severity: number;
  reason: string;
};

export function clampAdminSeverity(severity: number) {
  if (!Number.isFinite(severity)) {
    return 1;
  }

  return Math.max(1, Math.min(5, Math.round(severity)));
}

export function normalizeConfigValue(value: unknown): BalanceConfigValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Config value must be a JSON object.');
  }

  return value as BalanceConfigValue;
}

export function calculateCashAdjustment(input: CashAdjustmentInput) {
  const amount = Math.trunc(input.amount);
  const nextCash = Math.max(0, input.currentCash + amount);

  return {
    amount,
    before: input.currentCash,
    after: nextCash,
    deltaApplied: nextCash - input.currentCash,
  };
}

export function calculateBankAdjustment(input: BankAdjustmentInput) {
  const amount = Math.trunc(input.amount);
  const nextBank = Math.max(0, input.currentBank + amount);

  return {
    amount,
    before: input.currentBank,
    after: nextBank,
    deltaApplied: nextBank - input.currentBank,
  };
}

export function validateModerationReason(reason: string) {
  const normalized = reason.trim();

  if (normalized.length < 5) {
    throw new Error('Moderation reason must be at least 5 characters.');
  }

  if (normalized.length > 500) {
    throw new Error('Moderation reason must be 500 characters or fewer.');
  }

  return normalized;
}

export function summarizeConfigChange(key: string) {
  return `Updated game config ${key}.`;
}

export function summarizeCashAdjustment(characterName: string, amount: number) {
  const direction = amount >= 0 ? 'credited' : 'debited';
  return `${characterName} was ${direction} $${Math.abs(amount)} cash by an admin.`;
}

export function summarizeBankAdjustment(characterName: string, amount: number) {
  const direction = amount >= 0 ? 'credited' : 'debited';
  return `${characterName} was ${direction} $${Math.abs(amount)} bank funds by an admin.`;
}
