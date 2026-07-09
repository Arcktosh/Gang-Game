import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { calculateShopListingLimit, calculateShopSale } from '@drugdeal/game';
import { db } from '../client';
import {
  characters,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  newspaperArticles,
  playerEvents,
  shopAdCampaigns,
  shopLedgerEntries,
  shopListings,
  shopReviews,
  shops,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import {
  cancelActiveShopListing,
  decrementCharacterCash,
  decrementInventoryQuantity,
  incrementCharacterCash,
  reserveShopListingQuantity,
} from './transaction-safety';

type Tx = any;

const SHOP_ACTION_COOLDOWN_SECONDS = 5;
const SHOP_CREATE_COST = 250;
const LISTING_FEE = 5;

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  return tx.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.userId, userId)),
  });
}

export async function listShops(
  location?: string | null,
  pagination?: { limit?: number; offset?: number },
) {
  const limit = Math.min(Math.max(pagination?.limit ?? 25, 1), 50);
  const offset = Math.min(Math.max(pagination?.offset ?? 0, 0), 5_000);
  const shopRows = await db.query.shops.findMany({
    where: location
      ? and(eq(shops.location, location), eq(shops.isOpen, true))
      : eq(shops.isOpen, true),
    orderBy: [
      desc(sql`case when ${shops.advertisingUntil} > now() then 1 else 0 end`),
      desc(shops.reputation),
      asc(shops.name),
    ],
    limit,
    offset,
  });

  return Promise.all(
    shopRows.map(async (shop) => {
      const [listingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(shopListings)
        .where(and(eq(shopListings.shopId, shop.id), eq(shopListings.status, 'active')));
      const averageRating =
        shop.ratingCount > 0 ? Number((shop.ratingTotal / shop.ratingCount).toFixed(1)) : null;
      const isAdvertising = Boolean(
        shop.advertisingUntil && new Date(shop.advertisingUntil) > new Date(),
      );
      return {
        ...shop,
        activeListingCount: listingCount?.count ?? 0,
        averageRating,
        isAdvertising,
      };
    }),
  );
}

export async function getShopWithListings(shopId: string) {
  const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) });

  if (!shop) {
    return null;
  }

  const listings = await db
    .select({
      id: shopListings.id,
      shopId: shopListings.shopId,
      itemKey: shopListings.itemKey,
      quantity: shopListings.quantity,
      soldQuantity: shopListings.soldQuantity,
      priceEach: shopListings.priceEach,
      status: shopListings.status,
      createdAt: shopListings.createdAt,
      itemName: itemDefinitions.name,
      itemCategory: itemDefinitions.category,
      itemDescription: itemDefinitions.description,
      isIllegal: itemDefinitions.isIllegal,
    })
    .from(shopListings)
    .innerJoin(itemDefinitions, eq(shopListings.itemKey, itemDefinitions.key))
    .where(and(eq(shopListings.shopId, shopId), eq(shopListings.status, 'active')))
    .orderBy(desc(shopListings.createdAt));

  const [ledger, reviews, activeAds] = await Promise.all([
    db.query.shopLedgerEntries.findMany({
      where: eq(shopLedgerEntries.shopId, shopId),
      orderBy: desc(shopLedgerEntries.createdAt),
      limit: 10,
    }),
    db.query.shopReviews.findMany({
      where: eq(shopReviews.shopId, shopId),
      orderBy: desc(shopReviews.createdAt),
      limit: 10,
      with: { reviewer: true },
    }),
    db.query.shopAdCampaigns.findMany({
      where: and(eq(shopAdCampaigns.shopId, shopId), sql`${shopAdCampaigns.endsAt} > now()`),
      orderBy: desc(shopAdCampaigns.endsAt),
      limit: 3,
    }),
  ]);

  const averageRating =
    shop.ratingCount > 0 ? Number((shop.ratingTotal / shop.ratingCount).toFixed(1)) : null;

  return {
    shop: {
      ...shop,
      averageRating,
      isAdvertising: Boolean(shop.advertisingUntil && new Date(shop.advertisingUntil) > new Date()),
    },
    listings,
    ledger,
    reviews,
    activeAds,
  };
}

