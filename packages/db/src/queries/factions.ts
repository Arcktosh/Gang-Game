import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  canSetFactionRole,
  calculateFactionInventoryAction,
  calculateInventoryExposure,
  calculateTerritoryAction,
  canWithdrawFactionFunds,
  type FactionRole,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characters,
  factionInventoryItems,
  factionLedgerEntries,
  factionMembers,
  factions,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  playerEvents,
  territories,
  territoryActions,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';

type Tx = any;

type ActiveMembership = {
  factionId: string;
  characterId: string;
  role: FactionRole;
  status: string;
  contributionPoints: number;
};

type FactionDetail = {
  membership: typeof factionMembers.$inferSelect;
  faction: typeof factions.$inferSelect | null;
  armory: (typeof factionInventoryItems.$inferSelect & {
    item?: typeof itemDefinitions.$inferSelect | null;
    exposure: ReturnType<typeof calculateInventoryExposure>;
  })[];
  characterInventory: (typeof inventoryItems.$inferSelect & {
    item?: typeof itemDefinitions.$inferSelect | null;
  })[];
  members: (typeof factionMembers.$inferSelect)[];
  memberCharacters: Pick<
    typeof characters.$inferSelect,
    'id' | 'name' | 'level' | 'location' | 'status'
  >[];
  ledger: (typeof factionLedgerEntries.$inferSelect)[];
  controlledTerritories: (typeof territories.$inferSelect)[];
};

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  return tx.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.userId, userId)),
  });
}

async function getActiveMembership(
  tx: Tx,
  characterId: string,
): Promise<ActiveMembership | undefined> {
  return tx.query.factionMembers.findFirst({
    where: and(eq(factionMembers.characterId, characterId), eq(factionMembers.status, 'active')),
  }) as Promise<ActiveMembership | undefined>;
}

