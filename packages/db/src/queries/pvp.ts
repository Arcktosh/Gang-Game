import { and, desc, eq, lte, or, sql } from 'drizzle-orm';
import {
  calculateBountyPosting,
  calculateCombatPower,
  calculateWarDurationHours,
  calculateWarScoreDelta,
  canManageFaction,
  resolveCombat,
  type FactionRole,
} from '@drugdeal/game';
import { db } from '../client';
import {
  bounties,
  characters,
  combatLogs,
  factionMembers,
  factionWars,
  factions,
  financialTransactions,
  hospitalStays,
  newspaperArticles,
  playerEvents,
  territories,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import { applyEquipmentWear, getEquippedModifierSummary } from './equipment';

type Tx = any;

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  return tx.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.userId, userId)),
  });
}

async function getActiveMembership(tx: Tx, characterId: string) {
  return tx.query.factionMembers.findFirst({
    where: and(eq(factionMembers.characterId, characterId), eq(factionMembers.status, 'active')),
  });
}

export async function getPvpProfile(input: { userId: string; characterId: string }) {
  const character = await db.query.characters.findFirst({
    where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
  });

  if (!character) {
    return null;
  }

  const activeBounties = await db.query.bounties.findMany({
    where: eq(bounties.status, 'open'),
    orderBy: desc(bounties.reward),
    limit: 25,
  });
  const recentCombat = await db.query.combatLogs.findMany({
    where: or(
      eq(combatLogs.attackerCharacterId, character.id),
      eq(combatLogs.defenderCharacterId, character.id),
    ),
    orderBy: desc(combatLogs.createdAt),
    limit: 20,
  });
  const activeWars = await db.query.factionWars.findMany({
    where: or(eq(factionWars.status, 'declared'), eq(factionWars.status, 'active')),
    orderBy: desc(factionWars.createdAt),
    limit: 20,
  });
  const possibleTargets = await db
    .select({
      id: characters.id,
      name: characters.name,
      level: characters.level,
      location: characters.location,
      status: characters.status,
      health: characters.health,
      cash: characters.cash,
    })
    .from(characters)
    .where(
      and(
        eq(characters.location, character.location),
        eq(characters.status, 'free'),
        sql`${characters.id} <> ${character.id}`,
      ),
    )
    .orderBy(desc(characters.level), desc(characters.cash))
    .limit(20);

  return { character, activeBounties, recentCombat, activeWars, possibleTargets };
}