export async function listShopsForCharacter(characterId: string) {
  const ownedShops = await db.query.shops.findMany({
    where: eq(shops.ownerCharacterId, characterId),
    orderBy: desc(shops.createdAt),
  });

  const details = await Promise.all(ownedShops.map((shop) => getShopWithListings(shop.id)));
  return details.filter((detail): detail is NonNullable<typeof detail> => detail !== null);
}

export async function createShop(input: {
  userId: string;
  characterId: string;
  name: string;
  description?: string;
}) {
  return db.transaction(async (tx) => {
    const characterRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to open a shop.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'shop_create');

    if (!cooldown.ok) {
      return cooldown;
    }

    if (character.cash < SHOP_CREATE_COST) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: `Opening a shop costs $${SHOP_CREATE_COST}.`,
      };
    }

    const [shop] = await tx
      .insert(shops)
      .values({
        ownerCharacterId: character.id,
        name: input.name,
        description: input.description ?? '',
        location: character.location,
      })
      .returning();

    await tx
      .update(characters)
      .set({ cash: character.cash - SHOP_CREATE_COST, updatedAt: sql`now()` })
      .where(eq(characters.id, character.id));

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'shop',
      amount: String(-SHOP_CREATE_COST),
      description: `Opened shop ${shop.name}.`,
      metadata: { shopId: shop.id },
    });

    await tx
      .insert(shopLedgerEntries)
      .values({
        shopId: shop.id,
        sellerCharacterId: character.id,
        entryType: 'open',
        amount: -SHOP_CREATE_COST,
        balanceAfter: 0,
        description: `Opened ${shop.name}.`,
      });

    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: 'public',
        type: 'shop_opened',
        payload: { shopId: shop.id, name: shop.name, location: shop.location },
      });

    await tx.insert(newspaperArticles).values({
      authorCharacterId: character.id,
      location: character.location,
      category: 'business',
      title: `${shop.name} opens in ${character.location}`,
      slug: `shop-${shop.id}`,
      excerpt: `${character.name} opened a new player-run shop.`,
      body: `${shop.name} has opened its doors in ${character.location}. Traders expect more private listings as the local economy grows.`,
      metadata: { shopId: shop.id, eventType: 'shop_opened' },
    });

    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'shop_create',
      cooldownSeconds: 60,
      metadata: { shopId: shop.id },
    });

    return { ok: true as const, shop };
  });
}

