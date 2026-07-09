import { and, desc, eq, lte, ne, or, sql } from 'drizzle-orm';
import {
  calculatePlayerTradeExpiry,
  calculatePlayerTradeQuote,
  summarizePlayerTradeOffers,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characters,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  playerEvents,
  playerTradeOffers,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import {
  decrementCharacterCash,
  decrementInventoryQuantity,
  incrementCharacterCash,
} from './transaction-safety';

const PLAYER_TRADE_COOLDOWN_SECONDS = 5;
const PLAYER_TRADE_FEE_BASIS_POINTS = 250;

type TradeOfferRow = typeof playerTradeOffers.$inferSelect & {
  seller?: { id: string; name: string; location: string; status: string } | null;
  buyer?: { id: string; name: string; location: string; status: string } | null;
  item?: { key: string; name: string; category: string; description: string } | null;
};

function normalizeTradeOffer(row: TradeOfferRow, now = new Date()) {
  const quote = calculatePlayerTradeQuote({
    quantity: row.quantity,
    priceEach: row.priceEach,
    sellerFeeBasisPoints: PLAYER_TRADE_FEE_BASIS_POINTS,
  });

  return {
    id: row.id,
    status: row.status,
    sellerCharacterId: row.sellerCharacterId,
    buyerCharacterId: row.buyerCharacterId,
    itemKey: row.itemKey,
    quantity: quote.quantity,
    priceEach: quote.priceEach,
    gross: quote.gross,
    sellerFee: quote.sellerFee,
    sellerPayout: quote.sellerPayout,
    buyerCost: quote.buyerCost,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isExpired: row.status === 'open' && row.expiresAt <= now,
    seller: row.seller
      ? {
          id: row.seller.id,
          name: row.seller.name,
          location: row.seller.location,
          status: row.seller.status,
        }
      : null,
    buyer: row.buyer
      ? {
          id: row.buyer.id,
          name: row.buyer.name,
          location: row.buyer.location,
          status: row.buyer.status,
        }
      : null,
    item: row.item
      ? {
          key: row.item.key,
          name: row.item.name,
          category: row.item.category,
          description: row.item.description,
        }
      : null,
  };
}

async function addInventoryQuantity(
  tx: any,
  input: { characterId: string; itemKey: string; quantity: number },
) {
  const quantity = Math.max(1, Math.floor(input.quantity));

  const [inventoryItem] = await tx
    .insert(inventoryItems)
    .values({ characterId: input.characterId, itemKey: input.itemKey, quantity })
    .onConflictDoUpdate({
      target: [inventoryItems.characterId, inventoryItems.itemKey],
      set: { quantity: sql`${inventoryItems.quantity} + ${quantity}`, updatedAt: sql`now()` },
    })
    .returning();

  return inventoryItem;
}

export async function listTradeCandidates(input: {
  characterId: string;
  location: string;
  limit?: number;
}) {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));

  return db.query.characters.findMany({
    where: and(
      ne(characters.id, input.characterId),
      eq(characters.location, input.location),
      eq(characters.status, 'free'),
    ),
    orderBy: desc(characters.updatedAt),
    limit: safeLimit,
    columns: {
      id: true,
      name: true,
      location: true,
      level: true,
      status: true,
    },
  });
}

