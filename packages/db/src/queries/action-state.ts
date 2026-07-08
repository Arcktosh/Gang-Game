import { and, eq, gt, sql } from 'drizzle-orm';
import { calculateRegeneratedResources } from '@drugdeal/game';
import { db } from '../client';
import { characterActionLocks, characters, hospitalStays, jailSentences } from '../schema';

export type GameActionType =
  | 'job'
  | 'crime'
  | 'training'
  | 'education'
  | 'travel'
  | 'market_buy'
  | 'market_sell'
  | 'legal_bribe'
  | 'legal_court'
  | 'jail_activity'
  | 'faction_action'
  | 'faction_inventory'
  | 'shop_create'
  | 'shop_list'
  | 'shop_purchase'
  | 'finance_buy'
  | 'finance_sell'
  | 'gambling'
  | 'pvp_attack'
  | 'bounty_create'
  | 'contract_create'
  | 'contract_accept'
  | 'contract_complete'
  | 'trade_create'
  | 'trade_accept'
  | 'item_use'
  | 'item_transfer'
  | 'equipment_change'
  | 'vehicle_upgrade'
  | 'crafting'
  | 'contacts';

type Tx = any;

type CharacterRow = typeof characters.$inferSelect;

export async function refreshCharacterResources(tx: Tx, character: CharacterRow) {
  const now = new Date();
  const statusExpired = character.status !== 'free' && character.statusUntil !== null && character.statusUntil.getTime() <= now.getTime();
  const regenerated = calculateRegeneratedResources({
    energy: character.energy,
    nerve: character.nerve,
    maxEnergy: character.maxEnergy,
    maxNerve: character.maxNerve,
    endurance: character.endurance,
    lastResourceTickAt: character.lastResourceTickAt,
  });

  if (!regenerated.changed && !statusExpired) {
    return character;
  }

  if (statusExpired && character.status === 'hospitalized') {
    await tx
      .update(hospitalStays)
      .set({ status: 'completed', completedAt: sql`now()` })
      .where(and(eq(hospitalStays.characterId, character.id), eq(hospitalStays.status, 'active')));
  }

  if (statusExpired && character.status === 'jailed') {
    await tx
      .update(jailSentences)
      .set({ status: 'completed', completedAt: sql`now()` })
      .where(and(eq(jailSentences.characterId, character.id), eq(jailSentences.status, 'active')));
  }

  const [updatedCharacter] = await tx
    .update(characters)
    .set({
      energy: regenerated.energy,
      nerve: regenerated.nerve,
      lastResourceTickAt: regenerated.changed ? sql`now()` : character.lastResourceTickAt,
      status: statusExpired ? 'free' : character.status,
      statusUntil: statusExpired ? null : character.statusUntil,
      statusReason: statusExpired ? null : character.statusReason,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, character.id))
    .returning();

  return updatedCharacter;
}

export async function getActiveActionLock(tx: Tx, characterId: string, actionType: GameActionType) {
  return tx.query.characterActionLocks.findFirst({
    where: and(
      eq(characterActionLocks.characterId, characterId),
      eq(characterActionLocks.actionType, actionType),
      gt(characterActionLocks.lockedUntil, sql`now()`),
    ),
  });
}

export async function assertActionUnlocked(tx: Tx, characterId: string, actionType: GameActionType) {
  const lock = await getActiveActionLock(tx, characterId, actionType);

  if (!lock) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    code: 'cooldown_active',
    message: `Action is on cooldown until ${lock.lockedUntil.toISOString()}.`,
    lockedUntil: lock.lockedUntil,
  };
}

export async function setActionCooldown(input: {
  tx: Tx;
  characterId: string;
  actionType: GameActionType;
  cooldownSeconds: number;
  metadata?: Record<string, unknown>;
}) {
  const lockedUntil = new Date(Date.now() + Math.max(0, input.cooldownSeconds) * 1000);

  const [lock] = await input.tx
    .insert(characterActionLocks)
    .values({
      characterId: input.characterId,
      actionType: input.actionType,
      lockedUntil,
      metadata: input.metadata ?? {},
    })
    .onConflictDoUpdate({
      target: [characterActionLocks.characterId, characterActionLocks.actionType],
      set: {
        lockedUntil,
        metadata: input.metadata ?? {},
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return lock;
}

export async function listActiveActionLocks(characterId: string) {
  return db.query.characterActionLocks.findMany({
    where: and(eq(characterActionLocks.characterId, characterId), gt(characterActionLocks.lockedUntil, sql`now()`)),
  });
}
