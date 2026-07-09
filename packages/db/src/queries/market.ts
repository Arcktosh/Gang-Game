import { and, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm';
import {
  buildMarketEventNewsArticle,
  calculateMarketEventImpact,
  hydrateMarketEventOccurrence,
  scheduleMarketEventOccurrence,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characters,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  marketEvents,
  marketPrices,
  newspaperArticles,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import {
  decrementCharacterCash,
  decrementInventoryQuantity,
  incrementCharacterCash,
} from './transaction-safety';

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

  return latestPrices.filter(
    (entry): entry is Exclude<(typeof latestPrices)[number], null> => entry !== null,
  );
}

async function getLatestMarketPrice(tx: any, location: string, itemKey: string) {
  return tx.query.marketPrices.findFirst({
    where: and(eq(marketPrices.location, location), eq(marketPrices.itemKey, itemKey)),
    orderBy: desc(marketPrices.createdAt),
  });
}

function normalizeMarketLocation(location?: string | null) {
  const normalized = location?.trim().toLowerCase();
  return normalized || 'starter-city';
}

function marketEventSlug(input: {
  eventId: string;
  eventKey: string;
  location: string;
  itemKey: string;
}) {
  const base = [input.eventKey, input.location, input.itemKey]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 72);

  return `${base || 'market-event'}-${input.eventId.slice(0, 8)}`;
}

export async function listMarketLocations() {
  const rows = await db
    .select({ location: marketPrices.location })
    .from(marketPrices)
    .groupBy(marketPrices.location);

  return rows
    .map((row) => row.location)
    .filter((location): location is string => Boolean(location));
}

export async function scheduleMarketEventsForLocation(
  input: {
    location?: string | null;
    now?: Date;
    seed?: string | number | null;
    cadenceHours?: number;
    limit?: number;
  } = {},
) {
  const location = normalizeMarketLocation(input.location);
  const now = input.now ?? new Date();
  const market = await listMarketForLocation(location);
  const limit = Math.min(Math.max(input.limit ?? market.length, 1), 25);
  const scheduled = [];

  for (const entry of market.slice(0, limit)) {
    const occurrence = scheduleMarketEventOccurrence({
      location,
      itemKey: entry.itemKey,
      now,
      seed: input.seed ?? 'market-worker',
      cadenceHours: input.cadenceHours,
    });

    if (!occurrence || occurrence.status === 'expired') {
      continue;
    }

    const [row] = await db
      .insert(marketEvents)
      .values({
        eventKey: occurrence.eventKey,
        location: occurrence.location,
        itemKey: occurrence.itemKey ?? entry.itemKey,
        status: 'scheduled',
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        metadata: {
          source: 'market_event_scheduler',
          eventKind: occurrence.event.kind,
          durationHours: occurrence.event.durationHours,
          cadenceHours: input.cadenceHours ?? null,
          supplyMultiplier: occurrence.event.supplyMultiplier,
          demandMultiplier: occurrence.event.demandMultiplier,
          volatilityDelta: occurrence.event.volatilityDelta,
          riskDelta: occurrence.event.riskDelta,
        },
      })
      .onConflictDoUpdate({
        target: [
          marketEvents.eventKey,
          marketEvents.location,
          marketEvents.itemKey,
          marketEvents.startsAt,
        ],
        set: {
          endsAt: occurrence.endsAt,
          updatedAt: sql`now()`,
          metadata: sql`${marketEvents.metadata} || ${JSON.stringify({ lastScheduledAt: now.toISOString() })}::jsonb`,
        },
      })
      .returning();

    scheduled.push(row);
  }

  return scheduled;
}

export async function listActiveMarketEventsForLocation(location: string, now = new Date()) {
  const normalizedLocation = normalizeMarketLocation(location);
  const rows = await db.query.marketEvents.findMany({
    where: and(
      eq(marketEvents.location, normalizedLocation),
      lte(marketEvents.startsAt, now),
      gt(marketEvents.endsAt, now),
    ),
    orderBy: desc(marketEvents.startsAt),
    limit: 25,
  });

  const activeEvents = await Promise.all(
    rows.map(async (row) => {
      const occurrence = hydrateMarketEventOccurrence({
        eventKey: row.eventKey,
        location: row.location,
        itemKey: row.itemKey,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        now,
      });

      if (!occurrence) {
        return null;
      }

      const [item, price] = await Promise.all([
        db.query.itemDefinitions.findFirst({ where: eq(itemDefinitions.key, row.itemKey) }),
        getLatestMarketPrice(db, row.location, row.itemKey),
      ]);
      const impact = price
        ? calculateMarketEventImpact({
            basePrice: price.price,
            supply: price.supply,
            demand: price.demand,
            volatility: 0,
            eventKey: row.eventKey,
          })
        : null;

      return {
        id: row.id,
        eventKey: row.eventKey,
        location: row.location,
        itemKey: row.itemKey,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: occurrence.status,
        event: occurrence.event,
        item: item
          ? {
              key: item.key,
              name: item.name,
              category: item.category,
              description: item.description,
            }
          : null,
        impact,
        publishedArticleId: row.publishedArticleId,
      };
    }),
  );

  return activeEvents.filter(
    (event): event is Exclude<(typeof activeEvents)[number], null> => event !== null,
  );
}