export async function listPlayerTradeCenter(input: { userId: string; characterId: string }) {
  await expireOpenPlayerTradeOffers({ limit: 50 });

  const character = await db.query.characters.findFirst({
    where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
  });

  if (!character) {
    return { ok: false as const, code: 'not_found', message: 'Character not found.' };
  }

  const [sentRows, receivedRows, inventory, candidates] = await Promise.all([
    db.query.playerTradeOffers.findMany({
      where: eq(playerTradeOffers.sellerCharacterId, character.id),
      with: { seller: true, buyer: true, item: true },
      orderBy: desc(playerTradeOffers.createdAt),
      limit: 50,
    }),
    db.query.playerTradeOffers.findMany({
      where: eq(playerTradeOffers.buyerCharacterId, character.id),
      with: { seller: true, buyer: true, item: true },
      orderBy: desc(playerTradeOffers.createdAt),
      limit: 50,
    }),
    db.query.inventoryItems.findMany({
      where: eq(inventoryItems.characterId, character.id),
      with: { item: true },
      orderBy: desc(inventoryItems.updatedAt),
      limit: 100,
    }),
    listTradeCandidates({ characterId: character.id, location: character.location }),
  ]);

  const now = new Date();
  const sentOffers = sentRows.map((row) => normalizeTradeOffer(row, now));
  const receivedOffers = receivedRows.map((row) => normalizeTradeOffer(row, now));

  return {
    ok: true as const,
    data: {
      character,
      summary: summarizePlayerTradeOffers({ sentOffers, receivedOffers }),
      sentOffers,
      receivedOffers,
      inventory: inventory.map((row) => ({
        id: row.id,
        itemKey: row.itemKey,
        quantity: row.quantity,
        item: row.item
          ? {
              key: row.item.key,
              name: row.item.name,
              category: row.item.category,
              description: row.item.description,
            }
          : null,
      })),
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        location: candidate.location,
        level: candidate.level,
        status: candidate.status,
      })),
    },
  };
}

export async function createPlayerTradeOffer(input: {
  userId: string;
  characterId: string;
  recipientCharacterId: string;
  itemKey: string;
  quantity: number;
  priceEach: number;
  expiresInHours?: number;
}) {
  return db.transaction(async (tx) => {
    const sellerRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!sellerRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const seller = await refreshCharacterResources(tx, sellerRow);

    if (seller.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to create trades.',
      };
    }

    if (seller.id === input.recipientCharacterId) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Cannot create a trade with yourself.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, seller.id, 'trade_create');

    if (!cooldown.ok) {
      return cooldown;
    }

    const [buyer, item, inventoryItem] = await Promise.all([
      tx.query.characters.findFirst({ where: eq(characters.id, input.recipientCharacterId) }),
      tx.query.itemDefinitions.findFirst({ where: eq(itemDefinitions.key, input.itemKey) }),
      tx.query.inventoryItems.findFirst({
        where: and(
          eq(inventoryItems.characterId, seller.id),
          eq(inventoryItems.itemKey, input.itemKey),
        ),
      }),
    ]);

    if (!buyer) {
      return { ok: false as const, code: 'not_found', message: 'Recipient character not found.' };
    }

    if (buyer.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Recipient is not available to trade.',
      };
    }

    if (buyer.location !== seller.location) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Private trades require both characters to be in the same location.',
      };
    }

    if (!item) {
      return { ok: false as const, code: 'not_found', message: 'Trade item not found.' };
    }

    const quote = calculatePlayerTradeQuote({
      quantity: input.quantity,
      priceEach: input.priceEach,
      sellerFeeBasisPoints: PLAYER_TRADE_FEE_BASIS_POINTS,
    });

    if (!inventoryItem || inventoryItem.quantity < quote.quantity) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Not enough inventory to reserve for this trade.',
      };
    }

    const inventoryDebit = await decrementInventoryQuantity(tx, inventoryItem.id, quote.quantity);

    if (!inventoryDebit.ok) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Not enough inventory to reserve for this trade.',
      };
    }

    const expiry = calculatePlayerTradeExpiry({ expiresInHours: input.expiresInHours });
    const [offer] = await tx
      .insert(playerTradeOffers)
      .values({
        sellerCharacterId: seller.id,
        buyerCharacterId: buyer.id,
        itemKey: item.key,
        quantity: quote.quantity,
        priceEach: quote.priceEach,
        status: 'open',
        expiresAt: expiry.expiresAt,
        metadata: {
          feeBasisPoints: PLAYER_TRADE_FEE_BASIS_POINTS,
          gross: quote.gross,
          sellerFee: quote.sellerFee,
          sellerPayout: quote.sellerPayout,
          reservedInventoryItemId: inventoryItem.id,
        },
      })
      .returning();

    await tx.insert(playerEvents).values([
      {
        userId: seller.userId,
        characterId: seller.id,
        type: 'player_trade_created',
        payload: {
          tradeOfferId: offer.id,
          buyerCharacterId: buyer.id,
          itemKey: item.key,
          quantity: quote.quantity,
          priceEach: quote.priceEach,
        },
      },
      {
        userId: buyer.userId,
        characterId: buyer.id,
        type: 'player_trade_received',
        payload: {
          tradeOfferId: offer.id,
          sellerCharacterId: seller.id,
          itemKey: item.key,
          quantity: quote.quantity,
          priceEach: quote.priceEach,
        },
      },
    ]);

    const lock = await setActionCooldown({
      tx,
      characterId: seller.id,
      actionType: 'trade_create',
      cooldownSeconds: PLAYER_TRADE_COOLDOWN_SECONDS,
      metadata: { tradeOfferId: offer.id, itemKey: item.key, quantity: quote.quantity },
    });

    return {
      ok: true as const,
      data: { offer: normalizeTradeOffer({ ...offer, seller, buyer, item }), lock },
    };
  });
}

