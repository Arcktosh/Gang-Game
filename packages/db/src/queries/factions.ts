import { and, desc, eq, sql } from 'drizzle-orm';
import { canSetFactionRole, calculateTerritoryAction, canWithdrawFactionFunds, type FactionRole } from '@drugdeal/game';
import { db } from '../client';
import {
  characters,
  factionLedgerEntries,
  factionMembers,
  factions,
  financialTransactions,
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
  members: (typeof factionMembers.$inferSelect)[];
  ledger: (typeof factionLedgerEntries.$inferSelect)[];
  controlledTerritories: (typeof territories.$inferSelect)[];
};

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  return tx.query.characters.findFirst({ where: and(eq(characters.id, characterId), eq(characters.userId, userId)) });
}

async function getActiveMembership(tx: Tx, characterId: string): Promise<ActiveMembership | undefined> {
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

  const [faction, members, ledger, controlledTerritories] = await Promise.all([
    db.query.factions.findFirst({ where: eq(factions.id, membership.factionId) }),
    db.query.factionMembers.findMany({ where: and(eq(factionMembers.factionId, membership.factionId), eq(factionMembers.status, 'active')) }),
    db.query.factionLedgerEntries.findMany({ where: eq(factionLedgerEntries.factionId, membership.factionId), orderBy: desc(factionLedgerEntries.createdAt), limit: 10 }),
    db.query.territories.findMany({ where: eq(territories.controlledByFactionId, membership.factionId) }),
  ]);

  return { membership, faction: faction ?? null, members, ledger, controlledTerritories };
}

export async function listTerritories() {
  return db.query.territories.findMany({ orderBy: desc(territories.controlScore) });
}

export async function transferFactionFunds(input: { userId: string; factionId: string; characterId: string; action: 'deposit' | 'withdraw'; amount: number }) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const membership = await getActiveMembership(tx, character.id);

    if (!membership || membership.factionId !== input.factionId) {
      return { ok: false as const, code: 'forbidden', message: 'Character is not an active member of this faction.' };
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
      await tx.update(characters).set({ cash: character.cash - amount, updatedAt: sql`now()` }).where(eq(characters.id, character.id));
      const [updatedFaction] = await tx.update(factions).set({ bank: newBalance }).where(eq(factions.id, faction.id)).returning();
      await tx.insert(factionMembers).values({ factionId: faction.id, characterId: character.id, contributionPoints: amount }).onConflictDoUpdate({
        target: [factionMembers.factionId, factionMembers.characterId],
        set: { contributionPoints: sql`${factionMembers.contributionPoints} + ${amount}` },
      });
      await tx.insert(factionLedgerEntries).values({ factionId: faction.id, characterId: character.id, entryType: 'deposit', amount, balanceAfter: newBalance, description: 'Faction bank deposit.' });
      await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, visibility: 'faction', type: 'faction_deposit', payload: { factionId: faction.id, amount } });
      return { ok: true as const, faction: updatedFaction };
    }

    if (!canWithdrawFactionFunds(membership.role)) {
      return { ok: false as const, code: 'forbidden', message: 'Only underbosses and bosses can withdraw faction funds.' };
    }

    if (faction.bank < amount) {
      return { ok: false as const, code: 'forbidden', message: 'Faction bank does not have enough cash.' };
    }

    const newBalance = faction.bank - amount;
    await tx.update(characters).set({ cash: character.cash + amount, updatedAt: sql`now()` }).where(eq(characters.id, character.id));
    const [updatedFaction] = await tx.update(factions).set({ bank: newBalance }).where(eq(factions.id, faction.id)).returning();
    await tx.insert(factionLedgerEntries).values({ factionId: faction.id, characterId: character.id, entryType: 'withdraw', amount: -amount, balanceAfter: newBalance, description: 'Faction bank withdrawal.' });
    await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, visibility: 'faction', type: 'faction_withdrawal', payload: { factionId: faction.id, amount } });
    return { ok: true as const, faction: updatedFaction };
  });
}

export async function setFactionMemberRole(input: { userId: string; factionId: string; characterId: string; memberCharacterId: string; role: FactionRole }) {
  return db.transaction(async (tx) => {
    const actor = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!actor) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const actorMembership = await getActiveMembership(tx, actor.id);

    if (!actorMembership || actorMembership.factionId !== input.factionId) {
      return { ok: false as const, code: 'forbidden', message: 'Character is not an active member of this faction.' };
    }

    if (!canSetFactionRole(actorMembership.role, input.role)) {
      return { ok: false as const, code: 'forbidden', message: 'Only the boss can assign non-boss roles.' };
    }

    const member = await tx.query.factionMembers.findFirst({ where: and(eq(factionMembers.factionId, input.factionId), eq(factionMembers.characterId, input.memberCharacterId)) });

    if (!member || member.status !== 'active') {
      return { ok: false as const, code: 'not_found', message: 'Faction member not found.' };
    }

    const [updatedMembership] = await tx
      .update(factionMembers)
      .set({ role: input.role })
      .where(and(eq(factionMembers.factionId, input.factionId), eq(factionMembers.characterId, input.memberCharacterId)))
      .returning();

    await tx.insert(playerEvents).values({ userId: input.userId, characterId: actor.id, visibility: 'faction', type: 'faction_role_changed', payload: { factionId: input.factionId, memberCharacterId: input.memberCharacterId, role: input.role } });
    return { ok: true as const, membership: updatedMembership };
  });
}

