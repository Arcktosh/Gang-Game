import { and, eq, sql } from 'drizzle-orm';
import { calculateUpgradeInstallCooldown, calculateVehicleStats, normalizeEquipmentModifiers } from '@drugdeal/game';
import { db } from '../client';
import { characterEquipment, characters, characterVehicleUpgrades, financialTransactions, itemDefinitions, playerEvents, vehicleUpgradeDefinitions } from '../schema';
import { assertActionUnlocked, setActionCooldown } from './action-state';

type VehicleEquipmentRecord = typeof characterEquipment.$inferSelect & {
  item?: typeof itemDefinitions.$inferSelect | null;
};

type InstalledVehicleUpgradeRecord = typeof characterVehicleUpgrades.$inferSelect & {
  upgrade?: typeof vehicleUpgradeDefinitions.$inferSelect | null;
};

function vehicleModifiersFor(record: VehicleEquipmentRecord, upgrades: InstalledVehicleUpgradeRecord[] = []) {
  return calculateVehicleStats({
    vehicleModifiers: normalizeEquipmentModifiers(record.item?.statModifiers),
    upgradeModifiers: upgrades.map((upgrade) => normalizeEquipmentModifiers(upgrade.upgrade?.statModifiers)),
    durability: record.durability,
    maxDurability: record.item?.maxDurability ?? 100,
  });
}

export async function listVehicleProfile(input: { userId: string; characterId: string }) {
  const character = await db.query.characters.findFirst({ where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)) });

  if (!character) {
    return null;
  }

  const [vehicles, upgrades] = await Promise.all([
    db.query.characterEquipment.findMany({
      where: and(eq(characterEquipment.characterId, character.id), eq(characterEquipment.slot, 'vehicle'), eq(characterEquipment.isEquipped, true)),
      with: { item: true },
    }),
    db.query.vehicleUpgradeDefinitions.findMany(),
  ]);

  const vehicleProfiles = await Promise.all(vehicles.map(async (vehicle) => {
    const installed = await db.query.characterVehicleUpgrades.findMany({
      where: eq(characterVehicleUpgrades.equipmentId, vehicle.id),
      with: { upgrade: true },
    });

    return {
      id: vehicle.id,
      itemKey: vehicle.itemKey,
      itemName: vehicle.item?.name ?? vehicle.itemKey,
      durability: vehicle.durability,
      maxDurability: vehicle.item?.maxDurability ?? 100,
      stats: vehicleModifiersFor(vehicle, installed),
      installedUpgrades: installed.map((row) => ({ id: row.id, upgradeKey: row.upgradeKey, name: row.upgrade?.name ?? row.upgradeKey, upgradeType: row.upgrade?.upgradeType ?? 'engine' })),
    };
  }));

  return {
    character,
    vehicles: vehicleProfiles,
    upgrades: upgrades.map((upgrade) => ({
      ...upgrade,
      statModifiers: normalizeEquipmentModifiers(upgrade.statModifiers),
    })),
  };
}

export async function installVehicleUpgrade(input: { userId: string; characterId: string; equipmentId: string; upgradeKey: string }) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({ where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)) });

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available to install vehicle upgrades.' };
    }

    const vehicle = await tx.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.id, input.equipmentId), eq(characterEquipment.characterId, character.id), eq(characterEquipment.slot, 'vehicle'), eq(characterEquipment.isEquipped, true)),
      with: { item: true },
    });

    if (!vehicle) {
      return { ok: false as const, code: 'not_found', message: 'Equipped vehicle not found.' };
    }

    const upgrade = await tx.query.vehicleUpgradeDefinitions.findFirst({ where: eq(vehicleUpgradeDefinitions.key, input.upgradeKey) });

    if (!upgrade) {
      return { ok: false as const, code: 'not_found', message: 'Vehicle upgrade not found.' };
    }

    if (character.level < upgrade.requiredLevel) {
      return { ok: false as const, code: 'forbidden', message: `Requires level ${upgrade.requiredLevel}.` };
    }

    const alreadyInstalled = await tx.query.characterVehicleUpgrades.findFirst({ where: and(eq(characterVehicleUpgrades.equipmentId, vehicle.id), eq(characterVehicleUpgrades.upgradeKey, upgrade.key)) });

    if (alreadyInstalled) {
      return { ok: false as const, code: 'forbidden', message: 'Upgrade is already installed on this vehicle.' };
    }

    if (character.cash < upgrade.cashCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash to install this upgrade.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'vehicle_upgrade');
    if (!cooldown.ok) {
      return cooldown;
    }

    const [installed] = await tx.insert(characterVehicleUpgrades).values({ characterId: character.id, equipmentId: vehicle.id, upgradeKey: upgrade.key }).returning();
    const [updatedCharacter] = await tx.update(characters).set({ cash: character.cash - upgrade.cashCost, updatedAt: sql`now()` }).where(eq(characters.id, character.id)).returning();

    await tx.insert(financialTransactions).values({ characterId: character.id, type: 'cash', amount: String(-upgrade.cashCost), description: `Installed vehicle upgrade: ${upgrade.name}`, metadata: { equipmentId: vehicle.id, upgradeKey: upgrade.key } });
    await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'vehicle_upgrade_installed', payload: { vehicle: vehicle.item?.name ?? vehicle.itemKey, upgrade: upgrade.name, cost: upgrade.cashCost } });
    await setActionCooldown({ tx, characterId: character.id, actionType: 'vehicle_upgrade', cooldownSeconds: calculateUpgradeInstallCooldown({ requiredLevel: upgrade.requiredLevel }), metadata: { upgradeKey: upgrade.key } });

    return { ok: true as const, data: { installed, character: updatedCharacter } };
  });
}
