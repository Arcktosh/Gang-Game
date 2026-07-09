import { and, eq, sql } from 'drizzle-orm';
import {
  characterAssetPositions,
  characters,
  contracts,
  inventoryItems,
  shopListings,
} from '../schema';

type Tx = any;

function normalizeExperienceGain(experienceGain: number) {
  return Math.max(0, Math.floor(experienceGain));
}

function nextExperienceSql(experienceGain: number) {
  return sql`greatest(0, ${characters.experience} + ${normalizeExperienceGain(experienceGain)})`;
}

function nextLevelSql(experienceGain: number) {
  return sql`greatest(1, floor(sqrt((${nextExperienceSql(experienceGain)}) / 100.0))::integer + 1)`;
}

function nextMaxNerveSql(experienceGain: number) {
  return sql`greatest(${characters.maxNerve}, 20 + (${nextLevelSql(experienceGain)} - 1))`;
}

export async function decrementCharacterCash(tx: Tx, characterId: string, amount: number) {
  const normalizedAmount = Math.max(0, Math.floor(amount));

  if (normalizedAmount === 0) {
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });
    return { ok: Boolean(character), character };
  }

  const [character] = await tx
    .update(characters)
    .set({ cash: sql`${characters.cash} - ${normalizedAmount}`, updatedAt: sql`now()` })
    .where(and(eq(characters.id, characterId), sql`${characters.cash} >= ${normalizedAmount}`))
    .returning();

  return { ok: Boolean(character), character };
}

export async function incrementCharacterCash(tx: Tx, characterId: string, amount: number) {
  const normalizedAmount = Math.max(0, Math.floor(amount));
  const [character] = await tx
    .update(characters)
    .set({ cash: sql`${characters.cash} + ${normalizedAmount}`, updatedAt: sql`now()` })
    .where(eq(characters.id, characterId))
    .returning();

  return { ok: Boolean(character), character };
}

export async function adjustCharacterCash(tx: Tx, characterId: string, delta: number) {
  const normalizedDelta = Math.floor(delta);

  if (normalizedDelta < 0) {
    return decrementCharacterCash(tx, characterId, Math.abs(normalizedDelta));
  }

  return incrementCharacterCash(tx, characterId, normalizedDelta);
}

export async function incrementCharacterBank(tx: Tx, characterId: string, amount: number) {
  const normalizedAmount = Math.max(0, Math.floor(amount));
  const [character] = await tx
    .update(characters)
    .set({ bank: sql`${characters.bank} + ${normalizedAmount}`, updatedAt: sql`now()` })
    .where(eq(characters.id, characterId))
    .returning();

  return { ok: Boolean(character), character };
}

export async function decrementCharacterBank(tx: Tx, characterId: string, amount: number) {
  const normalizedAmount = Math.max(0, Math.floor(amount));

  if (normalizedAmount === 0) {
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });
    return { ok: Boolean(character), character };
  }

  const [character] = await tx
    .update(characters)
    .set({ bank: sql`${characters.bank} - ${normalizedAmount}`, updatedAt: sql`now()` })
    .where(and(eq(characters.id, characterId), sql`${characters.bank} >= ${normalizedAmount}`))
    .returning();

  return { ok: Boolean(character), character };
}

export async function adjustCharacterBank(tx: Tx, characterId: string, delta: number) {
  const normalizedDelta = Math.floor(delta);

  if (normalizedDelta < 0) {
    return decrementCharacterBank(tx, characterId, Math.abs(normalizedDelta));
  }

  return incrementCharacterBank(tx, characterId, normalizedDelta);
}

export async function decrementInventoryQuantity(
  tx: Tx,
  inventoryItemId: string,
  quantity: number,
) {
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const [inventoryItem] = await tx
    .update(inventoryItems)
    .set({
      quantity: sql`${inventoryItems.quantity} - ${normalizedQuantity}`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(inventoryItems.id, inventoryItemId),
        sql`${inventoryItems.quantity} >= ${normalizedQuantity}`,
      ),
    )
    .returning();

  return { ok: Boolean(inventoryItem), inventoryItem };
}

export async function reserveShopListingQuantity(tx: Tx, listingId: string, quantity: number) {
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const [listing] = await tx
    .update(shopListings)
    .set({
      soldQuantity: sql`${shopListings.soldQuantity} + ${normalizedQuantity}`,
      status: sql`case when ${shopListings.soldQuantity} + ${normalizedQuantity} >= ${shopListings.quantity} then 'sold'::listing_status else ${shopListings.status} end`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(shopListings.id, listingId),
        eq(shopListings.status, 'active'),
        sql`${shopListings.quantity} - ${shopListings.soldQuantity} >= ${normalizedQuantity}`,
      ),
    )
    .returning();

  return { ok: Boolean(listing), listing };
}

export async function cancelActiveShopListing(tx: Tx, listingId: string) {
  const [listing] = await tx
    .update(shopListings)
    .set({ status: 'cancelled', updatedAt: sql`now()` })
    .where(and(eq(shopListings.id, listingId), eq(shopListings.status, 'active')))
    .returning();

  return { ok: Boolean(listing), listing };
}

