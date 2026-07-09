export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

export type ItemRarity = (typeof ITEM_RARITIES)[number];

export type ConsumableEffectInput = {
  itemKey: string;
  category?: string | null;
  metadata?: unknown;
  character: {
    health: number;
    energy: number;
    maxEnergy: number;
    nerve: number;
    maxNerve: number;
    heat?: number | null;
  };
};

export type ConsumableEffectResult = {
  isConsumable: boolean;
  healthDelta: number;
  energyDelta: number;
  nerveDelta: number;
  heatDelta: number;
  nextHealth: number;
  nextEnergy: number;
  nextNerve: number;
  nextHeat: number;
  summary: string;
};

export type InventoryExposureInput = {
  quantity: number;
  basePrice: number;
  baseRisk?: number | null;
  isIllegal?: boolean | null;
  rarity?: string | null;
};

const DEFAULT_CONSUMABLE_EFFECTS: Record<
  string,
  { health?: number; energy?: number; nerve?: number; heat?: number; summary: string }
> = {
  'first-aid-kit': { health: 30, summary: 'Restored health with a first-aid kit.' },
};

const RARITY_VALUE_MULTIPLIER: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 1.2,
  rare: 1.55,
  epic: 2.1,
  legendary: 3,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toFiniteInteger(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeItemRarity(value: unknown): ItemRarity {
  return ITEM_RARITIES.includes(value as ItemRarity) ? (value as ItemRarity) : 'common';
}

export function getItemRarityValueMultiplier(value: unknown) {
  return RARITY_VALUE_MULTIPLIER[normalizeItemRarity(value)];
}

export function calculateConsumableEffect(input: ConsumableEffectInput): ConsumableEffectResult {
  const metadata = asRecord(input.metadata);
  const consumable = asRecord(metadata.consumable);
  const defaultEffect = DEFAULT_CONSUMABLE_EFFECTS[input.itemKey];
  const categoryConsumable = input.category === 'medical';
  const isConsumable = Boolean(
    defaultEffect ||
    categoryConsumable ||
    metadata.consumable === true ||
    Object.keys(consumable).length > 0,
  );

  if (!isConsumable) {
    return {
      isConsumable: false,
      healthDelta: 0,
      energyDelta: 0,
      nerveDelta: 0,
      heatDelta: 0,
      nextHealth: input.character.health,
      nextEnergy: input.character.energy,
      nextNerve: input.character.nerve,
      nextHeat: input.character.heat ?? 0,
      summary: 'Item is not consumable.',
    };
  }

  const healthDelta = toFiniteInteger(
    consumable.health ?? defaultEffect?.health ?? (categoryConsumable ? 15 : 0),
  );
  const energyDelta = toFiniteInteger(consumable.energy ?? defaultEffect?.energy ?? 0);
  const nerveDelta = toFiniteInteger(consumable.nerve ?? defaultEffect?.nerve ?? 0);
  const heatDelta = toFiniteInteger(consumable.heat ?? defaultEffect?.heat ?? 0);
  const nextHealth = clamp(input.character.health + healthDelta, 0, 100);
  const nextEnergy = clamp(
    input.character.energy + energyDelta,
    0,
    Math.max(1, input.character.maxEnergy),
  );
  const nextNerve = clamp(
    input.character.nerve + nerveDelta,
    0,
    Math.max(1, input.character.maxNerve),
  );
  const nextHeat = clamp((input.character.heat ?? 0) + heatDelta, 0, 100);
  const summary = String(consumable.summary ?? defaultEffect?.summary ?? 'Consumable item used.');

  return {
    isConsumable: true,
    healthDelta: nextHealth - input.character.health,
    energyDelta: nextEnergy - input.character.energy,
    nerveDelta: nextNerve - input.character.nerve,
    heatDelta: nextHeat - (input.character.heat ?? 0),
    nextHealth,
    nextEnergy,
    nextNerve,
    nextHeat,
    summary,
  };
}

export function calculateInventoryExposure(input: InventoryExposureInput) {
  const quantity = Math.max(0, Math.floor(input.quantity));
  const basePrice = Math.max(0, Math.floor(input.basePrice));
  const baseRisk = Math.max(0, Math.floor(input.baseRisk ?? 0));
  const rarity = normalizeItemRarity(input.rarity);
  const valueMultiplier = RARITY_VALUE_MULTIPLIER[rarity];
  const estimatedValue = Math.round(quantity * basePrice * valueMultiplier);
  const riskScore = quantity * baseRisk + (input.isIllegal ? Math.ceil(quantity / 2) : 0);

  return {
    quantity,
    rarity,
    estimatedValue,
    riskScore,
    isHighRisk: riskScore >= 10,
  };
}
