import { and, desc, eq, sql } from 'drizzle-orm';
import {
  calculateGamblingCooldownSeconds,
  calculateTableLimit,
  resolveGamblingWager,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characters,
  financialTransactions,
  gamblingGames,
  gamblingWagers,
  newspaperArticles,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import { adjustCharacterCash } from './transaction-safety';

export async function listGamblingGames() {
  return db.query.gamblingGames.findMany({ where: eq(gamblingGames.isActive, true) });
}

export async function listGamblingWagers(characterId: string, userId: string, limit = 20) {
  const character = await db.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.userId, userId)),
  });

  if (!character) {
    return null;
  }

  return db.query.gamblingWagers.findMany({
    where: eq(gamblingWagers.characterId, characterId),
    orderBy: desc(gamblingWagers.createdAt),
    limit,
  });
}

function getGamblingWagerMetadata(metadata: unknown): { label?: string } | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const label = (metadata as { label?: unknown }).label;

  return typeof label === 'string' ? { label } : null;
}

export async function placeGamblingWager(input: {
  userId: string;
  characterId: string;
  gameKey: string;
  wager: number;
}) {
  return db.transaction(async (tx) => {
    const wagerAmount = Math.max(1, Math.floor(input.wager));
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
        message: 'Character is not available for gambling.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'gambling');

    if (!cooldown.ok) {
      return cooldown;
    }

    const game = await tx.query.gamblingGames.findFirst({
      where: eq(gamblingGames.key, input.gameKey),
    });

    if (!game || !game.isActive) {
      return { ok: false as const, code: 'not_found', message: 'Gambling game not found.' };
    }

    const tableLimit = calculateTableLimit({
      level: character.level,
      gamblingReputation: character.gamblingReputation ?? 0,
      cash: character.cash,
    });
    const maxWager = Math.min(game.maxWager, tableLimit);

    if (wagerAmount < game.minWager || wagerAmount > maxWager) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: `Wager must be between $${game.minWager} and $${maxWager}.`,
      };
    }

    if (character.cash < wagerAmount) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash for this wager.' };
    }

    const outcome = resolveGamblingWager({
      gameKey: game.key,
      wager: wagerAmount,
      houseEdgeBasisPoints: game.houseEdgeBasisPoints,
      variance: game.variance,
    });

    const reputationDelta =
      outcome.profit > 0
        ? Math.max(1, Math.floor(outcome.profit / 250))
        : outcome.profit < 0
          ? -1
          : 0;
    const nextReputation = Math.max(0, (character.gamblingReputation ?? 0) + reputationDelta);

    const cashAdjustment = await adjustCharacterCash(tx, character.id, outcome.profit);

    if (!cashAdjustment.ok || !cashAdjustment.character) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash for this wager.' };
    }

    const [updatedCharacter] = await tx
      .update(characters)
      .set({ gamblingReputation: nextReputation, updatedAt: sql`now()` })
      .where(eq(characters.id, character.id))
      .returning();

    const [wager] = await tx
      .insert(gamblingWagers)
      .values({
        characterId: character.id,
        gameKey: game.key,
        wager: wagerAmount,
        outcome: outcome.outcome,
        payout: outcome.payout,
        profit: outcome.profit,
        roll: outcome.roll,
        metadata: { label: outcome.label, payoutMultiplier: outcome.payoutMultiplier, tableLimit },
      })
      .returning();

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'cash',
      amount: String(outcome.profit),
      description: `${outcome.outcome === 'win' ? 'Won' : outcome.outcome === 'push' ? 'Pushed' : 'Lost'} ${game.name}.`,
      metadata: {
        gameKey: game.key,
        wager: wagerAmount,
        payout: outcome.payout,
        roll: outcome.roll,
      },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      visibility: outcome.profit >= 1000 ? 'public' : 'private',
      type: 'gambling_wager_resolved',
      payload: {
        gameKey: game.key,
        gameName: game.name,
        wager: wagerAmount,
        outcome: outcome.outcome,
        payout: outcome.payout,
        profit: outcome.profit,
        label: outcome.label,
      },
    });

    if (outcome.profit >= 1000) {
      await tx.insert(newspaperArticles).values({
        authorCharacterId: character.id,
        location: character.location,
        category: 'casino',
        title: `${character.name} hits a casino payout`,
        slug: `casino-win-${wager.id}`,
        excerpt: `${character.name} walked away from ${game.name} with a $${outcome.profit} profit.`,
        body: `${character.name} placed a $${wagerAmount} wager at ${game.name} and finished with a $${outcome.profit} profit. Casino regulars are already debating whether it was discipline, luck, or a dangerous streak.`,
        metadata: { wagerId: wager.id, gameKey: game.key, profit: outcome.profit },
      });
    }

    const lock = await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'gambling',
      cooldownSeconds: calculateGamblingCooldownSeconds(wagerAmount),
      metadata: { gameKey: game.key, wager: wagerAmount },
    });

    return { ok: true as const, data: { character: updatedCharacter, wager, game, lock } };
  });
}

export async function getGamblingSummary(characterId: string, userId: string) {
  const character = await db.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.userId, userId)),
  });

  if (!character) {
    return null;
  }

  const [recent, totals] = await Promise.all([
    listGamblingWagers(characterId, userId, 10),
    db
      .select({
        wagered: sql<number>`coalesce(sum(${gamblingWagers.wager}), 0)`,
        profit: sql<number>`coalesce(sum(${gamblingWagers.profit}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(gamblingWagers)
      .where(eq(gamblingWagers.characterId, characterId)),
  ]);

  return {
    reputation: character.gamblingReputation ?? 0,
    tableLimit: calculateTableLimit({
      level: character.level,
      gamblingReputation: character.gamblingReputation ?? 0,
      cash: character.cash,
    }),
    totals: totals[0] ?? { wagered: 0, profit: 0, count: 0 },
    recent: (recent ?? []).map((wager) => ({
      ...wager,
      metadata: getGamblingWagerMetadata(wager.metadata),
    })),
  };
}