export async function listFactions() {
  const factionRows = await db.query.factions.findMany({ orderBy: desc(factions.reputation) });

  const withCounts = await Promise.all(
    factionRows.map(async (faction) => {
      const [memberCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(factionMembers)
        .where(and(eq(factionMembers.factionId, faction.id), eq(factionMembers.status, 'active')));

      return { ...faction, memberCount: memberCount?.count ?? 0 };
    }),
  );

  return withCounts;
}

export async function getFactionForCharacter(characterId: string): Promise<FactionDetail | null> {
  const membership = await db.query.factionMembers.findFirst({
    where: and(eq(factionMembers.characterId, characterId), eq(factionMembers.status, 'active')),
  });

  if (!membership) {
    return null;
  }

  const [faction, members, ledger, controlledTerritories, armoryRows, characterInventory] =
    await Promise.all([
      db.query.factions.findFirst({ where: eq(factions.id, membership.factionId) }),
      db.query.factionMembers.findMany({
        where: and(
          eq(factionMembers.factionId, membership.factionId),
          eq(factionMembers.status, 'active'),
        ),
      }),
      db.query.factionLedgerEntries.findMany({
        where: eq(factionLedgerEntries.factionId, membership.factionId),
        orderBy: desc(factionLedgerEntries.createdAt),
        limit: 10,
      }),
      db.query.territories.findMany({
        where: eq(territories.controlledByFactionId, membership.factionId),
      }),
      db.query.factionInventoryItems.findMany({
        where: eq(factionInventoryItems.factionId, membership.factionId),
        with: { item: true },
        orderBy: desc(factionInventoryItems.updatedAt),
        limit: 100,
      }),
      db.query.inventoryItems.findMany({
        where: eq(inventoryItems.characterId, characterId),
        with: { item: true },
        orderBy: desc(inventoryItems.updatedAt),
        limit: 100,
      }),
    ]);

  const memberCharacters =
    members.length > 0
      ? await db
          .select({
            id: characters.id,
            name: characters.name,
            level: characters.level,
            location: characters.location,
            status: characters.status,
          })
          .from(characters)
          .where(
            inArray(
              characters.id,
              members.map((member) => member.characterId),
            ),
          )
      : [];

  const armory = armoryRows.map((row) => ({
    ...row,
    exposure: calculateInventoryExposure({
      quantity: row.quantity,
      basePrice: row.item?.basePrice ?? 0,
      baseRisk: row.item?.baseRisk ?? 0,
      isIllegal: row.item?.isIllegal ?? false,
      rarity: row.item?.rarity ?? 'common',
    }),
  }));

  return {
    membership,
    faction: faction ?? null,
    members,
    memberCharacters,
    ledger,
    controlledTerritories,
    armory,
    characterInventory,
  };
}

export async function listTerritories() {
  return db.query.territories.findMany({ orderBy: desc(territories.controlScore) });
}

export async function transferFactionFunds(input: {
  userId: string;
  factionId: string;
  characterId: string;
  action: 'deposit' | 'withdraw';
  amount: number;
}) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const membership = await getActiveMembership(tx, character.id);

    if (!membership || membership.factionId !== input.factionId) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not an active member of this faction.',
      };
    }

    const faction = await tx.query.factions.findFirst({ where: eq(factions.id, input.factionId) });

    if (!faction) {
      return { ok: false as const, code: 'not_found', message: 'Faction not found.' };
    }

    const amount = Math.max(1, Math.floor(input.amount));

    if (input.action === 'deposit') {
      if (character.cash < amount) {
        return { ok: false as const, code: 'forbidden', message: 'Not enough cash to deposit.' };
      }

      const newBalance = faction.bank + amount;
      await tx
        .update(characters)
        .set({ cash: character.cash - amount, updatedAt: sql`now()` })
        .where(eq(characters.id, character.id));
      const [updatedFaction] = await tx
        .update(factions)
        .set({ bank: newBalance })
        .where(eq(factions.id, faction.id))
        .returning();
      await tx
        .insert(factionMembers)
        .values({ factionId: faction.id, characterId: character.id, contributionPoints: amount })
        .onConflictDoUpdate({
          target: [factionMembers.factionId, factionMembers.characterId],
          set: { contributionPoints: sql`${factionMembers.contributionPoints} + ${amount}` },
        });
      await tx
        .insert(factionLedgerEntries)
        .values({
          factionId: faction.id,
          characterId: character.id,
          entryType: 'deposit',
          amount,
          balanceAfter: newBalance,
          description: 'Faction bank deposit.',
        });
      await tx
        .insert(playerEvents)
        .values({
          userId: input.userId,
          characterId: character.id,
          visibility: 'faction',
          type: 'faction_deposit',
          payload: { factionId: faction.id, amount },
        });
      return { ok: true as const, faction: updatedFaction };
    }

    if (!canWithdrawFactionFunds(membership.role)) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Only underbosses and bosses can withdraw faction funds.',
      };
    }

    if (faction.bank < amount) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Faction bank does not have enough cash.',
      };
    }

    const newBalance = faction.bank - amount;
    await tx
      .update(characters)
      .set({ cash: character.cash + amount, updatedAt: sql`now()` })
      .where(eq(characters.id, character.id));
    const [updatedFaction] = await tx
      .update(factions)
      .set({ bank: newBalance })
      .where(eq(factions.id, faction.id))
      .returning();
    await tx
      .insert(factionLedgerEntries)
      .values({
        factionId: faction.id,
        characterId: character.id,
        entryType: 'withdraw',
        amount: -amount,
        balanceAfter: newBalance,
        description: 'Faction bank withdrawal.',
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: 'faction',
        type: 'faction_withdrawal',
        payload: { factionId: faction.id, amount },
      });
    return { ok: true as const, faction: updatedFaction };
  });
}

