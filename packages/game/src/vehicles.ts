import {
  applyDurabilityScale,
  combineEquipmentModifiers,
  normalizeEquipmentModifiers,
  type EquipmentModifiers,
} from './equipment';

export type VehicleStatInput = {
  vehicleModifiers?: Record<string, unknown> | null;
  upgradeModifiers?: Record<string, unknown>[];
  durability?: number | null;
  maxDurability?: number | null;
};

export type VehicleTravelPlanInput = {
  baseCost: number;
  baseDurationSeconds: number;
  baseRisk: number;
  vehicleStats: EquipmentModifiers;
  cargoQuantity?: number;
  cargoUnitValue?: number;
};

export function calculateVehicleStats(input: VehicleStatInput): EquipmentModifiers {
  const maxDurability = Math.max(1, input.maxDurability ?? 100);
  const durability = input.durability ?? maxDurability;
  const base = applyDurabilityScale(
    normalizeEquipmentModifiers(input.vehicleModifiers),
    durability,
    maxDurability,
  );
  const upgrades = (input.upgradeModifiers ?? []).map((modifiers) =>
    normalizeEquipmentModifiers(modifiers),
  );
  return combineEquipmentModifiers([base, ...upgrades]);
}

export function calculateVehicleTravelPlan(input: VehicleTravelPlanInput) {
  const travelSpeed = input.vehicleStats.travelSpeed ?? 0;
  const travelSafety = input.vehicleStats.travelSafety ?? 0;
  const heatReduction = input.vehicleStats.heatReduction ?? 0;
  const smugglingSafety = input.vehicleStats.smugglingSafety ?? 0;
  const cargoCapacity = Math.max(0, input.vehicleStats.cargoCapacity ?? 0);
  const cargoQuantity = Math.max(0, input.cargoQuantity ?? 0);
  const cargoValue = Math.max(0, cargoQuantity * Math.max(0, input.cargoUnitValue ?? 0));
  const overCapacity = Math.max(0, cargoQuantity - cargoCapacity);
  const durationMultiplier = Math.max(0.45, 1 - travelSpeed * 0.04);
  const effectiveDurationSeconds = Math.max(
    60,
    Math.round(input.baseDurationSeconds * durationMultiplier),
  );
  const vehicleDiscount = Math.min(0.35, Math.max(0, travelSpeed) * 0.015);
  const effectiveCost = Math.max(0, Math.round(input.baseCost * (1 - vehicleDiscount)));
  const cargoRisk = cargoQuantity > 0 ? 1 + Math.ceil(cargoValue / 500) + overCapacity * 2 : 0;
  const riskScore = Math.max(
    0,
    input.baseRisk + cargoRisk - travelSafety - heatReduction - smugglingSafety,
  );

  return {
    cargoCapacity,
    cargoValue,
    effectiveCost,
    effectiveDurationSeconds,
    riskScore,
    overCapacity,
  };
}

export function calculateVehicleRepairWear(input: { riskScore: number; cargoQuantity?: number }) {
  return Math.max(
    1,
    Math.min(12, 1 + Math.floor(input.riskScore / 3) + Math.ceil((input.cargoQuantity ?? 0) / 10)),
  );
}

export function calculateUpgradeInstallCooldown(input: { requiredLevel: number }) {
  return Math.max(15, input.requiredLevel * 20);
}