export async function attackCharacter(input: {
  userId: string;
  attackerCharacterId: string;
  defenderCharacterId: string;
}) {
  return db.transaction(async (tx) => {
    const attackerRow = await getOwnedCharacter(tx, input.userId, input.attackerCharacterId);

    if (!attackerRow) {
      return { ok: false as const, code: 'not_found', message: 'Attacker character not found.' };
    }

    const attacker = await refreshCharacterResources(tx, attackerRow);

    if (attacker.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available for combat.',
      };
    }

    if (attacker.id === input.defenderCharacterId) {
      return { ok: false as const, code: 'forbidden', message: 'You cannot attack yourself.' };
    }

    const cooldown = await assertActionUnlocked(tx, attacker.id, 'pvp_attack');

    if (!cooldown.ok) {
      return cooldown;
    }

    const defender = await tx.query.characters.findFirst({
      where: eq(characters.id, input.defenderCharacterId),
    });

    if (!defender || defender.status !== 'free') {
      return { ok: false as const, code: 'not_found', message: 'Available defender not found.' };
    }

    if (defender.location !== attacker.location) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Target must be in the same location.',
      };
    }

    const attackerMembership = await getActiveMembership(tx, attacker.id);
    const defenderMembership = await getActiveMembership(tx, defender.id);
    const [attackerEquipment, defenderEquipment] = await Promise.all([
      getEquippedModifierSummary(tx, attacker.id),
      getEquippedModifierSummary(tx, defender.id),
    ]);
    const attackerPower = calculateCombatPower({ ...attacker, equipment: attackerEquipment });
    const defenderPower = calculateCombatPower({ ...defender, equipment: defenderEquipment });
    const result = resolveCombat({
      attackerPower,
      defenderPower,
      attackerCash: attacker.cash,
      defenderCash: defender.cash,
      attackerDexterity: attacker.dexterity,
      defenderDexterity: defender.dexterity,
    });

    const newAttackerHealth = Math.max(1, attacker.health - result.damageToAttacker);
    const newDefenderHealth = Math.max(0, defender.health - result.damageToDefender);
    const defenderHospitalized = newDefenderHealth <= 10 && result.outcome === 'attacker_win';
    const hospitalizationSeconds = defenderHospitalized
      ? 900 + Math.max(0, result.damageToDefender - defender.defense) * 30
      : 0;
    const defenderStatusUntil = defenderHospitalized
      ? new Date(Date.now() + hospitalizationSeconds * 1000)
      : null;
    let bountyClaim: { id: string; reward: number } | null = null;

    if (result.outcome === 'attacker_win') {
      const bounty = await tx.query.bounties.findFirst({
        where: and(eq(bounties.targetCharacterId, defender.id), eq(bounties.status, 'open')),
        orderBy: desc(bounties.reward),
      });
      if (bounty) {
        bountyClaim = { id: bounty.id, reward: bounty.reward };
        await tx
          .update(bounties)
          .set({
            status: 'claimed',
            claimedByCharacterId: attacker.id,
            claimedAt: sql`now()`,
            updatedAt: sql`now()`,
          })
          .where(eq(bounties.id, bounty.id));
      }
    }

    const bountyReward = bountyClaim?.reward ?? 0;
    await tx
      .update(characters)
      .set({
        health: newAttackerHealth,
        cash: attacker.cash + result.cashStolen + bountyReward,
        heat: attacker.heat + result.heatGain,
        experience: attacker.experience + result.experienceAwarded,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, attacker.id));

    await tx
      .update(characters)
      .set({
        health: defenderHospitalized ? 25 : newDefenderHealth,
        cash: Math.max(0, defender.cash - result.cashStolen),
        status: defenderHospitalized ? 'hospitalized' : defender.status,
        statusUntil: defenderStatusUntil,
        statusReason: defenderHospitalized
          ? `Hospitalized after an attack by ${attacker.name}.`
          : defender.statusReason,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, defender.id));

    if (defenderHospitalized && defenderStatusUntil) {
      await tx
        .insert(hospitalStays)
        .values({
          characterId: defender.id,
          reason: `Attacked by ${attacker.name}`,
          severity: Math.max(1, Math.ceil(result.damageToDefender / 10)),
          bill: 150 + result.damageToDefender * 5,
          releasedAt: defenderStatusUntil,
        });
    }

    const [combat] = await tx
      .insert(combatLogs)
      .values({
        attackerCharacterId: attacker.id,
        defenderCharacterId: defender.id,
        attackerFactionId: attackerMembership?.factionId,
        defenderFactionId: defenderMembership?.factionId,
        territoryKey: null,
        outcome: result.outcome,
        attackerPower,
        defenderPower,
        damageToAttacker: result.damageToAttacker,
        damageToDefender: result.damageToDefender,
        cashStolen: result.cashStolen,
        experienceAwarded: result.experienceAwarded,
        heatGain: result.heatGain,
        metadata: { bountyClaim, defenderHospitalized },
      })
      .returning();

    await recordWarCombatScore({
      tx,
      attackerFactionId: attackerMembership?.factionId,
      defenderFactionId: defenderMembership?.factionId,
      outcome: result.outcome,
      attackerPower,
      defenderPower,
    });

    if (result.cashStolen > 0 || bountyReward > 0) {
      await tx
        .insert(financialTransactions)
        .values({
          characterId: attacker.id,
          type: 'cash',
          amount: String(result.cashStolen + bountyReward),
          description: `Combat gain from attacking ${defender.name}.`,
          metadata: { combatId: combat.id, bountyClaim },
        });
      if (result.cashStolen > 0) {
        await tx
          .insert(financialTransactions)
          .values({
            characterId: defender.id,
            type: 'cash',
            amount: String(-result.cashStolen),
            description: `Cash lost after being attacked by ${attacker.name}.`,
            metadata: { combatId: combat.id },
          });
      }
    }

    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: attacker.id,
        visibility: 'public',
        type: 'pvp_attack',
        payload: {
          combatId: combat.id,
          defenderCharacterId: defender.id,
          defenderName: defender.name,
          outcome: result.outcome,
          cashStolen: result.cashStolen,
          bountyClaim,
        },
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: defender.userId,
        characterId: defender.id,
        visibility: 'private',
        type: 'pvp_defended',
        payload: {
          combatId: combat.id,
          attackerCharacterId: attacker.id,
          attackerName: attacker.name,
          outcome: result.outcome,
          damage: result.damageToDefender,
        },
      });

    if (
      result.outcome === 'attacker_win' &&
      (result.cashStolen >= 500 || bountyReward >= 1000 || defenderHospitalized)
    ) {
      await tx.insert(newspaperArticles).values({
        authorCharacterId: attacker.id,
        location: attacker.location,
        category: 'crime',
        title: `${attacker.name} overpowered ${defender.name}`,
        slug: `combat-${combat.id}`,
        excerpt: `${attacker.name} won a public fight${bountyReward ? ` and claimed a $${bountyReward} bounty` : ''}.`,
        body: `${attacker.name} attacked ${defender.name} in ${attacker.location}. Witnesses reported a ${result.outcome.replace('_', ' ')} with $${result.cashStolen} taken.`,
        metadata: { combatId: combat.id, bountyClaim },
      });
    }

    await applyEquipmentWear(tx, { characterId: attacker.id, baseWear: 2 });
    await applyEquipmentWear(tx, { characterId: defender.id, baseWear: 1 });
    await setActionCooldown({
      tx,
      characterId: attacker.id,
      actionType: 'pvp_attack',
      cooldownSeconds: result.cooldownSeconds,
      metadata: { combatId: combat.id },
    });
    return { ok: true as const, data: { combat, bountyClaim } };
  });
}

