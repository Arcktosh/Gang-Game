import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { calculateConsumableEffect, calculateInventoryExposure } from '@drugdeal/game';
import { db } from '../client';
import {
  characterEquipment,
  characters,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import { decrementInventoryQuantity } from './transaction-safety';

const ITEM_USE_COOLDOWN_SECONDS = 10;
const ITEM_TRANSFER_COOLDOWN_SECONDS = 5;

type Tx = any;
type InventoryRow = typeof inventoryItems.$inferSelect & {
  item?: typeof itemDefinitions.$inferSelect | null;
};

async function addInventoryQuantity(tx: Tx, input: { characterId: string; itemKey: string; quantity: number; metadata?: Record<string, unknown> }) {
  const quantity = Math.max(1, Math.floor(input.quantity));

  const [inventoryItem] = await tx
    .insert(inventoryItems)
    .values({
      characterId: input.characterId,
      itemKey: input.itemKey,
      quantity,
      metadata: input.metadata ?? {},
    })
    .onConflictDoUpdate({
      target: [inventoryItems.characterId, inventoryItems.itemKey],
      set: {
        quantity: sql`${inventoryItems.quantity} + ${quantity}`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return inventoryItem;
}

function normalizeInventoryRow(row: InventoryRow) {
  const item = row.item ?? null;
  const exposure = calculateInventoryExposure({
    quantity: row.quantity,
    basePrice: item?.basePrice ?? 0,
    baseRisk: item?.baseRisk ?? 0,
    isIllegal: item?.isIllegal ?? false,
    rarity: item?.rarity ?? 'common',
  });
  const consumePreview = item
    ? calculateConsumableEffect({
        itemKey: row.itemKey,
        category: item.category,
        metadata: item.metadata,
        character: { health: 50, energy: 0, maxEnergy: 100, nerve: 0, maxNerve: 20, heat: 0 },
      })
    : null;

  return {
    id: row.id,
    itemKey: row.itemKey,
    quantity: row.quantity,
    durability: row.durability,
    metadata: row.metadata,
    updatedAt: row.updatedAt,
    item: item
      ? {
          key: item.key,
          name: item.name,
          category: item.category,
          description: item.description,
          basePrice: item.basePrice,
          baseRisk: item.baseRisk,
          isIllegal: item.isIllegal,
          rarity: item.rarity,
          equipSlot: item.equipSlot,
          metadata: item.metadata,
        }
      : null,
    exposure,
    canUse: Boolean(consumePreview?.isConsumable),
  };
}

export async function listInventoryTransferCandidates(input: { characterId: string; location: string; limit?: number }) {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));

  return db.query.characters.findMany({
    where: and(ne(characters.id, input.characterId), eq(characters.location, input.location), eq(characters.status, 'free')),
    orderBy: desc(characters.updatedAt),
    limit,
    columns: {
      id: true,
      name: true,
      location: true,
      level: true,
      status: true,
    },
  });
}

export async function listInventoryProfile(input: { userId: string; characterId: string }) {
  const character = await db.query.characters.findFirst({
    where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
  });

  if (!character) {
    return { ok: false as const, code: 'not_found', message: 'Character not found.' };
  }

  const [inventoryRows, candidates] = await Promise.all([
    db.query.inventoryItems.findMany({
      where: eq(inventoryItems.characterId, character.id),
      with: { item: true },
      orderBy: desc(inventoryItems.updatedAt),
      limit: 150,
    }),
    listInventoryTransferCandidates({ characterId: character.id, location: character.location }),
  ]);

  const inventory = inventoryRows.map(normalizeInventoryRow);
  const totals = inventory.reduce(
    (summary, row) => ({
      totalQuantity: summary.totalQuantity + row.quantity,
      estimatedValue: summary.estimatedValue + row.exposure.estimatedValue,
      riskScore: summary.riskScore + row.exposure.riskScore,
      highRiskStacks: summary.highRiskStacks + (row.exposure.isHighRisk ? 1 : 0),
    }),
    { totalQuantity: 0, estimatedValue: 0, riskScore: 0, highRiskStacks: 0 },
  );

  return {
    ok: true as const,
    data: {
      character,
      inventory,
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        location: candidate.location,
        level: candidate.level,
        status: candidate.status,
      })),
      summary: {
        ...totals,
        distinctItems: inventory.length,
        consumableStacks: inventory.filter((row) => row.canUse).length,
      },
    },
  };
}