export async function createShopListing(input: {
  userId: string;
  characterId: string;
  shopId: string;
  itemKey: string;
  quantity: number;
  priceEach: number;
}) {
  return db.transaction(async (tx) => {
    const quantity = Math.max(1, Math.floor(input.quantity));
    const priceEach = Math.max(1, Math.floor(input.priceEach));
    const characterRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to list shop items.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'shop_list');

    if (!cooldown.ok) {
      return cooldown;
    }

    const [shop, item, inventoryItem] = await Promise.all([
      tx.query.shops.findFirst({
        where: and(
          eq(shops.id, input.shopId),
          eq(shops.ownerCharacterId, character.id),
          eq(shops.isOpen, true),
        ),
      }),
      tx.query.itemDefinitions.findFirst({ where: eq(itemDefinitions.key, input.itemKey) }),
      tx.query.inventoryItems.findFirst({
        where: and(
          eq(inventoryItems.characterId, character.id),
          eq(inventoryItems.itemKey, input.itemKey),
        ),
      }),
    ]);

    if (!shop) {
      return { ok: false as const, code: 'not_found', message: 'Shop not found.' };
    }

    if (!item) {
      return { ok: false as const, code: 'not_found', message: 'Item not found.' };
    }

    if (!inventoryItem || inventoryItem.quantity < quantity) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough inventory to list.' };
    }

    const [activeListingCount] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(shopListings)
      .where(and(eq(shopListings.shopId, shop.id), eq(shopListings.status, 'active')));

    if ((activeListingCount?.count ?? 0) >= calculateShopListingLimit(shop.reputation)) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Shop listing limit reached. Increase reputation to unlock more listings.',
      };
    }

    if (character.cash < LISTING_FEE) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: `Listing items costs $${LISTING_FEE}.`,
      };
    }

    const inventoryDebit = await decrementInventoryQuantity(tx, inventoryItem.id, quantity);

    if (!inventoryDebit.ok) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough inventory to list.' };
    }

    const cashDebit = await decrementCharacterCash(tx, character.id, LISTING_FEE);

    if (!cashDebit.ok) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: `Listing items costs ${LISTING_FEE}.`,
      };
    }

    const [listing] = await tx
      .insert(shopListings)
      .values({ shopId: shop.id, itemKey: item.key, quantity, priceEach })
      .returning();

    await tx
      .insert(shopLedgerEntries)
      .values({
        shopId: shop.id,
        sellerCharacterId: character.id,
        listingId: listing.id,
        entryType: 'listing_created',
        itemKey: item.key,
        quantity,
        amount: -LISTING_FEE,
        balanceAfter: 0,
        description: `Listed ${quantity}x ${item.name} at $${priceEach} each.`,
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        type: 'shop_listing_created',
        payload: { shopId: shop.id, listingId: listing.id, itemKey: item.key, quantity, priceEach },
      });

    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'shop_list',
      cooldownSeconds: SHOP_ACTION_COOLDOWN_SECONDS,
      metadata: { shopId: shop.id, listingId: listing.id },
    });

    return { ok: true as const, listing };
  });
}