export async function leaveFaction(input: { userId: string; factionId: string; characterId: string }) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const membership = await getActiveMembership(tx, character.id);

    if (!membership || membership.factionId !== input.factionId) {
      return { ok: false as const, code: 'forbidden', message: 'Character is not an active member of this faction.' };
    }

    if (membership.role === 'boss') {
      const [otherBoss] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(factionMembers)
        .where(and(eq(factionMembers.factionId, input.factionId), eq(factionMembers.role, 'boss'), eq(factionMembers.status, 'active')));
      if ((otherBoss?.count ?? 0) <= 1) {
        return { ok: false as const, code: 'forbidden', message: 'The last boss cannot leave. Promote another boss first in a later feature pass.' };
      }
    }

    await tx.update(factionMembers).set({ status: 'left' }).where(and(eq(factionMembers.factionId, input.factionId), eq(factionMembers.characterId, character.id)));
    await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, visibility: 'faction', type: 'faction_left', payload: { factionId: input.factionId } });
    return { ok: true as const };
  });
}

export async function performTerritoryAction(input: { userId: string; characterId: string; territoryKey: string; action: 'scout' | 'claim' | 'reinforce' | 'attack' }) {
  return db.transaction(async (tx) => {
    const characterRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available for faction actions.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'faction_action');

    if (!cooldown.ok) {
      return cooldown;
    }

    const membership = await getActiveMembership(tx, character.id);

    if (!membership) {
      return { ok: false as const, code: 'forbidden', message: 'Join a faction before taking territory actions.' };
    }

    const territory = await tx.query.territories.findFirst({ where: eq(territories.key, input.territoryKey) });

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
      return { ok: false as const, code: 'forbidden', message: 'Territory action requirements are not met.' };
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

    await tx.update(characters).set({ cash: character.cash - result.cashCost, updatedAt: sql`now()` }).where(eq(characters.id, character.id));
    const [updatedTerritory] = await tx
      .update(territories)
      .set({
        controlledByFactionId: nextControlledByFactionId,
        controlScore: nextControlScore,
        contestedUntil: input.action === 'attack' ? new Date(Date.now() + 60 * 60 * 1000) : territory.contestedUntil,
        updatedAt: sql`now()`,
      })
      .where(eq(territories.key, territory.key))
      .returning();

    await tx.insert(territoryActions).values({ territoryKey: territory.key, factionId: membership.factionId, characterId: character.id, actionType: input.action, power: result.power, cashCost: result.cashCost, outcome, metadata: { scoreDelta: result.scoreDelta } });
    await tx.update(factionMembers).set({ contributionPoints: membership.contributionPoints + result.power }).where(and(eq(factionMembers.factionId, membership.factionId), eq(factionMembers.characterId, character.id)));
    await tx.update(factions).set({ power: sql`${factions.power} + ${result.power}`, reputation: sql`${factions.reputation} + 1` }).where(eq(factions.id, membership.factionId));
    await tx.insert(financialTransactions).values({ characterId: character.id, type: 'system', amount: `-${result.cashCost}.00`, description: `Territory ${input.action}: ${territory.name}`, metadata: { territoryKey: territory.key } });
    await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, visibility: 'public', type: `territory_${outcome}`, payload: { territoryKey: territory.key, factionId: membership.factionId, action: input.action, power: result.power, controlScore: nextControlScore } });
    await setActionCooldown({ tx, characterId: character.id, actionType: 'faction_action', cooldownSeconds: result.cooldownSeconds, metadata: { territoryKey: territory.key, action: input.action } });

    return { ok: true as const, territory: updatedTerritory, outcome, power: result.power };
  });
}

export async function payTerritoryIncomeTick() {
  return db.transaction(async (tx) => {
    const controlled = await tx.query.territories.findMany({ where: sql`${territories.controlledByFactionId} is not null` });
    let paid = 0;

    for (const territory of controlled) {
      if (!territory.controlledByFactionId || territory.incomePerTick <= 0) {
        continue;
      }

      const faction = await tx.query.factions.findFirst({ where: eq(factions.id, territory.controlledByFactionId) });
      if (!faction) {
        continue;
      }

      const nextBalance = faction.bank + territory.incomePerTick;
      await tx.update(factions).set({ bank: nextBalance }).where(eq(factions.id, faction.id));
      await tx.insert(factionLedgerEntries).values({ factionId: faction.id, entryType: 'territory_income', amount: territory.incomePerTick, balanceAfter: nextBalance, description: `Income from ${territory.name}.`, metadata: { territoryKey: territory.key } });
      paid += 1;
    }

    return { paid };
  });
}