export async function createBounty(input: {
  userId: string;
  characterId: string;
  targetCharacterId: string;
  reward: number;
  reason?: string;
  expiresInHours?: number;
}) {
  return db.transaction(async (tx) => {
    const creator = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!creator) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    if (creator.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to post bounties.',
      };
    }

    if (creator.id === input.targetCharacterId) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'You cannot place a bounty on yourself.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, creator.id, 'bounty_create');
    if (!cooldown.ok) {
      return cooldown;
    }

    const target = await tx.query.characters.findFirst({
      where: eq(characters.id, input.targetCharacterId),
    });
    if (!target) {
      return { ok: false as const, code: 'not_found', message: 'Target character not found.' };
    }

    const posting = calculateBountyPosting({ reward: input.reward });
    if (creator.cash < posting.totalCost) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: `Posting this bounty requires $${posting.totalCost}.`,
      };
    }

    const expiresAt = new Date(Date.now() + (input.expiresInHours ?? 72) * 60 * 60 * 1000);
    const [bounty] = await tx
      .insert(bounties)
      .values({
        createdByCharacterId: creator.id,
        targetCharacterId: target.id,
        reward: posting.reward,
        postingFee: posting.postingFee,
        reason: input.reason ?? '',
        expiresAt,
      })
      .returning();

    await tx
      .update(characters)
      .set({ cash: creator.cash - posting.totalCost, updatedAt: sql`now()` })
      .where(eq(characters.id, creator.id));
    await tx
      .insert(financialTransactions)
      .values({
        characterId: creator.id,
        type: 'system',
        amount: String(-posting.totalCost),
        description: `Posted bounty on ${target.name}.`,
        metadata: { bountyId: bounty.id, postingFee: posting.postingFee },
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: creator.id,
        visibility: 'public',
        type: 'bounty_posted',
        payload: {
          bountyId: bounty.id,
          targetCharacterId: target.id,
          targetName: target.name,
          reward: bounty.reward,
        },
      });

    if (bounty.reward >= 1000) {
      await tx
        .insert(newspaperArticles)
        .values({
          authorCharacterId: creator.id,
          location: creator.location,
          category: 'bounties',
          title: `A $${bounty.reward} bounty was posted on ${target.name}`,
          slug: `bounty-${bounty.id}`,
          excerpt: `${target.name} is now wanted by the street.`,
          body: `${creator.name} posted a $${bounty.reward} bounty on ${target.name}. The board is open until the timer expires.`,
          metadata: { bountyId: bounty.id, targetCharacterId: target.id },
        });
    }

    await setActionCooldown({
      tx,
      characterId: creator.id,
      actionType: 'bounty_create',
      cooldownSeconds: 300,
      metadata: { bountyId: bounty.id },
    });
    return { ok: true as const, data: { bounty } };
  });
}