export async function purchaseShopListing(input: {
  userId: string;
  characterId: string;
  listingId: string;
  quantity: number;
}) {
  return db.transaction(async (tx) => {
    const quantity = Math.max(1, Math.floor(input.quantity));
    const buyerRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!buyerRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const buyer = await refreshCharacterResources(tx, buyerRow);

    if (buyer.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to buy from shops.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, buyer.id, 'shop_purchase');

    if (!cooldown.ok) {
      return cooldown;
    }

    const listing = await tx.query.shopListings.findFirst({
      where: and(eq(shopListings.id, input.listingId), eq(shopListings.status, 'active')),
    });

    if (!listing) {
      return { ok: false as const, code: 'not_found', message: 'Listing not found.' };
    }

    const shop = await tx.query.shops.findFirst({
      where: and(eq(shops.id, listing.shopId), eq(shops.isOpen, true)),
    });

    if (!shop) {
      return { ok: false as const, code: 'not_found', message: 'Shop not found.' };
    }

    if (shop.ownerCharacterId === buyer.id) {
      return { ok: false as const, code: 'forbidden', message: 'You cannot buy your own listing.' };
    }

    const remaining = listing.quantity - listing.soldQuantity;

    if (remaining < quantity) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough quantity remaining.' };
    }

    const item = await tx.query.itemDefinitions.findFirst({
      where: eq(itemDefinitions.key, listing.itemKey),
    });

    if (!item) {
      return { ok: false as const, code: 'not_found', message: 'Item not found.' };
    }

    const sale = calculateShopSale({
      quantity,
      priceEach: listing.priceEach,
      sellerReputation: shop.reputation,
    });

    if (buyer.cash < sale.gross) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
    }

    const seller = await tx.query.characters.findFirst({
      where: eq(characters.id, shop.ownerCharacterId),
    });

    if (!seller) {
      return { ok: false as const, code: 'not_found', message: 'Seller not found.' };
    }

    const listingReserve = await reserveShopListingQuantity(tx, listing.id, quantity);

    if (!listingReserve.ok) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough quantity remaining.' };
    }

    const buyerDebit = await decrementCharacterCash(tx, buyer.id, sale.gross);

    if (!buyerDebit.ok) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
    }

    const sellerCredit = await incrementCharacterCash(tx, seller.id, sale.sellerPayout);

    if (!sellerCredit.ok || !sellerCredit.character) {
      return { ok: false as const, code: 'not_found', message: 'Seller not found.' };
    }

    const updatedSeller = sellerCredit.character;
    const [updatedShop] = await tx
      .update(shops)
      .set({ reputation: shop.reputation + Math.max(1, quantity), updatedAt: sql`now()` })
      .where(eq(shops.id, shop.id))
      .returning();

    await tx
      .insert(inventoryItems)
      .values({ characterId: buyer.id, itemKey: item.key, quantity })
      .onConflictDoUpdate({
        target: [inventoryItems.characterId, inventoryItems.itemKey],
        set: { quantity: sql`${inventoryItems.quantity} + ${quantity}`, updatedAt: sql`now()` },
      });

    await tx
      .insert(shopLedgerEntries)
      .values({
        shopId: shop.id,
        sellerCharacterId: seller.id,
        buyerCharacterId: buyer.id,
        listingId: listing.id,
        entryType: 'sale',
        itemKey: item.key,
        quantity,
        amount: sale.sellerPayout,
        balanceAfter: updatedSeller.cash,
        description: `Sold ${quantity}x ${item.name} to ${buyer.name}.`,
        metadata: sale,
      });
    await tx.insert(financialTransactions).values([
      {
        characterId: buyer.id,
        type: 'shop',
        amount: String(-sale.gross),
        description: `Bought ${quantity}x ${item.name} from ${shop.name}.`,
        metadata: { shopId: shop.id, listingId: listing.id },
      },
      {
        characterId: seller.id,
        type: 'shop',
        amount: String(sale.sellerPayout),
        description: `Shop sale from ${shop.name}.`,
        metadata: {
          shopId: shop.id,
          listingId: listing.id,
          gross: sale.gross,
          fee: sale.platformFee,
        },
      },
    ]);
    await tx.insert(playerEvents).values([
      {
        userId: input.userId,
        characterId: buyer.id,
        type: 'shop_item_bought',
        payload: {
          shopId: shop.id,
          listingId: listing.id,
          itemKey: item.key,
          quantity,
          gross: sale.gross,
        },
      },
      {
        userId: seller.userId,
        characterId: seller.id,
        type: 'shop_item_sold',
        payload: {
          shopId: shop.id,
          listingId: listing.id,
          itemKey: item.key,
          quantity,
          payout: sale.sellerPayout,
        },
      },
    ]);

    if (sale.gross >= 500) {
      await tx.insert(newspaperArticles).values({
        authorCharacterId: buyer.id,
        location: shop.location,
        category: 'market',
        title: `Large sale reported at ${shop.name}`,
        slug: `shop-sale-${listing.id}-${Date.now().toString(36)}`,
        excerpt: `${quantity}x ${item.name} changed hands for $${sale.gross}.`,
        body: `A notable private sale was completed at ${shop.name}. The transaction moved ${quantity}x ${item.name} for $${sale.gross}, signalling stronger player-to-player trade in ${shop.location}.`,
        metadata: { shopId: shop.id, listingId: listing.id, itemKey: item.key, gross: sale.gross },
      });
    }

    await setActionCooldown({
      tx,
      characterId: buyer.id,
      actionType: 'shop_purchase',
      cooldownSeconds: SHOP_ACTION_COOLDOWN_SECONDS,
      metadata: { shopId: shop.id, listingId: listing.id },
    });

    return { ok: true as const, data: { shop: updatedShop, seller: updatedSeller, sale } };
  });
}

