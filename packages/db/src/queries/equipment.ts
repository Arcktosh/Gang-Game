import { and, eq, sql } from 'drizzle-orm';
import {
  applyDurabilityScale,
  calculateRepairCost,
  combineEquipmentModifiers,
  normalizeEquipmentModifiers,
  type EquipmentModifiers,
  type EquipmentSlot,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characterEquipment,
  characters,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, setActionCooldown } from './action-state';

const EQUIPMENT_COOLDOWN_SECONDS = 5;

type Tx = any;

type EquippedRecord = typeof characterEquipment.$inferSelect & {
  item?: typeof itemDefinitions.$inferSelect | null;
};

function getMaxDurability(item: { maxDurability?: number | null }) {
  return Math.max(1, item.maxDurability ?? 100);
}

function modifiersForEquipment(record: EquippedRecord): EquipmentModifiers {
  const item = record.item;
  if (!item) {
    return {};
  }

  const maxDurability = getMaxDurability(item);
  const modifiers = normalizeEquipmentModifiers(item.statModifiers);
  return applyDurabilityScale(modifiers, record.durability, maxDurability);
}

export async function getEquippedModifierSummary(tx: Tx, characterId: string) {
  const rows = await tx.query.characterEquipment.findMany({
    where: and(
      eq(characterEquipment.characterId, characterId),
      eq(characterEquipment.isEquipped, true),
    ),
    with: { item: true },
  });

  return combineEquipmentModifiers(rows.map((row: EquippedRecord) => modifiersForEquipment(row)));
}

export async function listEquipmentProfile(input: { userId: string; characterId: string }) {
  const character = await db.query.characters.findFirst({
    where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
  });

  if (!character) {
    return null;
  }

  const [equippedRows, inventoryRows] = await Promise.all([
    db.query.characterEquipment.findMany({
      where: and(
        eq(characterEquipment.characterId, character.id),
        eq(characterEquipment.isEquipped, true),
      ),
      with: { item: true, inventoryItem: true },
    }),
    db.query.inventoryItems.findMany({
      where: eq(inventoryItems.characterId, character.id),
      with: { item: true },
    }),
  ]);

  const equipped = equippedRows.map((record) => {
    const item = record.item;
    const maxDurability = item ? getMaxDurability(item) : Math.max(1, record.durability);
    const modifiers = modifiersForEquipment(record);
    return {
      id: record.id,
      itemKey: record.itemKey,
      slot: record.slot,
      durability: record.durability,
      maxDurability,
      repairCost: item
        ? calculateRepairCost({
            basePrice: item.basePrice,
            durability: record.durability,
            maxDurability,
          })
        : 0,
      itemName: item?.name ?? record.itemKey,
      itemCategory: item?.category ?? 'gear',
      modifiers,
    };
  });

  const inventoryGear = inventoryRows
    .filter((row) => row.item?.equipSlot && row.quantity > 0)
    .map((row) => ({
      inventoryItemId: row.id,
      itemKey: row.itemKey,
      quantity: row.quantity,
      durability: row.durability,
      itemName: row.item?.name ?? row.itemKey,
      itemCategory: row.item?.category ?? 'gear',
      slot: row.item?.equipSlot,
      maxDurability: row.item?.maxDurability ?? 0,
      modifiers: normalizeEquipmentModifiers(row.item?.statModifiers),
    }));

  const modifiers = combineEquipmentModifiers(equipped.map((record) => record.modifiers));
  const effectiveStats = {
    intelligence: character.intelligence + (modifiers.intelligence ?? 0),
    labour: character.labour + (modifiers.labour ?? 0),
    endurance: character.endurance + (modifiers.endurance ?? 0),
    strength: character.strength + (modifiers.strength ?? 0),
    stamina: character.stamina + (modifiers.stamina ?? 0),
    defense: character.defense + (modifiers.defense ?? 0),
    dexterity: character.dexterity + (modifiers.dexterity ?? 0),
  };

  return { character, equipped, inventoryGear, modifiers, effectiveStats };
}