export async function acceptPlayerTradeOffer(input: {
  userId: string;
  characterId: string;
  tradeOfferId: string;
}) {
  await expireOpenPlayerTradeOffers({ limit: 50 });

  return db.transaction(async (tx) => {
    const buyerRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!buyerRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const buyer = await refreshCharacterResources(tx, buyerRow);

    if (buyer.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to accept trades.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, buyer.id, 'trade_accept');

    if (!cooldown.ok) {
      return cooldown;
    }

    const offer = await tx.query.playerTradeOffers.findFirst({
      where: and(
        eq(playerTradeOffers.id, input.tradeOfferId),
        eq(playerTradeOffers.buyerCharacterId, buyer.id),
        eq(playerTradeOffers.status, 'open'),
      ),
      with: { seller: true, buyer: true, item: true },
    });

    if (!offer) {
      return { ok: false as const, code: 'not_found', message: 'Open trade offer not found.' };
    }

    if (offer.expiresAt <= new Date()) {
      return { ok: false as const, code: 'conflict', message: 'Trade offer has expired.' };
    }

    if (!offer.seller || !offer.item) {
      return {
        ok: false as const,
        code: 'not_found',
        message: 'Trade offer is missing seller or item data.',
      };
    }

    if (offer.seller.location !== buyer.location) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Both traders must remain in the same location.',
      };
    }

    const quote = calculatePlayerTradeQuote({
      quantity: offer.quantity,
      priceEach: offer.priceEach,
      sellerFeeBasisPoints: PLAYER_TRADE_FEE_BASIS_POINTS,
    });

    const cashDebit = await decrementCharacterCash(tx, buyer.id, quote.buyerCost);

    if (!cashDebit.ok || !cashDebit.character) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Not enough cash to accept this trade.',
      };
    }

    const sellerGrossCredit = await incrementCharacterCash(
      tx,
      offer.sellerCharacterId,
      quote.gross,
    );

    if (!sellerGrossCredit.ok || !sellerGrossCredit.character) {
      return { ok: false as const, code: 'not_found', message: 'Seller character not found.' };
    }

    const sellerFeeDebit = await decrementCharacterCash(
      tx,
      offer.sellerCharacterId,
      quote.sellerFee,
    );

    if (!sellerFeeDebit.ok || !sellerFeeDebit.character) {
      return { ok: false as const, code: 'conflict', message: 'Seller fee could not be applied.' };
    }

    const buyerInventoryItem = await addInventoryQuantity(tx, {
      characterId: buyer.id,
      itemKey: offer.itemKey,
      quantity: quote.quantity,
    });

    const [updatedOffer] = await tx
      .update(playerTradeOffers)
      .set({
        status: 'accepted',
        acceptedAt: sql`now()`,
        updatedAt: sql`now()`,
        metadata: sql`${playerTradeOffers.metadata} || ${JSON.stringify({ acceptedByCharacterId: buyer.id, gross: quote.gross, sellerFee: quote.sellerFee, sellerPayout: quote.sellerPayout })}::jsonb`,
      })
      .where(and(eq(playerTradeOffers.id, offer.id), eq(playerTradeOffers.status, 'open')))
      .returning();

    if (!updatedOffer) {
      return {
        ok: false as const,
        code: 'conflict',
        message: 'Trade offer changed before it could be accepted.',
      };
    }

    await tx.insert(financialTransactions).values([
      {
        characterId: buyer.id,
        type: 'shop',
        amount: String(-quote.buyerCost),
        description: `Bought ${quote.quantity}x ${offer.item.name} from ${offer.seller.name} by private trade.`,
        metadata: {
          tradeOfferId: offer.id,
          sellerCharacterId: offer.sellerCharacterId,
          itemKey: offer.itemKey,
          quantity: quote.quantity,
          priceEach: quote.priceEach,
        },
      },
      {
        characterId: offer.sellerCharacterId,
        type: 'shop',
        amount: String(quote.gross),
        description: `Sold ${quote.quantity}x ${offer.item.name} to ${buyer.name} by private trade.`,
        metadata: {
          tradeOfferId: offer.id,
          buyerCharacterId: buyer.id,
          itemKey: offer.itemKey,
          quantity: quote.quantity,
          priceEach: quote.priceEach,
          sellerFee: quote.sellerFee,
        },
      },
      {
        characterId: offer.sellerCharacterId,
        type: 'system',
        amount: String(-quote.sellerFee),
        description: `Private trade handling fee for ${quote.quantity}x ${offer.item.name}.`,
        metadata: {
          tradeOfferId: offer.id,
          itemKey: offer.itemKey,
          feeBasisPoints: PLAYER_TRADE_FEE_BASIS_POINTS,
        },
      },
    ]);

    await tx.insert(playerEvents).values([
      {
        userId: buyer.userId,
        characterId: buyer.id,
        type: 'player_trade_accepted',
        payload: {
          tradeOfferId: offer.id,
          sellerCharacterId: offer.sellerCharacterId,
          itemKey: offer.itemKey,
          quantity: quote.quantity,
          buyerCost: quote.buyerCost,
        },
      },
      {
        userId: offer.seller.userId,
        characterId: offer.sellerCharacterId,
        type: 'player_trade_completed',
        payload: {
          tradeOfferId: offer.id,
          buyerCharacterId: buyer.id,
          itemKey: offer.itemKey,
          quantity: quote.quantity,
          sellerPayout: quote.sellerPayout,
          sellerFee: quote.sellerFee,
        },
      },
    ]);

    const lock = await setActionCooldown({
      tx,
      characterId: buyer.id,
      actionType: 'trade_accept',
      cooldownSeconds: PLAYER_TRADE_COOLDOWN_SECONDS,
      metadata: { tradeOfferId: offer.id, itemKey: offer.itemKey, quantity: quote.quantity },
    });

    return {
      ok: true as const,
      data: {
        offer: normalizeTradeOffer({
          ...updatedOffer,
          seller: offer.seller,
          buyer,
          item: offer.item,
        }),
        buyer: cashDebit.character,
        seller: sellerFeeDebit.character,
        inventoryItem: buyerInventoryItem,
        lock,
      },
    };
  });
}

