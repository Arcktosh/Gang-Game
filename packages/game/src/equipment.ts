export type EquipmentSlot = 'weapon' | 'armor' | 'vehicle' | 'tool' | 'phone' | 'accessory';

export type EquipmentModifiers = {
  strength?: number;
  stamina?: number;
  defense?: number;
  dexterity?: number;
  intelligence?: number;
  labour?: number;
  endurance?: number;
  crimeSuccess?: number;
  travelSafety?: number;
  travelSpeed?: number;
  marketBonus?: number;
  heatReduction?: number;
  smugglingSafety?: number;
  cargoCapacity?: number;
};

export type EquipmentItemLike = {
  basePrice: number;
  maxDurability?: number | null;
  statModifiers?: EquipmentModifiers | null;
};

export function normalizeEquipmentModifiers(value: unknown): EquipmentModifiers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const input = value as Record<string, unknown>;
  const output: EquipmentModifiers = {};
  const allowed = [
    'strength',
    'stamina',
    'defense',
    'dexterity',
    'intelligence',
    'labour',
    'endurance',
    'crimeSuccess',
    'travelSafety',
    'travelSpeed',
    'marketBonus',
    'heatReduction',
    'smugglingSafety',
    'cargoCapacity',
  ] as const;

  for (const key of allowed) {
    const raw = input[key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw !== 0) {
      output[key] = Math.trunc(raw);
    }
  }

  return output;
}

export function combineEquipmentModifiers(modifiers: EquipmentModifiers[]): EquipmentModifiers {
  const total: EquipmentModifiers = {};

  for (const modifier of modifiers) {
    for (const [key, value] of Object.entries(modifier) as [keyof EquipmentModifiers, number][]) {
      total[key] = (total[key] ?? 0) + value;
    }
  }

  return total;
}

export function applyDurabilityScale(
  modifiers: EquipmentModifiers,
  durability: number,
  maxDurability: number,
): EquipmentModifiers {
  if (maxDurability <= 0) {
    return modifiers;
  }

  const scale = Math.max(0.1, Math.min(1, durability / maxDurability));
  const scaled: EquipmentModifiers = {};

  for (const [key, value] of Object.entries(modifiers) as [keyof EquipmentModifiers, number][]) {
    scaled[key] = Math.trunc(value * scale);
  }

  return scaled;
}

export function calculateRepairCost(input: {
  basePrice: number;
  durability: number;
  maxDurability: number;
}) {
  const missingDurability = Math.max(0, input.maxDurability - input.durability);
  if (missingDurability === 0 || input.maxDurability <= 0) {
    return 0;
  }

  const durabilityRatio = missingDurability / input.maxDurability;
  return Math.max(5, Math.ceil(input.basePrice * durabilityRatio * 0.35));
}

export function calculateEquipmentWear(input: {
  baseWear: number;
  durability: number;
  maxDurability: number;
}) {
  const wear = Math.max(1, Math.trunc(input.baseWear));
  return Math.max(0, input.durability - wear);
}

export function getEquipmentSlotLabel(slot: EquipmentSlot) {
  return {
    weapon: 'Weapon',
    armor: 'Armor',
    vehicle: 'Vehicle',
    tool: 'Tool',
    phone: 'Phone',
    accessory: 'Accessory',
  }[slot];
}
