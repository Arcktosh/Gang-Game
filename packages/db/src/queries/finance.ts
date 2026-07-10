import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { calculateAverageCost, calculateBankTransfer, calculateNextAssetPrice, calculateTradeFee } from '@drugdeal/game';
import { db } from '../client';
import {
  assetOrders,
  assetPrices,
  characterActionLocks,
  characterAssetPositions,
  characters,
  financialAssets,
  financialTransactions,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import { addAssetPositionQuantity, decrementCharacterCash, incrementCharacterCash, reserveAssetPositionQuantity } from './transaction-safety';

const FINANCE_COOLDOWN_SECONDS = 8;

type BankTransactionMetadata = {
  action?: string;
  cashBefore?: number;
  cashAfter?: number;
  bankBefore?: number;
  bankAfter?: number;
};

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeBankTransactionMetadata(metadata: unknown): BankTransactionMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, unknown>;

  return {
    action: typeof record.action === 'string' ? record.action : undefined,
    cashBefore: toFiniteNumber(record.cashBefore),
    cashAfter: toFiniteNumber(record.cashAfter),
    bankBefore: toFiniteNumber(record.bankBefore),
    bankAfter: toFiniteNumber(record.bankAfter),
  };
}

async function getLatestAssetPrice(tx: any, assetKey: string) {
  return tx.query.assetPrices.findFirst({
    where: eq(assetPrices.assetKey, assetKey),
    orderBy: desc(assetPrices.createdAt),
  });
}

export async function listFinanceMarket() {
  const assets = await db.query.financialAssets.findMany({ where: eq(financialAssets.isActive, true) });

  const rows = await Promise.all(
    assets.map(async (asset) => {
      const price = await db.query.assetPrices.findFirst({
        where: eq(assetPrices.assetKey, asset.key),
        orderBy: desc(assetPrices.createdAt),
      });

      return {
        asset,
        price: price?.price ?? asset.basePrice,
        volume: price?.volume ?? 0,
        sentiment: price?.sentiment ?? asset.drift,
        pricedAt: price?.createdAt ?? asset.createdAt,
      };
    }),
  );

  return rows.sort((a, b) => a.asset.assetType.localeCompare(b.asset.assetType) || a.asset.symbol.localeCompare(b.asset.symbol));
}

export async function listCharacterPortfolio(characterId: string, userId: string) {
  const character = await db.query.characters.findFirst({ where: and(eq(characters.id, characterId), eq(characters.userId, userId)) });

  if (!character) {
    return null;
  }

  const positions = await db.query.characterAssetPositions.findMany({ where: eq(characterAssetPositions.characterId, characterId) });

  const enriched = await Promise.all(
    positions
      .filter((position) => position.quantity > 0)
      .map(async (position) => {
        const [asset, latestPrice] = await Promise.all([
          db.query.financialAssets.findFirst({ where: eq(financialAssets.key, position.assetKey) }),
          db.query.assetPrices.findFirst({ where: eq(assetPrices.assetKey, position.assetKey), orderBy: desc(assetPrices.createdAt) }),
        ]);

        return {
          ...position,
          asset,
          currentPrice: latestPrice?.price ?? asset?.basePrice ?? 0,
          marketValue: (latestPrice?.price ?? asset?.basePrice ?? 0) * position.quantity,
          unrealizedProfit: ((latestPrice?.price ?? asset?.basePrice ?? 0) - position.averageCost) * position.quantity,
        };
      }),
  );

  return enriched;
}

export async function listAssetOrders(characterId: string, userId: string, limit = 20) {
  const character = await db.query.characters.findFirst({ where: and(eq(characters.id, characterId), eq(characters.userId, userId)) });

  if (!character) {
    return null;
  }

  return db.query.assetOrders.findMany({ where: eq(assetOrders.characterId, characterId), orderBy: desc(assetOrders.createdAt), limit });
}

export type BankStatementAction = 'all' | 'deposit' | 'withdraw' | 'loan_request' | 'loan_repayment' | 'loan_partial_repayment';

export type BankStatementInput = {
  characterId: string;
  userId: string;
  action?: BankStatementAction;
  limit?: number;
  offset?: number;
  from?: Date;
  to?: Date;
};