export async function useInventoryItem(input: { userId: string; characterId: string; inventoryItemId: string }) {
  return db.transaction(async (tx) => {
    const characterRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available to use inventory items.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'item_use');
    if (!cooldown.ok) {
      return cooldown;
    }

    const inventoryItem = await tx.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, input.inventoryItemId), eq(inventoryItems.characterId, character.id)),
      with: { item: true },
    });

    if (!inventoryItem || inventoryItem.quantity < 1 || !inventoryItem.item) {
      return { ok: false as const, code: 'not_found', message: 'Inventory item not found.' };
    }

    const effect = calculateConsumableEffect({
      itemKey: inventoryItem.itemKey,
      category: inventoryItem.item.category,
      metadata: inventoryItem.item.metadata,
      character,
    });

    if (!effect.isConsumable) {
      return { ok: false as const, code: 'forbidden', message: 'Item cannot be consumed.' };
    }

    const inventoryUpdate = await decrementInventoryQuantity(tx, inventoryItem.id, 1);
    if (!inventoryUpdate.ok) {
      return { ok: false as const, code: 'conflict', message: 'Inventory item is no longer available.' };
    }

    const [updatedCharacter] = await tx
      .update(characters)
      .set({
        health: effect.nextHealth,
        energy: effect.nextEnergy,
        nerve: effect.nextNerve,
        heat: effect.nextHeat,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, character.id))
      .returning();

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: 'inventory_item_used',
      payload: {
        itemKey: inventoryItem.itemKey,
        itemName: inventoryItem.item.name,
        healthDelta: effect.healthDelta,
        energyDelta: effect.energyDelta,
        nerveDelta: effect.nerveDelta,
        heatDelta: effect.heatDelta,
        summary: effect.summary,
      },
    });

    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'item_use',
      cooldownSeconds: ITEM_USE_COOLDOWN_SECONDS,
      metadata: { itemKey: inventoryItem.itemKey, inventoryItemId: inventoryItem.id },
    });

    return { ok: true as const, data: { character: updatedCharacter, inventoryItem: inventoryUpdate.inventoryItem, effect } };
  });
}

export async function transferInventoryItem(input: {
  userId: string;
  characterId: string;
  recipientCharacterId: string;
  inventoryItemId: string;
  quantity: number;
}) {
  return db.transaction(async (tx) => {
    const senderRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!senderRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const sender = await refreshCharacterResources(tx, senderRow);
    if (sender.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available to transfer inventory.' };
    }

    if (sender.id === input.recipientCharacterId) {
      return { ok: false as const, code: 'forbidden', message: 'Cannot transfer items to yourself.' };
    }

    const cooldown = await assertActionUnlocked(tx, sender.id, 'item_transfer');
    if (!cooldown.ok) {
      return cooldown;
    }

    const quantity = Math.max(1, Math.floor(input.quantity));
    const [recipient, inventoryItem] = await Promise.all([
      tx.query.characters.findFirst({ where: eq(characters.id, input.recipientCharacterId) }),
      tx.query.inventoryItems.findFirst({
        where: and(eq(inventoryItems.id, input.inventoryItemId), eq(inventoryItems.characterId, sender.id)),
        with: { item: true },
      }),
    ]);

    if (!recipient) {
      return { ok: false as const, code: 'not_found', message: 'Recipient character not found.' };
    }

    if (recipient.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Recipient is not available to receive inventory.' };
    }

    if (recipient.location !== sender.location) {
      return { ok: false as const, code: 'forbidden', message: 'Direct transfers require both characters to be in the same location.' };
    }

    if (!inventoryItem || inventoryItem.quantity < quantity || !inventoryItem.item) {
      return { ok: false as const, code: 'not_found', message: 'Transferable inventory item not found.' };
    }

    const equipped = await tx.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.inventoryItemId, inventoryItem.id), eq(characterEquipment.isEquipped, true)),
    });

    if (equipped && inventoryItem.quantity <= quantity) {
      return { ok: false as const, code: 'forbidden', message: 'Unequip this item before transferring the final stack.' };
    }

    const senderInventoryUpdate = await decrementInventoryQuantity(tx, inventoryItem.id, quantity);
    if (!senderInventoryUpdate.ok) {
      return { ok: false as const, code: 'conflict', message: 'Inventory item is no longer available.' };
    }

    const recipientInventoryItem = await addInventoryQuantity(tx, {
      characterId: recipient.id,
      itemKey: inventoryItem.itemKey,
      quantity,
      metadata: { transferredFromCharacterId: sender.id },
    });

    await tx.insert(playerEvents).values([
      {
        userId: input.userId,
        characterId: sender.id,
        type: 'inventory_item_transferred',
        payload: {
          direction: 'sent',
          recipientCharacterId: recipient.id,
          recipientName: recipient.name,
          itemKey: inventoryItem.itemKey,
          itemName: inventoryItem.item.name,
          quantity,
        },
      },
      {
        userId: recipient.userId,
        characterId: recipient.id,
        type: 'inventory_item_received',
        payload: {
          direction: 'received',
          senderCharacterId: sender.id,
          senderName: sender.name,
          itemKey: inventoryItem.itemKey,
          itemName: inventoryItem.item.name,
          quantity,
        },
      },
    ]);

    await tx.insert(financialTransactions).values({
      characterId: sender.id,
      type: 'system',
      amount: '0',
      description: `Transferred ${quantity} x ${inventoryItem.item.name} to ${recipient.name}.`,
      metadata: { action: 'inventory_transfer', recipientCharacterId: recipient.id, itemKey: inventoryItem.itemKey, quantity },
    });

    await setActionCooldown({
      tx,
      characterId: sender.id,
      actionType: 'item_transfer',
      cooldownSeconds: ITEM_TRANSFER_COOLDOWN_SECONDS,
      metadata: { recipientCharacterId: recipient.id, itemKey: inventoryItem.itemKey, quantity },
    });

    return {
      ok: true as const,
      data: {
        senderInventoryItem: senderInventoryUpdate.inventoryItem,
        recipientInventoryItem,
        recipient: { id: recipient.id, name: recipient.name, location: recipient.location },
        quantity,
      },
    };
  });
}