export async function equipInventoryItem(input: {
  userId: string;
  characterId: string;
  inventoryItemId: string;
}) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    if (character.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to change equipment.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'equipment_change');
    if (!cooldown.ok) {
      return cooldown;
    }

    const inventoryItem = await tx.query.inventoryItems.findFirst({
      where: and(
        eq(inventoryItems.id, input.inventoryItemId),
        eq(inventoryItems.characterId, character.id),
      ),
      with: { item: true },
    });

    if (!inventoryItem || inventoryItem.quantity < 1 || !inventoryItem.item?.equipSlot) {
      return {
        ok: false as const,
        code: 'not_found',
        message: 'Equippable inventory item not found.',
      };
    }

    const item = inventoryItem.item;
    const slot = item.equipSlot as EquipmentSlot;
    const maxDurability = getMaxDurability(item);
    const durability = Math.max(
      1,
      Math.min(maxDurability, inventoryItem.durability ?? maxDurability),
    );

    await tx
      .update(characterEquipment)
      .set({ isEquipped: false, updatedAt: sql`now()` })
      .where(
        and(
          eq(characterEquipment.characterId, character.id),
          eq(characterEquipment.slot, slot),
          eq(characterEquipment.isEquipped, true),
        ),
      );

    const [equipment] = await tx
      .insert(characterEquipment)
      .values({
        characterId: character.id,
        inventoryItemId: inventoryItem.id,
        itemKey: item.key,
        slot,
        durability,
        isEquipped: true,
      })
      .returning();

    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        type: 'equipment_equipped',
        payload: { itemKey: item.key, itemName: item.name, slot },
      });
    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'equipment_change',
      cooldownSeconds: EQUIPMENT_COOLDOWN_SECONDS,
      metadata: { itemKey: item.key, slot },
    });

    return { ok: true as const, data: { equipment } };
  });
}

export async function unequipSlot(input: {
  userId: string;
  characterId: string;
  slot: EquipmentSlot;
}) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'equipment_change');
    if (!cooldown.ok) {
      return cooldown;
    }

    const [equipment] = await tx
      .update(characterEquipment)
      .set({ isEquipped: false, updatedAt: sql`now()` })
      .where(
        and(
          eq(characterEquipment.characterId, character.id),
          eq(characterEquipment.slot, input.slot),
          eq(characterEquipment.isEquipped, true),
        ),
      )
      .returning();

    if (!equipment) {
      return {
        ok: false as const,
        code: 'not_found',
        message: 'No equipped item found for that slot.',
      };
    }

    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        type: 'equipment_unequipped',
        payload: { itemKey: equipment.itemKey, slot: input.slot },
      });
    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'equipment_change',
      cooldownSeconds: EQUIPMENT_COOLDOWN_SECONDS,
      metadata: { slot: input.slot },
    });

    return { ok: true as const, data: { equipment } };
  });
}

export async function repairEquipment(input: {
  userId: string;
  characterId: string;
  equipmentId: string;
}) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const equipment = await tx.query.characterEquipment.findFirst({
      where: and(
        eq(characterEquipment.id, input.equipmentId),
        eq(characterEquipment.characterId, character.id),
      ),
      with: { item: true },
    });

    if (!equipment || !equipment.item) {
      return { ok: false as const, code: 'not_found', message: 'Equipment not found.' };
    }

    const maxDurability = getMaxDurability(equipment.item);
    const repairCost = calculateRepairCost({
      basePrice: equipment.item.basePrice,
      durability: equipment.durability,
      maxDurability,
    });

    if (repairCost <= 0) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Equipment is already fully repaired.',
      };
    }

    if (character.cash < repairCost) {
      return { ok: false as const, code: 'forbidden', message: `Repair requires $${repairCost}.` };
    }

    const [updatedEquipment] = await tx
      .update(characterEquipment)
      .set({ durability: maxDurability, updatedAt: sql`now()` })
      .where(eq(characterEquipment.id, equipment.id))
      .returning();
    const [updatedCharacter] = await tx
      .update(characters)
      .set({ cash: character.cash - repairCost, updatedAt: sql`now()` })
      .where(eq(characters.id, character.id))
      .returning();

    await tx
      .insert(financialTransactions)
      .values({
        characterId: character.id,
        type: 'cash',
        amount: String(-repairCost),
        description: `Repaired ${equipment.item.name}.`,
        metadata: { equipmentId: equipment.id, itemKey: equipment.itemKey },
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        type: 'equipment_repaired',
        payload: { equipmentId: equipment.id, itemKey: equipment.itemKey, cost: repairCost },
      });

    return {
      ok: true as const,
      data: { equipment: updatedEquipment, character: updatedCharacter, repairCost },
    };
  });
}

export async function applyEquipmentWear(
  tx: Tx,
  input: { characterId: string; slot?: EquipmentSlot; baseWear: number },
) {
  const rows = await tx.query.characterEquipment.findMany({
    where: input.slot
      ? and(
          eq(characterEquipment.characterId, input.characterId),
          eq(characterEquipment.slot, input.slot),
          eq(characterEquipment.isEquipped, true),
        )
      : and(
          eq(characterEquipment.characterId, input.characterId),
          eq(characterEquipment.isEquipped, true),
        ),
  });

  for (const row of rows) {
    await tx
      .update(characterEquipment)
      .set({
        durability: sql`greatest(0, ${characterEquipment.durability} - ${Math.max(1, input.baseWear)})`,
        updatedAt: sql`now()`,
      })
      .where(eq(characterEquipment.id, row.id));
  }

  return rows.length;
}