export async function publishActiveMarketEventArticles(
  input: { location?: string | null; now?: Date; limit?: number } = {},
) {
  const location = input.location ? normalizeMarketLocation(input.location) : null;
  const now = input.now ?? new Date();
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);
  const rows = await db.query.marketEvents.findMany({
    where: location
      ? and(
          eq(marketEvents.location, location),
          isNull(marketEvents.publishedArticleId),
          lte(marketEvents.startsAt, now),
          gt(marketEvents.endsAt, now),
        )
      : and(
          isNull(marketEvents.publishedArticleId),
          lte(marketEvents.startsAt, now),
          gt(marketEvents.endsAt, now),
        ),
    orderBy: desc(marketEvents.startsAt),
    limit,
  });

  const published = [];

  for (const row of rows) {
    const occurrence = hydrateMarketEventOccurrence({
      eventKey: row.eventKey,
      location: row.location,
      itemKey: row.itemKey,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      now,
    });

    if (!occurrence) {
      continue;
    }

    const item = await db.query.itemDefinitions.findFirst({
      where: eq(itemDefinitions.key, row.itemKey),
    });
    const articlePayload = buildMarketEventNewsArticle({
      occurrence,
      itemName: item?.name ?? row.itemKey,
    });

    const result = await db.transaction(async (tx) => {
      const [article] = await tx
        .insert(newspaperArticles)
        .values({
          authorCharacterId: null,
          location: row.location,
          category: articlePayload.category,
          title: articlePayload.title,
          slug: marketEventSlug({
            eventId: row.id,
            eventKey: row.eventKey,
            location: row.location,
            itemKey: row.itemKey,
          }),
          excerpt: articlePayload.excerpt,
          body: articlePayload.body,
          visibility: 'public',
          isPublished: true,
          metadata: { ...articlePayload.metadata, marketEventId: row.id },
        })
        .returning();

      const [updatedEvent] = await tx
        .update(marketEvents)
        .set({ publishedArticleId: article.id, status: 'published', updatedAt: sql`now()` })
        .where(and(eq(marketEvents.id, row.id), isNull(marketEvents.publishedArticleId)))
        .returning();

      return { article, marketEvent: updatedEvent };
    });

    if (result.marketEvent) {
      published.push(result);
    }
  }

  return published;
}

export async function expireMarketEvents(now = new Date()) {
  return db
    .update(marketEvents)
    .set({ status: 'expired', updatedAt: sql`now()` })
    .where(and(lte(marketEvents.endsAt, now), eq(marketEvents.status, 'scheduled')))
    .returning();
}

export async function runMarketEventTick(
  input: {
    now?: Date;
    seed?: string | number | null;
    cadenceHours?: number;
    locations?: string[];
  } = {},
) {
  const now = input.now ?? new Date();
  const locations = input.locations?.length ? input.locations : await listMarketLocations();
  const scheduled = [];

  for (const location of locations.length ? locations : ['starter-city']) {
    scheduled.push(
      ...(await scheduleMarketEventsForLocation({
        location,
        now,
        seed: input.seed,
        cadenceHours: input.cadenceHours,
      })),
    );
  }

  const published = await publishActiveMarketEventArticles({ now });
  const expired = await expireMarketEvents(now);

  return { scheduled, published, expired };
}

export async function buyMarketItem(input: {
  userId: string;
  characterId: string;
  itemKey: string;
  quantity: number;
}) {
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
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available for market trading.',
      };
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
      return {
        ok: false as const,
        code: 'not_found',
        message: 'Market item not found at this location.',
      };
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
      payload: {
        itemKey: item.key,
        itemName: item.name,
        quantity,
        priceEach: priceRow.price,
        totalCost,
      },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'market_buy',
      cooldownSeconds: MARKET_COOLDOWN_SECONDS,
      metadata: { itemKey: item.key, quantity },
    });

    return {
      ok: true as const,
      data: { character: updatedCharacter, inventoryItem, marketPrice: updatedPrice, lock },
    };
  });
}

export async function sellMarketItem(input: {
  userId: string;
  characterId: string;
  itemKey: string;
  quantity: number;
}) {
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
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available for market trading.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'market_sell');

    if (!cooldown.ok) {
      return cooldown;
    }

    const inventoryItem = await tx.query.inventoryItems.findFirst({
      where: and(
        eq(inventoryItems.characterId, character.id),
        eq(inventoryItems.itemKey, input.itemKey),
      ),
    });

    if (!inventoryItem || inventoryItem.quantity < quantity) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough inventory to sell.' };
    }

    const [item, priceRow] = await Promise.all([
      tx.query.itemDefinitions.findFirst({ where: eq(itemDefinitions.key, input.itemKey) }),
      getLatestMarketPrice(tx, character.location, input.itemKey),
    ]);

    if (!item || !priceRow) {
      return {
        ok: false as const,
        code: 'not_found',
        message: 'Market item not found at this location.',
      };
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
      payload: {
        itemKey: item.key,
        itemName: item.name,
        quantity,
        priceEach: sellPriceEach,
        totalPayout,
      },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'market_sell',
      cooldownSeconds: MARKET_COOLDOWN_SECONDS,
      metadata: { itemKey: item.key, quantity },
    });

    return {
      ok: true as const,
      data: {
        character: updatedCharacter,
        inventoryItem: updatedInventoryItem,
        marketPrice: updatedPrice,
        lock,
      },
    };
  });
}