export async function listActiveShopListings(location?: string | null) {
  return db
    .select({
      listingId: shopListings.id,
      shopId: shops.id,
      shopName: shops.name,
      ownerCharacterId: shops.ownerCharacterId,
      itemKey: shopListings.itemKey,
      itemName: itemDefinitions.name,
      itemCategory: itemDefinitions.category,
      quantity: shopListings.quantity,
      soldQuantity: shopListings.soldQuantity,
      priceEach: shopListings.priceEach,
      reputation: shops.reputation,
      location: shops.location,
      createdAt: shopListings.createdAt,
    })
    .from(shopListings)
    .innerJoin(shops, eq(shopListings.shopId, shops.id))
    .innerJoin(itemDefinitions, eq(shopListings.itemKey, itemDefinitions.key))
    .where(
      location
        ? and(
            eq(shopListings.status, 'active'),
            eq(shops.isOpen, true),
            eq(shops.location, location),
            ne(shopListings.quantity, shopListings.soldQuantity),
          )
        : and(
            eq(shopListings.status, 'active'),
            eq(shops.isOpen, true),
            ne(shopListings.quantity, shopListings.soldQuantity),
          ),
    )
    .orderBy(desc(shopListings.createdAt));
}

export async function updateShopStatus(input: {
  userId: string;
  characterId: string;
  shopId: string;
  isOpen: boolean;
}) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const shop = await tx.query.shops.findFirst({
      where: and(eq(shops.id, input.shopId), eq(shops.ownerCharacterId, character.id)),
    });

    if (!shop) {
      return { ok: false as const, code: 'not_found', message: 'Shop not found.' };
    }

    const [updatedShop] = await tx
      .update(shops)
      .set({ isOpen: input.isOpen, updatedAt: sql`now()` })
      .where(eq(shops.id, shop.id))
      .returning();

    await tx.insert(shopLedgerEntries).values({
      shopId: shop.id,
      sellerCharacterId: character.id,
      entryType: input.isOpen ? 'reopened' : 'closed',
      description: input.isOpen ? `${shop.name} reopened.` : `${shop.name} closed temporarily.`,
    });

    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        type: 'shop_status_updated',
        payload: { shopId: shop.id, isOpen: input.isOpen },
      });

    return { ok: true as const, shop: updatedShop };
  });
}

export async function cancelShopListing(input: {
  userId: string;
  characterId: string;
  listingId: string;
}) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const listing = await tx.query.shopListings.findFirst({
      where: and(eq(shopListings.id, input.listingId), eq(shopListings.status, 'active')),
    });

    if (!listing) {
      return { ok: false as const, code: 'not_found', message: 'Listing not found.' };
    }

    const shop = await tx.query.shops.findFirst({
      where: and(eq(shops.id, listing.shopId), eq(shops.ownerCharacterId, character.id)),
    });

    if (!shop) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Only the shop owner can cancel this listing.',
      };
    }

    const remaining = Math.max(0, listing.quantity - listing.soldQuantity);
    const item = await tx.query.itemDefinitions.findFirst({
      where: eq(itemDefinitions.key, listing.itemKey),
    });

    const cancelledListing = await cancelActiveShopListing(tx, listing.id);

    if (!cancelledListing.ok) {
      return { ok: false as const, code: 'forbidden', message: 'Listing is no longer active.' };
    }

    if (remaining > 0) {
      await tx
        .insert(inventoryItems)
        .values({ characterId: character.id, itemKey: listing.itemKey, quantity: remaining })
        .onConflictDoUpdate({
          target: [inventoryItems.characterId, inventoryItems.itemKey],
          set: { quantity: sql`${inventoryItems.quantity} + ${remaining}`, updatedAt: sql`now()` },
        });
    }

    await tx.insert(shopLedgerEntries).values({
      shopId: shop.id,
      sellerCharacterId: character.id,
      listingId: listing.id,
      entryType: 'listing_cancelled',
      itemKey: listing.itemKey,
      quantity: remaining,
      description: `Cancelled listing and returned ${remaining}x ${item?.name ?? listing.itemKey}.`,
    });

    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        type: 'shop_listing_cancelled',
        payload: {
          shopId: shop.id,
          listingId: listing.id,
          itemKey: listing.itemKey,
          returnedQuantity: remaining,
        },
      });

    return { ok: true as const, returnedQuantity: remaining };
  });
}