async function addCharacterInventoryQuantity(
  tx: Tx,
  input: {
    characterId: string;
    itemKey: string;
    quantity: number;
    metadata?: Record<string, unknown>;
  },
) {
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

async function addFactionInventoryQuantity(
  tx: Tx,
  input: {
    factionId: string;
    itemKey: string;
    quantity: number;
    metadata?: Record<string, unknown>;
  },
) {
  const quantity = Math.max(1, Math.floor(input.quantity));

  const [armoryItem] = await tx
    .insert(factionInventoryItems)
    .values({
      factionId: input.factionId,
      itemKey: input.itemKey,
      quantity,
      metadata: input.metadata ?? {},
    })
    .onConflictDoUpdate({
      target: [factionInventoryItems.factionId, factionInventoryItems.itemKey],
      set: {
        quantity: sql`${factionInventoryItems.quantity} + ${quantity}`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return armoryItem;
}

async function decrementFactionInventoryQuantity(
  tx: Tx,
  input: { factionInventoryItemId: string; quantity: number },
) {
  const quantity = Math.max(1, Math.floor(input.quantity));
  const [updated] = await tx
    .update(factionInventoryItems)
    .set({
      quantity: sql`${factionInventoryItems.quantity} - ${quantity}`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(factionInventoryItems.id, input.factionInventoryItemId),
        sql`${factionInventoryItems.quantity} >= ${quantity}`,
      ),
    )
    .returning();

  if (!updated) {
    return { ok: false as const };
  }

  if (updated.quantity <= 0) {
    await tx.delete(factionInventoryItems).where(eq(factionInventoryItems.id, updated.id));
  }

  return { ok: true as const, armoryItem: updated.quantity <= 0 ? null : updated };
}

export async function transferFactionInventory(input: {
  userId: string;
  factionId: string;
  characterId: string;
  action: 'deposit' | 'withdraw';
  inventoryItemId?: string;
  factionInventoryItemId?: string;
  quantity: number;
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
        message: 'Character is not available for faction armory actions.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'faction_inventory');

    if (!cooldown.ok) {
      return cooldown;
    }

    const membership = await getActiveMembership(tx, character.id);

    if (!membership || membership.factionId !== input.factionId) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not an active member of this faction.',
      };
    }

    const faction = await tx.query.factions.findFirst({ where: eq(factions.id, input.factionId) });

    if (!faction) {
      return { ok: false as const, code: 'not_found', message: 'Faction not found.' };
    }

    const quantity = Math.max(1, Math.floor(input.quantity));

    if (input.action === 'deposit') {
      if (!input.inventoryItemId) {
        return {
          ok: false as const,
          code: 'bad_request',
          message: 'Inventory item is required for armory deposits.',
        };
      }

      const inventoryItem = await tx.query.inventoryItems.findFirst({
        where: and(
          eq(inventoryItems.id, input.inventoryItemId),
          eq(inventoryItems.characterId, character.id),
        ),
        with: { item: true },
      });

      const action = calculateFactionInventoryAction({
        action: 'deposit',
        role: membership.role,
        quantity,
        availableQuantity: inventoryItem?.quantity ?? 0,
      });

      if (!inventoryItem || !inventoryItem.item || !action.canAttempt) {
        return {
          ok: false as const,
          code: 'forbidden',
          message: 'Not enough personal inventory is available for this armory deposit.',
        };
      }

      const [updatedInventoryItem] = await tx
        .update(inventoryItems)
        .set({
          quantity: sql`${inventoryItems.quantity} - ${action.quantity}`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(inventoryItems.id, inventoryItem.id),
            sql`${inventoryItems.quantity} >= ${action.quantity}`,
          ),
        )
        .returning();

      if (!updatedInventoryItem) {
        return {
          ok: false as const,
          code: 'conflict',
          message: 'Inventory changed before the armory deposit could be reserved.',
        };
      }

      if (updatedInventoryItem.quantity <= 0) {
        await tx.delete(inventoryItems).where(eq(inventoryItems.id, updatedInventoryItem.id));
      }

      const armoryItem = await addFactionInventoryQuantity(tx, {
        factionId: faction.id,
        itemKey: inventoryItem.itemKey,
        quantity: action.quantity,
        metadata: {
          depositedByCharacterId: character.id,
          depositedByCharacterName: character.name,
        },
      });

      await tx
        .update(factionMembers)
        .set({ contributionPoints: membership.contributionPoints + action.contributionPoints })
        .where(
          and(
            eq(factionMembers.factionId, faction.id),
            eq(factionMembers.characterId, character.id),
          ),
        );
      await tx
        .insert(factionLedgerEntries)
        .values({
          factionId: faction.id,
          characterId: character.id,
          entryType: 'armory_deposit',
          amount: 0,
          balanceAfter: faction.bank,
          description: `Deposited ${action.quantity} x ${inventoryItem.item.name} into the faction armory.`,
          metadata: { itemKey: inventoryItem.itemKey, quantity: action.quantity },
        });
      await tx
        .insert(playerEvents)
        .values({
          userId: input.userId,
          characterId: character.id,
          visibility: 'faction',
          type: 'faction_armory_deposit',
          payload: {
            factionId: faction.id,
            itemKey: inventoryItem.itemKey,
            itemName: inventoryItem.item.name,
            quantity: action.quantity,
          },
        });
      await setActionCooldown({
        tx,
        characterId: character.id,
        actionType: 'faction_inventory',
        cooldownSeconds: action.cooldownSeconds,
        metadata: { action: 'deposit', itemKey: inventoryItem.itemKey, quantity: action.quantity },
      });

      return {
        ok: true as const,
        data: {
          armoryItem,
          inventoryItem: updatedInventoryItem.quantity <= 0 ? null : updatedInventoryItem,
          quantity: action.quantity,
        },
      };
    }

    if (!input.factionInventoryItemId) {
      return {
        ok: false as const,
        code: 'bad_request',
        message: 'Faction inventory item is required for armory withdrawals.',
      };
    }

    const armoryItem = await tx.query.factionInventoryItems.findFirst({
      where: and(
        eq(factionInventoryItems.id, input.factionInventoryItemId),
        eq(factionInventoryItems.factionId, faction.id),
      ),
      with: { item: true },
    });

    const action = calculateFactionInventoryAction({
      action: 'withdraw',
      role: membership.role,
      quantity,
      availableQuantity: armoryItem?.quantity ?? 0,
    });

    if (!action.hasPermission) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Only lieutenants and above can withdraw from the faction armory.',
      };
    }

    if (!armoryItem || !armoryItem.item || !action.canAttempt) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Not enough faction armory stock is available for this withdrawal.',
      };
    }

    const armoryUpdate = await decrementFactionInventoryQuantity(tx, {
      factionInventoryItemId: armoryItem.id,
      quantity: action.quantity,
    });

    if (!armoryUpdate.ok) {
      return {
        ok: false as const,
        code: 'conflict',
        message: 'Faction armory stock changed before the withdrawal could be completed.',
      };
    }

    const inventoryItem = await addCharacterInventoryQuantity(tx, {
      characterId: character.id,
      itemKey: armoryItem.itemKey,
      quantity: action.quantity,
      metadata: { withdrawnFromFactionId: faction.id, withdrawnFromFactionName: faction.name },
    });

    await tx
      .insert(factionLedgerEntries)
      .values({
        factionId: faction.id,
        characterId: character.id,
        entryType: 'armory_withdrawal',
        amount: 0,
        balanceAfter: faction.bank,
        description: `Withdrew ${action.quantity} x ${armoryItem.item.name} from the faction armory.`,
        metadata: { itemKey: armoryItem.itemKey, quantity: action.quantity },
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: 'faction',
        type: 'faction_armory_withdrawal',
        payload: {
          factionId: faction.id,
          itemKey: armoryItem.itemKey,
          itemName: armoryItem.item.name,
          quantity: action.quantity,
        },
      });
    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'faction_inventory',
      cooldownSeconds: action.cooldownSeconds,
      metadata: { action: 'withdraw', itemKey: armoryItem.itemKey, quantity: action.quantity },
    });

    return {
      ok: true as const,
      data: { armoryItem: armoryUpdate.armoryItem, inventoryItem, quantity: action.quantity },
    };
  });
}