export async function cancelBounty(input: {
  userId: string;
  characterId: string;
  bountyId: string;
}) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);
    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const bounty = await tx.query.bounties.findFirst({ where: eq(bounties.id, input.bountyId) });
    if (!bounty || bounty.createdByCharacterId !== character.id || bounty.status !== 'open') {
      return { ok: false as const, code: 'not_found', message: 'Open bounty not found.' };
    }

    await tx
      .update(bounties)
      .set({ status: 'cancelled', cancelledAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(bounties.id, bounty.id));
    await tx
      .update(characters)
      .set({ cash: character.cash + bounty.reward, updatedAt: sql`now()` })
      .where(eq(characters.id, character.id));
    await tx
      .insert(financialTransactions)
      .values({
        characterId: character.id,
        type: 'system',
        amount: String(bounty.reward),
        description: 'Refunded cancelled bounty escrow.',
        metadata: { bountyId: bounty.id },
      });
    return { ok: true as const };
  });
}

export async function declareFactionWar(input: {
  userId: string;
  characterId: string;
  defenderFactionId: string;
  territoryKey?: string;
  durationHours?: number;
}) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);
    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const membership = await getActiveMembership(tx, character.id);
    if (!membership || !canManageFaction(membership.role as FactionRole)) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Only faction captains and above can declare wars.',
      };
    }

    if (membership.factionId === input.defenderFactionId) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Cannot declare war on your own faction.',
      };
    }

    const defenderFaction = await tx.query.factions.findFirst({
      where: eq(factions.id, input.defenderFactionId),
    });
    if (!defenderFaction) {
      return { ok: false as const, code: 'not_found', message: 'Defender faction not found.' };
    }

    if (input.territoryKey) {
      const territory = await tx.query.territories.findFirst({
        where: eq(territories.key, input.territoryKey),
      });
      if (!territory) {
        return { ok: false as const, code: 'not_found', message: 'Territory not found.' };
      }
    }

    const attackerFaction = await tx.query.factions.findFirst({
      where: eq(factions.id, membership.factionId),
    });
    const durationHours =
      input.durationHours ??
      calculateWarDurationHours({
        attackerPower: attackerFaction?.power ?? 1,
        defenderPower: defenderFaction.power ?? 1,
      });
    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const [war] = await tx
      .insert(factionWars)
      .values({
        attackerFactionId: membership.factionId,
        defenderFactionId: defenderFaction.id,
        declaredByCharacterId: character.id,
        territoryKey: input.territoryKey,
        status: 'active',
        endsAt,
      })
      .returning();

    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: 'public',
        type: 'faction_war_declared',
        payload: {
          warId: war.id,
          attackerFactionId: war.attackerFactionId,
          defenderFactionId: war.defenderFactionId,
          territoryKey: war.territoryKey,
        },
      });
    await tx
      .insert(newspaperArticles)
      .values({
        authorCharacterId: character.id,
        location: character.location,
        category: 'factions',
        title: `${attackerFaction?.name ?? 'A faction'} declared war on ${defenderFaction.name}`,
        slug: `war-${war.id}`,
        excerpt: 'Faction conflict has escalated into open war.',
        body: `${attackerFaction?.name ?? 'A faction'} declared war on ${defenderFaction.name}${input.territoryKey ? ` over ${input.territoryKey}` : ''}.`,
        metadata: { warId: war.id },
      });

    return { ok: true as const, data: { war } };
  });
}

