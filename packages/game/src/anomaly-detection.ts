export type OperationalAnomalyCategory = 'economy' | 'inventory' | 'session' | 'player_state';

export type OperationalAnomalyThresholds = {
  highNetWorth: number;
  transactionVolume: number;
  transactionCount: number;
  inventoryQuantity: number;
  sessionIpCount: number;
  scanWindowHours: number;
};

export type OperationalAnomalySignalInput = {
  category: OperationalAnomalyCategory;
  signal: string;
  entityId: string;
  bucket: string;
};

export type OperationalAnomalyScoreInput = {
  ratio: number;
  floor?: number;
  ceiling?: number;
};

export const DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS: OperationalAnomalyThresholds = {
  highNetWorth: 1_000_000,
  transactionVolume: 250_000,
  transactionCount: 50,
  inventoryQuantity: 5_000,
  sessionIpCount: 6,
  scanWindowHours: 24,
};

function normalizePositiveInteger(value: unknown, fallback: number, max: number) {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.min(max, Math.max(1, Math.trunc(numericValue)));
}

export function normalizeOperationalAnomalyThresholds(value: Partial<OperationalAnomalyThresholds> = {}): OperationalAnomalyThresholds {
  return {
    highNetWorth: normalizePositiveInteger(value.highNetWorth, DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS.highNetWorth, 100_000_000),
    transactionVolume: normalizePositiveInteger(value.transactionVolume, DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS.transactionVolume, 100_000_000),
    transactionCount: normalizePositiveInteger(value.transactionCount, DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS.transactionCount, 10_000),
    inventoryQuantity: normalizePositiveInteger(value.inventoryQuantity, DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS.inventoryQuantity, 10_000_000),
    sessionIpCount: normalizePositiveInteger(value.sessionIpCount, DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS.sessionIpCount, 1_000),
    scanWindowHours: normalizePositiveInteger(value.scanWindowHours, DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS.scanWindowHours, 24 * 30),
  };
}

export function calculateOperationalAnomalySeverity(input: OperationalAnomalyScoreInput) {
  const floor = input.floor ?? 1;
  const ceiling = input.ceiling ?? 5;

  if (!Number.isFinite(input.ratio) || input.ratio <= 0) {
    return floor;
  }

  if (input.ratio >= 10) return ceiling;
  if (input.ratio >= 5) return Math.min(ceiling, 4);
  if (input.ratio >= 2) return Math.min(ceiling, 3);
  if (input.ratio >= 1) return Math.min(ceiling, 2);

  return floor;
}

export function buildOperationalAnomalySignalKey(input: OperationalAnomalySignalInput) {
  const category = input.category.trim().toLowerCase();
  const signal = input.signal.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '_').slice(0, 80);
  const entityId = input.entityId.trim().toLowerCase();
  const bucket = input.bucket.trim().toLowerCase();

  return `${category}:${signal}:${entityId}:${bucket}`.slice(0, 240);
}

export function summarizeOperationalAnomaly(input: { characterName?: string | null; signal: string; value: number; threshold: number }) {
  const actor = input.characterName?.trim() || 'A player account';
  const value = Math.trunc(input.value).toLocaleString('en-US');
  const threshold = Math.trunc(input.threshold).toLocaleString('en-US');
  return `${actor} triggered ${input.signal}: ${value} exceeds threshold ${threshold}.`;
}