export async function setFactionMemberRole(input: {
  userId: string;
  factionId: string;
  characterId: string;
  memberCharacterId: string;
  role: FactionRole;
}) {
  return db.transaction(async (tx) => {
    const actor = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!actor) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const actorMembership = await getActiveMembership(tx, actor.id);

    if (!actorMembership || actorMembership.factionId !== input.factionId) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not an active member of this faction.',
      };
    }

    if (!canSetFactionRole(actorMembership.role, input.role)) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Only the boss can assign non-boss roles.',
      };
    }

    const member = await tx.query.factionMembers.findFirst({
      where: and(
        eq(factionMembers.factionId, input.factionId),
        eq(factionMembers.characterId, input.memberCharacterId),
      ),
    });

    if (!member || member.status !== 'active') {
      return { ok: false as const, code: 'not_found', message: 'Faction member not found.' };
    }

    const [updatedMembership] = await tx
      .update(factionMembers)
      .set({ role: input.role })
      .where(
        and(
          eq(factionMembers.factionId, input.factionId),
          eq(factionMembers.characterId, input.memberCharacterId),
        ),
      )
      .returning();

    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: actor.id,
        visibility: 'faction',
        type: 'faction_role_changed',
        payload: {
          factionId: input.factionId,
          memberCharacterId: input.memberCharacterId,
          role: input.role,
        },
      });
    return { ok: true as const, membership: updatedMembership };
  });
}