function normalizeStatementAmount(value: string | number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listCharacterBankStatement(input: BankStatementInput) {
  const character = await db.query.characters.findFirst({ where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)) });

  if (!character) {
    return null;
  }

  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 25)));
  const offset = Math.max(0, Math.min(10_000, Math.floor(input.offset ?? 0)));
  const action = input.action ?? 'all';
  const conditions = [eq(financialTransactions.characterId, character.id), eq(financialTransactions.type, 'bank')];

  if (action !== 'all') {
    conditions.push(sql`${financialTransactions.metadata}->>'action' = ${action}`);
  }

  if (input.from) {
    conditions.push(gte(financialTransactions.createdAt, input.from));
  }

  if (input.to) {
    conditions.push(lte(financialTransactions.createdAt, input.to));
  }

  const rows = await db.query.financialTransactions.findMany({
    where: and(...conditions),
    orderBy: desc(financialTransactions.createdAt),
    limit,
    offset,
  });

  const transactions = rows.map((row) => ({
    ...row,
    metadata: normalizeBankTransactionMetadata(row.metadata),
  }));
  const amounts = transactions.map((transaction) => normalizeStatementAmount(transaction.amount));
  const inflow = amounts.filter((amount) => amount > 0).reduce((total, amount) => total + amount, 0);
  const outflow = amounts.filter((amount) => amount < 0).reduce((total, amount) => total + Math.abs(amount), 0);
  const chronological = [...transactions].reverse();
  const first = chronological[0];
  const last = chronological.at(-1);

  return {
    transactions,
    summary: {
      action,
      limit,
      offset,
      returned: transactions.length,
      hasMore: transactions.length === limit,
      inflow,
      outflow,
      netAmount: inflow - outflow,
      openingBank: first?.metadata?.bankBefore,
      closingBank: last?.metadata?.bankAfter ?? character.bank,
      currentBank: character.bank,
    },
  };
}

export async function listCharacterBankTransactions(input: { characterId: string; userId: string; limit?: number }) {
  const statement = await listCharacterBankStatement(input);
  return statement?.transactions ?? null;
}

export async function listAssetPriceHistory(input: { assetKey: string; limit?: number }) {
  const asset = await db.query.financialAssets.findFirst({ where: eq(financialAssets.key, input.assetKey) });

  if (!asset || !asset.isActive) {
    return null;
  }

  const limit = Math.max(1, Math.min(250, Math.floor(input.limit ?? 100)));
  const prices = await db.query.assetPrices.findMany({
    where: eq(assetPrices.assetKey, input.assetKey),
    orderBy: desc(assetPrices.createdAt),
    limit,
  });

  return {
    asset,
    prices: prices.reverse(),
  };
}

export async function transferBankFunds(input: { userId: string; characterId: string; action: 'deposit' | 'withdraw'; amount: number }) {
  return db.transaction(async (tx) => {
    const characterRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character must be free to use the bank.' };
    }

    const transfer = calculateBankTransfer({
      cash: character.cash,
      bank: character.bank,
      amount: input.amount,
      action: input.action,
    });

    if (!transfer.sufficientFunds) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: input.action === 'deposit' ? 'Not enough cash to deposit.' : 'Not enough bank balance to withdraw.',
      };
    }

    const amount = transfer.appliedAmount;
    const [updatedCharacter] = await tx
      .update(characters)
      .set(
        input.action === 'deposit'
          ? {
              cash: sql`${characters.cash} - ${amount}`,
              bank: sql`${characters.bank} + ${amount}`,
              updatedAt: sql`now()`,
            }
          : {
              cash: sql`${characters.cash} + ${amount}`,
              bank: sql`${characters.bank} - ${amount}`,
              updatedAt: sql`now()`,
            },
      )
      .where(
        input.action === 'deposit'
          ? and(eq(characters.id, character.id), sql`${characters.cash} >= ${amount}`)
          : and(eq(characters.id, character.id), sql`${characters.bank} >= ${amount}`),
      )
      .returning();

    if (!updatedCharacter) {
      return {
        ok: false as const,
        code: 'conflict',
        message: input.action === 'deposit' ? 'Cash balance changed before deposit completed.' : 'Bank balance changed before withdrawal completed.',
      };
    }

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'bank',
      amount: String(input.action === 'deposit' ? amount : -amount),
      description: input.action === 'deposit' ? `Deposited $${amount} into the bank.` : `Withdrew $${amount} from the bank.`,
      metadata: {
        action: input.action,
        amount,
        cashBefore: character.cash,
        bankBefore: character.bank,
        cashAfter: updatedCharacter.cash,
        bankAfter: updatedCharacter.bank,
      },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: input.action === 'deposit' ? 'bank_deposit' : 'bank_withdrawal',
      payload: { amount, cashAfter: updatedCharacter.cash, bankAfter: updatedCharacter.bank },
    });

    return { ok: true as const, data: { character: updatedCharacter, transfer: { ...transfer, appliedAmount: amount } } };
  });
}