export async function completeJobCharacterUpdate(
  tx: Tx,
  input: { characterId: string; energyCost: number; payout: number; experienceGain: number },
) {
  const [character] = await tx
    .update(characters)
    .set({
      cash: sql`${characters.cash} + ${input.payout}`,
      energy: sql`${characters.energy} - ${input.energyCost}`,
      experience: nextExperienceSql(input.experienceGain),
      level: nextLevelSql(input.experienceGain),
      maxNerve: nextMaxNerveSql(input.experienceGain),
      nerve: sql`least(${characters.nerve}, ${nextMaxNerveSql(input.experienceGain)})`,
      updatedAt: sql`now()`,
    })
    .where(
      and(eq(characters.id, input.characterId), sql`${characters.energy} >= ${input.energyCost}`),
    )
    .returning();

  return { ok: Boolean(character), character };
}

export async function resolveCrimeCharacterUpdate(
  tx: Tx,
  input: {
    characterId: string;
    cashDelta: number;
    nerveCost: number;
    heatGain: number;
    health: number;
    status: 'free' | 'traveling' | 'jailed' | 'hospitalized';
    statusUntil: Date | null;
    statusReason: string | null;
    experienceGain: number;
  },
) {
  const [character] = await tx
    .update(characters)
    .set({
      cash: sql`greatest(0, ${characters.cash} + ${input.cashDelta})`,
      nerve: sql`least(${characters.nerve} - ${input.nerveCost}, ${nextMaxNerveSql(input.experienceGain)})`,
      heat: sql`${characters.heat} + ${input.heatGain}`,
      health: input.health,
      status: input.status,
      statusUntil: input.statusUntil,
      statusReason: input.statusReason,
      experience: nextExperienceSql(input.experienceGain),
      level: nextLevelSql(input.experienceGain),
      maxNerve: nextMaxNerveSql(input.experienceGain),
      updatedAt: sql`now()`,
    })
    .where(
      and(eq(characters.id, input.characterId), sql`${characters.nerve} >= ${input.nerveCost}`),
    )
    .returning();

  return { ok: Boolean(character), character };
}

export async function debitContractPosterCost(tx: Tx, characterId: string, amount: number) {
  return decrementCharacterCash(tx, characterId, amount);
}

export async function refundContractEscrow(tx: Tx, characterId: string, amount: number) {
  return incrementCharacterCash(tx, characterId, amount);
}

export async function acceptOpenContract(
  tx: Tx,
  input: { contractId: string; assigneeCharacterId: string },
) {
  const [contract] = await tx
    .update(contracts)
    .set({
      assignedToCharacterId: input.assigneeCharacterId,
      status: 'accepted',
      acceptedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(contracts.id, input.contractId),
        eq(contracts.status, 'open'),
        sql`(${contracts.expiresAt} is null or ${contracts.expiresAt} > now())`,
      ),
    )
    .returning();

  return { ok: Boolean(contract), contract };
}

export async function completeAcceptedContract(
  tx: Tx,
  input: { contractId: string; assigneeCharacterId: string },
) {
  const [contract] = await tx
    .update(contracts)
    .set({ status: 'completed', completedAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(contracts.id, input.contractId),
        eq(contracts.status, 'accepted'),
        eq(contracts.assignedToCharacterId, input.assigneeCharacterId),
      ),
    )
    .returning();

  return { ok: Boolean(contract), contract };
}

export async function cancelOpenContract(
  tx: Tx,
  input: { contractId: string; creatorCharacterId: string },
) {
  const [contract] = await tx
    .update(contracts)
    .set({ status: 'cancelled', cancelledAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(contracts.id, input.contractId),
        eq(contracts.status, 'open'),
        eq(contracts.createdByCharacterId, input.creatorCharacterId),
      ),
    )
    .returning();

  return { ok: Boolean(contract), contract };
}

export async function reserveAssetPositionQuantity(tx: Tx, positionId: string, quantity: number) {
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const [position] = await tx
    .update(characterAssetPositions)
    .set({
      quantity: sql`${characterAssetPositions.quantity} - ${normalizedQuantity}`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(characterAssetPositions.id, positionId),
        sql`${characterAssetPositions.quantity} >= ${normalizedQuantity}`,
      ),
    )
    .returning();

  return { ok: Boolean(position), position };
}

export async function addAssetPositionQuantity(
  tx: Tx,
  input: { characterId: string; assetKey: string; quantity: number; averageCost: number },
) {
  const normalizedQuantity = Math.max(1, Math.floor(input.quantity));
  const [position] = await tx
    .insert(characterAssetPositions)
    .values({
      characterId: input.characterId,
      assetKey: input.assetKey,
      quantity: normalizedQuantity,
      averageCost: input.averageCost,
    })
    .onConflictDoUpdate({
      target: [characterAssetPositions.characterId, characterAssetPositions.assetKey],
      set: {
        quantity: sql`${characterAssetPositions.quantity} + ${normalizedQuantity}`,
        averageCost: input.averageCost,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return { ok: Boolean(position), position };
}