export async function leaveFaction(input: {
  userId: string;
  factionId: string;
  characterId: string;
}) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const membership = await getActiveMembership(tx, character.id);

    if (!membership || membership.factionId !== input.factionId) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not an active member of this faction.',
      };
    }

    if (membership.role === 'boss') {
      const [otherBoss] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(factionMembers)
        .where(
          and(
            eq(factionMembers.factionId, input.factionId),
            eq(factionMembers.role, 'boss'),
            eq(factionMembers.status, 'active'),
          ),
        );
      if ((otherBoss?.count ?? 0) <= 1) {
        return {
          ok: false as const,
          code: 'forbidden',
          message:
            'The last boss cannot leave. Promote another boss first in a later feature pass.',
        };
      }
    }

    await tx
      .update(factionMembers)
      .set({ status: 'left' })
      .where(
        and(
          eq(factionMembers.factionId, input.factionId),
          eq(factionMembers.characterId, character.id),
        ),
      );
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: 'faction',
        type: 'faction_left',
        payload: { factionId: input.factionId },
      });
    return { ok: true as const };
  });
}

export async function performTerritoryAction(input: {
  userId: string;
  characterId: string;
  territoryKey: string;
  action: 'scout' | 'claim' | 'reinforce' | 'attack';
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
        message: 'Character is not available for faction actions.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'faction_action');

    if (!cooldown.ok) {
      return cooldown;
    }

    const membership = await getActiveMembership(tx, character.id);

    if (!membership) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Join a faction before taking territory actions.',
      };
    }

    const territory = await tx.query.territories.findFirst({
      where: eq(territories.key, input.territoryKey),
    });

    if (!territory) {
      return { ok: false as const, code: 'not_found', message: 'Territory not found.' };
    }

    const controlledByOwnFaction = territory.controlledByFactionId === membership.factionId;
    const isUncontrolled = !territory.controlledByFactionId;
    const result = calculateTerritoryAction({
      action: input.action,
      strength: character.strength,
      defense: character.defense,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      cash: character.cash,
      territoryDefense: territory.defenseRating,
      controlledByOwnFaction,
      isUncontrolled,
    });

    if (!result.canAttempt) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Territory action requirements are not met.',
      };
    }

    let nextControlledByFactionId = territory.controlledByFactionId;
    let nextControlScore = territory.controlScore;
    let outcome = 'completed';

    if (input.action === 'scout') {
      outcome = 'scouted';
    } else if (input.action === 'claim') {
      nextControlledByFactionId = membership.factionId;
      nextControlScore = Math.max(10, territory.controlScore + result.scoreDelta);
      outcome = 'claimed';
    } else if (input.action === 'reinforce') {
      nextControlScore = Math.min(100, territory.controlScore + result.scoreDelta);
      outcome = 'reinforced';
    } else if (input.action === 'attack') {
      const reducedScore = territory.controlScore + result.scoreDelta;
      if (reducedScore <= 0) {
        nextControlledByFactionId = membership.factionId;
        nextControlScore = Math.min(25, Math.max(10, result.power));
        outcome = 'captured';
      } else {
        nextControlScore = reducedScore;
        outcome = 'weakened';
      }
    }

    await tx
      .update(characters)
      .set({ cash: character.cash - result.cashCost, updatedAt: sql`now()` })
      .where(eq(characters.id, character.id));
    const [updatedTerritory] = await tx
      .update(territories)
      .set({
        controlledByFactionId: nextControlledByFactionId,
        controlScore: nextControlScore,
        contestedUntil:
          input.action === 'attack'
            ? new Date(Date.now() + 60 * 60 * 1000)
            : territory.contestedUntil,
        updatedAt: sql`now()`,
      })
      .where(eq(territories.key, territory.key))
      .returning();

    await tx
      .insert(territoryActions)
      .values({
        territoryKey: territory.key,
        factionId: membership.factionId,
        characterId: character.id,
        actionType: input.action,
        power: result.power,
        cashCost: result.cashCost,
        outcome,
        metadata: { scoreDelta: result.scoreDelta },
      });
    await tx
      .update(factionMembers)
      .set({ contributionPoints: membership.contributionPoints + result.power })
      .where(
        and(
          eq(factionMembers.factionId, membership.factionId),
          eq(factionMembers.characterId, character.id),
        ),
      );
    await tx
      .update(factions)
      .set({
        power: sql`${factions.power} + ${result.power}`,
        reputation: sql`${factions.reputation} + 1`,
      })
      .where(eq(factions.id, membership.factionId));
    await tx
      .insert(financialTransactions)
      .values({
        characterId: character.id,
        type: 'system',
        amount: `-${result.cashCost}.00`,
        description: `Territory ${input.action}: ${territory.name}`,
        metadata: { territoryKey: territory.key },
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: 'public',
        type: `territory_${outcome}`,
        payload: {
          territoryKey: territory.key,
          factionId: membership.factionId,
          action: input.action,
          power: result.power,
          controlScore: nextControlScore,
        },
      });
    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'faction_action',
      cooldownSeconds: result.cooldownSeconds,
      metadata: { territoryKey: territory.key, action: input.action },
    });

    return { ok: true as const, territory: updatedTerritory, outcome, power: result.power };
  });
}

export async function payTerritoryIncomeTick() {
  return db.transaction(async (tx) => {
    const controlled = await tx.query.territories.findMany({
      where: sql`${territories.controlledByFactionId} is not null`,
    });
    let paid = 0;

    for (const territory of controlled) {
      if (!territory.controlledByFactionId || territory.incomePerTick <= 0) {
        continue;
      }

      const faction = await tx.query.factions.findFirst({
        where: eq(factions.id, territory.controlledByFactionId),
      });
      if (!faction) {
        continue;
      }

      const nextBalance = faction.bank + territory.incomePerTick;
      await tx.update(factions).set({ bank: nextBalance }).where(eq(factions.id, faction.id));
      await tx
        .insert(factionLedgerEntries)
        .values({
          factionId: faction.id,
          entryType: 'territory_income',
          amount: territory.incomePerTick,
          balanceAfter: nextBalance,
          description: `Income from ${territory.name}.`,
          metadata: { territoryKey: territory.key },
        });
      paid += 1;
    }

    return { paid };
  });
}