export async function cancelPlayerTradeOffer(input: {
  userId: string;
  characterId: string;
  tradeOfferId: string;
}) {
  return db.transaction(async (tx) => {
    const actor = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!actor) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const offer = await tx.query.playerTradeOffers.findFirst({
      where: and(
        eq(playerTradeOffers.id, input.tradeOfferId),
        eq(playerTradeOffers.status, 'open'),
        or(
          eq(playerTradeOffers.sellerCharacterId, actor.id),
          eq(playerTradeOffers.buyerCharacterId, actor.id),
        ),
      ),
      with: { seller: true, buyer: true, item: true },
    });

    if (!offer) {
      return { ok: false as const, code: 'not_found', message: 'Open trade offer not found.' };
    }

    const [updatedOffer] = await tx
      .update(playerTradeOffers)
      .set({
        status: 'cancelled',
        cancelledAt: sql`now()`,
        updatedAt: sql`now()`,
        metadata: sql`${playerTradeOffers.metadata} || ${JSON.stringify({ cancelledByCharacterId: actor.id })}::jsonb`,
      })
      .where(and(eq(playerTradeOffers.id, offer.id), eq(playerTradeOffers.status, 'open')))
      .returning();

    if (!updatedOffer) {
      return {
        ok: false as const,
        code: 'conflict',
        message: 'Trade offer changed before it could be cancelled.',
      };
    }

    await addInventoryQuantity(tx, {
      characterId: offer.sellerCharacterId,
      itemKey: offer.itemKey,
      quantity: offer.quantity,
    });

    const eventRows = [];

    if (offer.seller) {
      eventRows.push({
        userId: offer.seller.userId,
        characterId: offer.sellerCharacterId,
        type: 'player_trade_cancelled',
        payload: {
          tradeOfferId: offer.id,
          actorCharacterId: actor.id,
          itemKey: offer.itemKey,
          quantity: offer.quantity,
        },
      });
    }

    if (offer.buyer) {
      eventRows.push({
        userId: offer.buyer.userId,
        characterId: offer.buyerCharacterId,
        type: 'player_trade_cancelled',
        payload: {
          tradeOfferId: offer.id,
          actorCharacterId: actor.id,
          itemKey: offer.itemKey,
          quantity: offer.quantity,
        },
      });
    }

    if (eventRows.length > 0) {
      await tx.insert(playerEvents).values(eventRows);
    }

    return {
      ok: true as const,
      data: {
        offer: normalizeTradeOffer({
          ...updatedOffer,
          seller: offer.seller,
          buyer: offer.buyer,
          item: offer.item,
        }),
      },
    };
  });
}