export async function tradeAsset(input: { userId: string; characterId: string; assetKey: string; side: 'buy' | 'sell'; quantity: number }) {
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
      return { ok: false as const, code: 'forbidden', message: 'Character is not available for trading.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, `finance_${input.side}`);

    if (!cooldown.ok) {
      return cooldown;
    }

    const [asset, priceRow, existingPosition] = await Promise.all([
      tx.query.financialAssets.findFirst({ where: eq(financialAssets.key, input.assetKey) }),
      getLatestAssetPrice(tx, input.assetKey),
      tx.query.characterAssetPositions.findFirst({
        where: and(eq(characterAssetPositions.characterId, character.id), eq(characterAssetPositions.assetKey, input.assetKey)),
      }),
    ]);

    if (!asset || !priceRow || !asset.isActive) {
      return { ok: false as const, code: 'not_found', message: 'Asset not found.' };
    }

    const grossAmount = priceRow.price * quantity;
    const fee = calculateTradeFee(grossAmount, asset.assetType);

    if (input.side === 'buy') {
      const totalCost = grossAmount + fee;

      if (character.cash < totalCost) {
        return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
      }

      const previousQuantity = existingPosition?.quantity ?? 0;
      const previousAverageCost = existingPosition?.averageCost ?? 0;
      const averageCost = calculateAverageCost({ previousQuantity, previousAverageCost, buyQuantity: quantity, buyPriceEach: priceRow.price });

      const debit = await decrementCharacterCash(tx, character.id, totalCost);

      if (!debit.ok) {
        return { ok: false as const, code: 'conflict', message: 'Not enough cash.' };
      }

      const positionUpdate = await addAssetPositionQuantity(tx, { characterId: character.id, assetKey: asset.key, quantity, averageCost });

      if (!positionUpdate.ok) {
        throw new Error('Could not reserve asset position.');
      }

      const position = positionUpdate.position;
      const updatedCharacter = debit.character;

      const [order] = await tx
        .insert(assetOrders)
        .values({
          characterId: character.id,
          assetKey: asset.key,
          side: 'buy',
          quantity,
          priceEach: priceRow.price,
          grossAmount,
          fee,
          netAmount: -totalCost,
        })
        .returning();

      await tx.insert(financialTransactions).values({
        characterId: character.id,
        type: asset.assetType === 'crypto' ? 'crypto' : 'stock',
        amount: String(-totalCost),
        description: `Bought ${quantity} ${asset.symbol}.`,
        metadata: { assetKey: asset.key, symbol: asset.symbol, quantity, priceEach: priceRow.price, fee },
      });

      await tx.insert(playerEvents).values({
        userId: input.userId,
        characterId: character.id,
        type: 'asset_bought',
        payload: { assetKey: asset.key, symbol: asset.symbol, quantity, priceEach: priceRow.price, fee },
      });

      const lock = await setActionCooldown({
        tx,
        characterId: character.id,
        actionType: 'finance_buy',
        cooldownSeconds: FINANCE_COOLDOWN_SECONDS,
        metadata: { assetKey: asset.key, quantity },
      });

      return { ok: true as const, data: { character: updatedCharacter, position, order, lock } };
    }

    if (!existingPosition || existingPosition.quantity < quantity) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough shares/tokens to sell.' };
    }

    const netPayout = grossAmount - fee;
    const realizedProfit = (priceRow.price - existingPosition.averageCost) * quantity - fee;
    const reservedPosition = await reserveAssetPositionQuantity(tx, existingPosition.id, quantity);

    if (!reservedPosition.ok) {
      return { ok: false as const, code: 'conflict', message: 'Not enough shares/tokens to sell.' };
    }

    const [position] = await tx
      .update(characterAssetPositions)
      .set({
        realizedProfit: sql`${characterAssetPositions.realizedProfit} + ${realizedProfit}`,
        updatedAt: sql`now()`,
      })
      .where(eq(characterAssetPositions.id, existingPosition.id))
      .returning();

    const credit = await incrementCharacterCash(tx, character.id, netPayout);

    if (!credit.ok) {
      throw new Error('Could not credit sale proceeds.');
    }

    const updatedCharacter = credit.character;

    const [order] = await tx
      .insert(assetOrders)
      .values({
        characterId: character.id,
        assetKey: asset.key,
        side: 'sell',
        quantity,
        priceEach: priceRow.price,
        grossAmount,
        fee,
        netAmount: netPayout,
      })
      .returning();

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: asset.assetType === 'crypto' ? 'crypto' : 'stock',
      amount: String(netPayout),
      description: `Sold ${quantity} ${asset.symbol}.`,
      metadata: { assetKey: asset.key, symbol: asset.symbol, quantity, priceEach: priceRow.price, fee, realizedProfit },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: 'asset_sold',
      payload: { assetKey: asset.key, symbol: asset.symbol, quantity, priceEach: priceRow.price, fee, realizedProfit },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'finance_sell',
      cooldownSeconds: FINANCE_COOLDOWN_SECONDS,
      metadata: { assetKey: asset.key, quantity },
    });

    return { ok: true as const, data: { character: updatedCharacter, position, order, lock } };
  });
}

export async function tickAssetPrices(limit = 100) {
  const assets = await db.query.financialAssets.findMany({ where: eq(financialAssets.isActive, true), limit });
  let updated = 0;

  for (const asset of assets) {
    const latest = await db.query.assetPrices.findFirst({ where: eq(assetPrices.assetKey, asset.key), orderBy: desc(assetPrices.createdAt) });

    const next = calculateNextAssetPrice({
      currentPrice: latest?.price ?? asset.basePrice,
      volatility: asset.volatility,
      drift: asset.drift,
      sentiment: latest?.sentiment ?? 0,
      volume: latest?.volume ?? 100,
    });

    await db.insert(assetPrices).values({ assetKey: asset.key, price: next.price, volume: next.volume, sentiment: next.sentiment });
    updated += 1;
  }

  await db.delete(characterActionLocks).where(sql`${characterActionLocks.lockedUntil} < now() - interval '10 minutes'`);
  return updated;
}
