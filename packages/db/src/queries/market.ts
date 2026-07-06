import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  characters,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  marketPrices,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import { decrementCharacterCash, decrementInventoryQuantity, incrementCharacterCash } from './transaction-safety';

const MARKET_COOLDOWN_SECONDS = 5;

export async function listMarketForLocation(location: string) {
  const items = await db.query.itemDefinitions.findMany();
  const latestPrices = await Promise.all(
    items.map(async (item) => {
      const price = await db.query.marketPrices.findFirst({
        where: and(eq(marketPrices.location, location), eq(marketPrices.itemKey, item.key)),
        orderBy: desc(marketPrices.createdAt),
      });

      return price
        ? {
            itemKey: price.itemKey,
            price: price.price,
            supply: price.supply,
            demand: price.demand,
            item: {
              key: item.key,
              name: item.name,
              category: item.category,
              description: item.description,
              isIllegal: item.isIllegal,
            },
          }
        : null;
    }),
  );

  return latestPrices.filter((entry): entry is Exclude<(typeof latestPrices)[number], null> => entry !== null);
}

async function getLatestMarketPrice(tx: any, location: string, itemKey: string) {
  return tx.query.marketPrices.findFirst({
    where: and(eq(marketPrices.location, location), eq(marketPrices.itemKey, itemKey)),
    orderBy: desc(marketPrices.createdAt),
  });
}

export async function buyMarketItem(input: { userId: string; characterId: string; itemKey: string; quantity: number }) {
  return db.transaction(async (tx) => {
    const quantity = Math.max(1, Math.floor(input.quantity));
    const characterRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available for market trading.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'market_buy');

    if (!cooldown.ok) {
      return cooldown;
    }

    const [item, priceRow] = await Promise.all([
      tx.query.itemDefinitions.findFirst({ where: eq(itemDefinitions.key, input.itemKey) }),
      getLatestMarketPrice(tx, character.location, input.itemKey),
    ]);

    if (!item || !priceRow) {
      return { ok: false as const, code: 'not_found', message: 'Market item not found at this location.' };
    }

    if (priceRow.supply < quantity) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough market supply.' };
    }

    const totalCost = priceRow.price * quantity;

    if (character.cash < totalCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
    }

    const cashDebit = await decrementCharacterCash(tx, character.id, totalCost);

    if (!cashDebit.ok || !cashDebit.character) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
    }

    const [inventoryItem] = await tx
      .insert(inventoryItems)
      .values({ characterId: character.id, itemKey: item.key, quantity })
      .onConflictDoUpdate({
        target: [inventoryItems.characterId, inventoryItems.itemKey],
        set: { quantity: sql`${inventoryItems.quantity} + ${quantity}`, updatedAt: sql`now()` },
      })
      .returning();

    const updatedCharacter = cashDebit.character;

    const [updatedPrice] = await tx
      .insert(marketPrices)
      .values({
        location: character.location,
        itemKey: item.key,
        price: Math.max(1, priceRow.price + Math.ceil(quantity / 10)),
        supply: Math.max(0, priceRow.supply - quantity),
        demand: priceRow.demand + Math.max(1, Math.floor(quantity / 2)),
      })
      .returning();

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'shop',
      amount: String(-totalCost),
      description: `Bought ${quantity}x ${item.name} from ${character.location} market.`,
      metadata: { itemKey: item.key, quantity, priceEach: priceRow.price },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: 'market_item_bought',
      payload: { itemKey: item.key, itemName: item.name, quantity, priceEach: priceRow.price, totalCost },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'market_buy',
      cooldownSeconds: MARKET_COOLDOWN_SECONDS,
      metadata: { itemKey: item.key, quantity },
    });

    return { ok: true as const, data: { character: updatedCharacter, inventoryItem, marketPrice: updatedPrice, lock } };
  });
}

export async function sellMarketItem(input: { userId: string; characterId: string; itemKey: string; quantity: number }) {
  return db.transaction(async (tx) => {
    const quantity = Math.max(1, Math.floor(input.quantity));
    const characterRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available for market trading.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'market_sell');

    if (!cooldown.ok) {
      return cooldown;
    }

    const inventoryItem = await tx.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.characterId, character.id), eq(inventoryItems.itemKey, input.itemKey)),
    });

    if (!inventoryItem || inventoryItem.quantity < quantity) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough inventory to sell.' };
    }

    const [item, priceRow] = await Promise.all([
      tx.query.itemDefinitions.findFirst({ where: eq(itemDefinitions.key, input.itemKey) }),
      getLatestMarketPrice(tx, character.location, input.itemKey),
    ]);

    if (!item || !priceRow) {
      return { ok: false as const, code: 'not_found', message: 'Market item not found at this location.' };
    }

    const sellPriceEach = Math.max(1, Math.floor(priceRow.price * 0.85));
    const totalPayout = sellPriceEach * quantity;

    const inventoryDebit = await decrementInventoryQuantity(tx, inventoryItem.id, quantity);

    if (!inventoryDebit.ok || !inventoryDebit.inventoryItem) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough inventory to sell.' };
    }

    const cashCredit = await incrementCharacterCash(tx, character.id, totalPayout);

    if (!cashCredit.ok || !cashCredit.character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const updatedInventoryItem = inventoryDebit.inventoryItem;
    const updatedCharacter = cashCredit.character;

    const [updatedPrice] = await tx
      .insert(marketPrices)
      .values({
        location: character.location,
        itemKey: item.key,
        price: Math.max(1, priceRow.price - Math.ceil(quantity / 10)),
        supply: priceRow.supply + quantity,
        demand: Math.max(0, priceRow.demand - Math.max(1, Math.floor(quantity / 2))),
      })
      .returning();

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'shop',
      amount: String(totalPayout),
      description: `Sold ${quantity}x ${item.name} to ${character.location} market.`,
      metadata: { itemKey: item.key, quantity, priceEach: sellPriceEach },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: 'market_item_sold',
      payload: { itemKey: item.key, itemName: item.name, quantity, priceEach: sellPriceEach, totalPayout },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'market_sell',
      cooldownSeconds: MARKET_COOLDOWN_SECONDS,
      metadata: { itemKey: item.key, quantity },
    });

    return { ok: true as const, data: { character: updatedCharacter, inventoryItem: updatedInventoryItem, marketPrice: updatedPrice, lock } };
  });
}