export async function recordWarCombatScore(input: {
  tx: Tx;
  attackerFactionId?: string | null;
  defenderFactionId?: string | null;
  outcome: 'attacker_win' | 'defender_win' | 'draw' | 'fled';
  attackerPower: number;
  defenderPower: number;
}) {
  if (
    !input.attackerFactionId ||
    !input.defenderFactionId ||
    input.attackerFactionId === input.defenderFactionId
  ) {
    return;
  }

  const war = await input.tx.query.factionWars.findFirst({
    where: and(
      eq(factionWars.attackerFactionId, input.attackerFactionId),
      eq(factionWars.defenderFactionId, input.defenderFactionId),
      eq(factionWars.status, 'active'),
    ),
  });

  if (!war) {
    return;
  }

  const delta = calculateWarScoreDelta(input);
  await input.tx
    .update(factionWars)
    .set({
      attackerScore: war.attackerScore + delta,
      defenderScore: war.defenderScore - delta,
      updatedAt: sql`now()`,
    })
    .where(eq(factionWars.id, war.id));
}

export async function expireOpenBounties() {
  const dueBounties = await db.query.bounties.findMany({
    where: and(eq(bounties.status, 'open'), lte(bounties.expiresAt, new Date())),
    limit: 50,
  });

  for (const bounty of dueBounties) {
    await db.transaction(async (tx) => {
      const creator = await tx.query.characters.findFirst({
        where: eq(characters.id, bounty.createdByCharacterId),
      });
      await tx
        .update(bounties)
        .set({ status: 'expired', updatedAt: sql`now()` })
        .where(eq(bounties.id, bounty.id));

      if (!creator) {
        return;
      }

      await tx
        .update(characters)
        .set({ cash: creator.cash + bounty.reward, updatedAt: sql`now()` })
        .where(eq(characters.id, creator.id));
      await tx
        .insert(financialTransactions)
        .values({
          characterId: creator.id,
          type: 'system',
          amount: String(bounty.reward),
          description: 'Refunded expired bounty escrow.',
          metadata: { bountyId: bounty.id },
        });
    });
  }

  return dueBounties.length;
}

export async function resolveEndedFactionWars() {
  const dueWars = await db.query.factionWars.findMany({
    where: and(eq(factionWars.status, 'active'), lte(factionWars.endsAt, new Date())),
    limit: 25,
  });

  for (const war of dueWars) {
    await db.transaction(async (tx) => {
      const winnerFactionId =
        war.attackerScore >= war.defenderScore ? war.attackerFactionId : war.defenderFactionId;
      await tx
        .update(factionWars)
        .set({ status: 'resolved', winnerFactionId, resolvedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(factionWars.id, war.id));

      if (war.territoryKey) {
        await tx
          .update(territories)
          .set({
            controlledByFactionId: winnerFactionId,
            controlScore: 25,
            contestedUntil: null,
            updatedAt: sql`now()`,
          })
          .where(eq(territories.key, war.territoryKey));
      }

      await tx
        .insert(playerEvents)
        .values({
          visibility: 'public',
          type: 'faction_war_resolved',
          payload: {
            warId: war.id,
            winnerFactionId,
            territoryKey: war.territoryKey,
            attackerScore: war.attackerScore,
            defenderScore: war.defenderScore,
          },
        });
    });
  }

  return dueWars.length;
}