export async function buyShopAdvertisement(input: {
  userId: string;
  characterId: string;
  shopId: string;
  spend: number;
}) {
  return db.transaction(async (tx) => {
    const spend = Math.max(25, Math.min(25_000, Math.floor(input.spend)));
    const characterRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);
    const shop = await tx.query.shops.findFirst({
      where: and(eq(shops.id, input.shopId), eq(shops.ownerCharacterId, character.id)),
    });

    if (!shop) {
      return { ok: false as const, code: 'not_found', message: 'Shop not found.' };
    }

    if (character.cash < spend) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Not enough cash for the ad campaign.',
      };
    }

    const cashDebit = await decrementCharacterCash(tx, character.id, spend);

    if (!cashDebit.ok) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Not enough cash for the ad campaign.',
      };
    }

    const hours = Math.max(1, Math.min(72, Math.floor(spend / 25)));
    const [campaign] = await tx
      .insert(shopAdCampaigns)
      .values({
        shopId: shop.id,
        characterId: character.id,
        spend,
        endsAt: sql`now() + (${hours} || ' hours')::interval`,
        metadata: { hours },
      })
      .returning();

    const [updatedShop] = await tx
      .update(shops)
      .set({ advertisingUntil: campaign.endsAt, updatedAt: sql`now()` })
      .where(eq(shops.id, shop.id))
      .returning();

    await tx
      .insert(financialTransactions)
      .values({
        characterId: character.id,
        type: 'shop',
        amount: String(-spend),
        description: `Advertising campaign for ${shop.name}.`,
        metadata: { shopId: shop.id, campaignId: campaign.id, hours },
      });
    await tx
      .insert(shopLedgerEntries)
      .values({
        shopId: shop.id,
        sellerCharacterId: character.id,
        entryType: 'advertisement',
        amount: -spend,
        description: `Bought ${hours}h of shop advertising.`,
        metadata: { campaignId: campaign.id, hours },
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: 'public',
        type: 'shop_advertised',
        payload: { shopId: shop.id, spend, hours },
      });

    return { ok: true as const, shop: updatedShop, campaign };
  });
}

export async function reviewShop(input: {
  userId: string;
  characterId: string;
  shopId: string;
  rating: number;
  body?: string;
}) {
  return db.transaction(async (tx) => {
    const rating = Math.max(1, Math.min(5, Math.floor(input.rating)));
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const shop = await tx.query.shops.findFirst({ where: eq(shops.id, input.shopId) });

    if (!shop || !shop.isOpen) {
      return { ok: false as const, code: 'not_found', message: 'Shop not found.' };
    }

    if (shop.ownerCharacterId === character.id) {
      return { ok: false as const, code: 'forbidden', message: 'You cannot review your own shop.' };
    }

    const existing = await tx.query.shopReviews.findFirst({
      where: and(
        eq(shopReviews.shopId, shop.id),
        eq(shopReviews.reviewerCharacterId, character.id),
      ),
    });

    if (existing) {
      const ratingDelta = rating - existing.rating;
      const [review] = await tx
        .update(shopReviews)
        .set({ rating, body: input.body ?? '', updatedAt: sql`now()` })
        .where(eq(shopReviews.id, existing.id))
        .returning();
      await tx
        .update(shops)
        .set({ ratingTotal: shop.ratingTotal + ratingDelta, updatedAt: sql`now()` })
        .where(eq(shops.id, shop.id));
      return { ok: true as const, review };
    }

    const [review] = await tx
      .insert(shopReviews)
      .values({
        shopId: shop.id,
        reviewerCharacterId: character.id,
        rating,
        body: input.body ?? '',
      })
      .returning();
    await tx
      .update(shops)
      .set({
        ratingTotal: shop.ratingTotal + rating,
        ratingCount: shop.ratingCount + 1,
        reputation: shop.reputation + rating,
        updatedAt: sql`now()`,
      })
      .where(eq(shops.id, shop.id));
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        type: 'shop_reviewed',
        payload: { shopId: shop.id, rating },
      });

    return { ok: true as const, review };
  });
}