export async function expireOpenPlayerTradeOffers(input: { now?: Date; limit?: number } = {}) {
  const now = input.now ?? new Date();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const dueOffers = await db.query.playerTradeOffers.findMany({
    where: and(eq(playerTradeOffers.status, 'open'), lte(playerTradeOffers.expiresAt, now)),
    with: { seller: true, buyer: true, item: true },
    orderBy: desc(playerTradeOffers.expiresAt),
    limit: safeLimit,
  });
  const expired = [];

  for (const offer of dueOffers) {
    const result = await db.transaction(async (tx) => {
      const [updatedOffer] = await tx
        .update(playerTradeOffers)
        .set({ status: 'expired', updatedAt: sql`now()` })
        .where(and(eq(playerTradeOffers.id, offer.id), eq(playerTradeOffers.status, 'open')))
        .returning();

      if (!updatedOffer) {
        return null;
      }

      await addInventoryQuantity(tx, {
        characterId: offer.sellerCharacterId,
        itemKey: offer.itemKey,
        quantity: offer.quantity,
      });

      if (offer.seller) {
        await tx.insert(playerEvents).values({
          userId: offer.seller.userId,
          characterId: offer.sellerCharacterId,
          type: 'player_trade_expired',
          payload: {
            tradeOfferId: offer.id,
            buyerCharacterId: offer.buyerCharacterId,
            itemKey: offer.itemKey,
            quantity: offer.quantity,
          },
        });
      }

      return normalizeTradeOffer(
        { ...updatedOffer, seller: offer.seller, buyer: offer.buyer, item: offer.item },
        now,
      );
    });

    if (result) {
      expired.push(result);
    }
  }

  return { scanned: dueOffers.length, expired };
}
