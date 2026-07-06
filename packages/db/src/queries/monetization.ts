import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '../client';
import { characterCosmetics, productCatalog, userEntitlements } from '../schema';

export type GrantUserEntitlementInput = {
  userId: string;
  entitlementKey: string;
  productKey?: string | null;
  source?: string;
  grantedByUserId?: string | null;
  endsAt?: Date | null;
  metadata?: Record<string, unknown>;
};

export async function listActiveProductCatalog() {
  return db.query.productCatalog.findMany({
    where: eq(productCatalog.isActive, true),
    orderBy: asc(productCatalog.priceCents),
  });
}

export async function listUserEntitlements(userId: string) {
  return db.query.userEntitlements.findMany({
    where: and(
      eq(userEntitlements.userId, userId),
      eq(userEntitlements.status, 'active'),
      or(isNull(userEntitlements.endsAt), sql`${userEntitlements.endsAt} > now()`),
    ),
    with: { product: true },
  });
}

export async function grantUserEntitlement(input: GrantUserEntitlementInput) {
  const existing = await db.query.userEntitlements.findFirst({
    where: and(eq(userEntitlements.userId, input.userId), eq(userEntitlements.entitlementKey, input.entitlementKey)),
  });

  if (existing) {
    const [entitlement] = await db
      .update(userEntitlements)
      .set({
        status: 'active',
        productKey: input.productKey ?? null,
        source: input.source ?? 'system',
        grantedByUserId: input.grantedByUserId ?? null,
        endsAt: input.endsAt ?? null,
        metadata: input.metadata ?? {},
        updatedAt: sql`now()`,
      })
      .where(eq(userEntitlements.id, existing.id))
      .returning();

    return entitlement;
  }

  const [entitlement] = await db
    .insert(userEntitlements)
    .values({
      userId: input.userId,
      productKey: input.productKey ?? null,
      entitlementKey: input.entitlementKey,
      source: input.source ?? 'system',
      grantedByUserId: input.grantedByUserId ?? null,
      endsAt: input.endsAt ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  return entitlement;
}

export async function revokeUserEntitlement(input: { userId: string; entitlementKey: string }) {
  const [entitlement] = await db
    .update(userEntitlements)
    .set({ status: 'revoked', updatedAt: sql`now()` })
    .where(and(eq(userEntitlements.userId, input.userId), eq(userEntitlements.entitlementKey, input.entitlementKey)))
    .returning();

  return entitlement ?? null;
}

export async function listCharacterCosmetics(characterId: string) {
  return db.query.characterCosmetics.findMany({
    where: eq(characterCosmetics.characterId, characterId),
    orderBy: asc(characterCosmetics.createdAt),
  });
}

export async function equipCharacterCosmetic(input: { characterId: string; cosmeticKey: string; slot: string }) {
  return db.transaction(async (tx) => {
    await tx
      .update(characterCosmetics)
      .set({ isEquipped: false, updatedAt: sql`now()` })
      .where(and(eq(characterCosmetics.characterId, input.characterId), eq(characterCosmetics.slot, input.slot)));

    const [cosmetic] = await tx
      .update(characterCosmetics)
      .set({ isEquipped: true, updatedAt: sql`now()` })
      .where(and(eq(characterCosmetics.characterId, input.characterId), eq(characterCosmetics.cosmeticKey, input.cosmeticKey)))
      .returning();

    return cosmetic ?? null;
  });
}
