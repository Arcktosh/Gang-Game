import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import {
  DEFAULT_LOAN_DEFAULT_GRACE_HOURS,
  calculateLoanLifecycle,
  calculateLoanOutstanding,
  calculateLoanRepayment,
  calculateLoanRequest,
  calculateMoneySinkPurchase,
  listLoanOfferDefinitions,
  listMoneySinkDefinitions,
} from '@drugdeal/game';
import { characterLoans, characters, financialTransactions, playerEvents } from '../schema';
import { refreshCharacterResources } from './action-state';
import { decrementCharacterBank, decrementCharacterCash, incrementCharacterBank } from './transaction-safety';
import { db } from '../client';

export function listMoneySinks() {
  return listMoneySinkDefinitions();
}

export function listLoanOffers() {
  return listLoanOfferDefinitions();
}

function enrichCharacterLoan(loan: typeof characterLoans.$inferSelect) {
  const outstanding = calculateLoanOutstanding({
    principal: loan.principal,
    fee: loan.fee,
    repaidAmount: loan.repaidAmount,
  });
  const lifecycle = calculateLoanLifecycle({
    status: loan.status,
    dueAt: loan.dueAt,
  });

  return {
    ...loan,
    ...outstanding,
    lifecycleStatus: lifecycle.lifecycleStatus,
    isOverdue: lifecycle.isOverdue,
    isDefaulted: lifecycle.isDefaulted,
    hoursPastDue: lifecycle.hoursPastDue,
    defaultAt: lifecycle.defaultAt,
  };
}

export async function listCharacterLoans(input: { userId: string; characterId: string; limit?: number }) {
  const character = await db.query.characters.findFirst({
    where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
  });

  if (!character) {
    return null;
  }

  const limit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 10)));
  const loans = await db.query.characterLoans.findMany({
    where: eq(characterLoans.characterId, character.id),
    orderBy: desc(characterLoans.createdAt),
    limit,
  });

  const enrichedLoans = loans.map(enrichCharacterLoan);

  return {
    offers: listLoanOffers(),
    loans: enrichedLoans,
    activeLoan: enrichedLoans.find((loan) => ['active', 'defaulted'].includes(loan.status)) ?? null,
  };
}

export async function requestCharacterLoan(input: { userId: string; characterId: string; offerKey: string }) {
  return db.transaction(async (tx) => {
    const characterRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character must be free to request a loan.' };
    }

    const activeLoan = await tx.query.characterLoans.findFirst({
      where: and(eq(characterLoans.characterId, character.id), inArray(characterLoans.status, ['active', 'defaulted'])),
    });

    const request = calculateLoanRequest({
      level: character.level,
      hasActiveLoan: Boolean(activeLoan),
      offerKey: input.offerKey,
    });

    if (!request.ok || !request.offer) {
      return { ok: false as const, code: request.code, message: request.message };
    }

    const dueAt = new Date(Date.now() + request.offer.dueHours * 60 * 60 * 1000);
    const [loan] = await tx
      .insert(characterLoans)
      .values({
        characterId: character.id,
        offerKey: request.offer.key,
        principal: request.principal,
        fee: request.fee,
        status: 'active',
        dueAt,
        metadata: {
          offerName: request.offer.name,
          dueHours: request.offer.dueHours,
          totalDue: request.totalDue,
        },
      })
      .returning();

    const credit = await incrementCharacterBank(tx, character.id, request.principal);

    if (!credit.ok || !credit.character) {
      return { ok: false as const, code: 'conflict', message: 'Bank balance changed before loan funding completed.' };
    }

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'bank',
      amount: String(request.principal),
      description: `Loan funded: ${request.offer.name}.`,
      metadata: {
        action: 'loan_request',
        loanId: loan.id,
        offerKey: request.offer.key,
        offerName: request.offer.name,
        principal: request.principal,
        fee: request.fee,
        totalDue: request.totalDue,
        dueAt: dueAt.toISOString(),
        bankBefore: character.bank,
        bankAfter: credit.character.bank,
      },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: 'loan_requested',
      payload: {
        loanId: loan.id,
        offerKey: request.offer.key,
        principal: request.principal,
        fee: request.fee,
        totalDue: request.totalDue,
        dueAt: dueAt.toISOString(),
      },
    });

    return {
      ok: true as const,
      data: {
        character: credit.character,
        loan: {
          ...loan,
          totalDue: request.totalDue,
          outstanding: request.totalDue,
          isOverdue: false,
        },
      },
    };
  });
}

export async function repayCharacterLoan(input: { userId: string; characterId: string; loanId: string; amount?: number }) {
  return db.transaction(async (tx) => {
    const characterRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character must be free to repay a loan.' };
    }

    const loan = await tx.query.characterLoans.findFirst({
      where: and(
        eq(characterLoans.id, input.loanId),
        eq(characterLoans.characterId, character.id),
        inArray(characterLoans.status, ['active', 'defaulted']),
      ),
    });

    if (!loan) {
      return { ok: false as const, code: 'not_found', message: 'Active loan not found.' };
    }

    const repayment = calculateLoanRepayment({
      principal: loan.principal,
      fee: loan.fee,
      repaidAmount: loan.repaidAmount,
      bank: character.bank,
      requestedAmount: input.amount,
    });

    if (repayment.code === 'settled') {
      return { ok: false as const, code: 'conflict', message: repayment.message };
    }

    if (!repayment.ok) {
      return { ok: false as const, code: 'forbidden', message: repayment.message };
    }

    const debit = await decrementCharacterBank(tx, character.id, repayment.paymentAmount);

    if (!debit.ok || !debit.character) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough bank balance for this loan payment.' };
    }

    const [updatedLoan] = await tx
      .update(characterLoans)
      .set({
        status: repayment.isFullRepayment ? 'repaid' : loan.status,
        repaidAmount: repayment.newRepaidAmount,
        repaidAt: repayment.isFullRepayment ? sql`now()` : loan.repaidAt,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(characterLoans.id, loan.id),
          eq(characterLoans.repaidAmount, loan.repaidAmount),
          inArray(characterLoans.status, ['active', 'defaulted']),
        ),
      )
      .returning();

    if (!updatedLoan) {
      return { ok: false as const, code: 'conflict', message: 'Loan status or balance changed before repayment completed.' };
    }

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'bank',
      amount: String(-repayment.paymentAmount),
      description: repayment.isFullRepayment ? `Loan repaid: ${loan.offerKey}.` : `Loan payment: ${loan.offerKey}.`,
      metadata: {
        action: repayment.isFullRepayment ? 'loan_repayment' : 'loan_partial_repayment',
        loanId: loan.id,
        offerKey: loan.offerKey,
        principal: loan.principal,
        fee: loan.fee,
        requestedAmount: repayment.requestedAmount,
        paymentAmount: repayment.paymentAmount,
        totalDue: repayment.totalDue,
        repaidBefore: repayment.repaidAmount,
        repaidAfter: repayment.newRepaidAmount,
        outstandingBefore: repayment.outstanding,
        outstandingAfter: repayment.remainingOutstanding,
        bankBefore: character.bank,
        bankAfter: debit.character.bank,
      },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: repayment.isFullRepayment ? 'loan_repaid' : 'loan_payment',
      payload: {
        loanId: loan.id,
        offerKey: loan.offerKey,
        requestedAmount: repayment.requestedAmount,
        paymentAmount: repayment.paymentAmount,
        totalDue: repayment.totalDue,
        repaidAmount: repayment.newRepaidAmount,
        outstanding: repayment.remainingOutstanding,
      },
    });

    return {
      ok: true as const,
      data: {
        character: debit.character,
        loan: {
          ...updatedLoan,
          principal: repayment.principal,
          fee: repayment.fee,
          totalDue: repayment.totalDue,
          repaidAmount: repayment.newRepaidAmount,
          outstanding: repayment.remainingOutstanding,
          isOverdue: loan.status === 'defaulted',
          paymentAmount: repayment.paymentAmount,
          isFullRepayment: repayment.isFullRepayment,
        },
      },
    };
  });
}

export async function purchaseMoneySink(input: {
  userId: string;
  characterId: string;
  sinkKey: string;
  paymentSource: 'cash' | 'bank';
}) {
  return db.transaction(async (tx) => {
    const characterRow = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character must be free to buy services.' };
    }

    const purchase = calculateMoneySinkPurchase({
      cash: character.cash,
      bank: character.bank,
      sinkKey: input.sinkKey,
      paymentSource: input.paymentSource,
    });

    if (!purchase.sink) {
      return { ok: false as const, code: 'not_found', message: purchase.message };
    }

    if (!purchase.ok) {
      return { ok: false as const, code: 'forbidden', message: purchase.message };
    }

    const debit = input.paymentSource === 'bank'
      ? await decrementCharacterBank(tx, character.id, purchase.cost)
      : await decrementCharacterCash(tx, character.id, purchase.cost);

    if (!debit.ok || !debit.character) {
      return { ok: false as const, code: 'conflict', message: 'Balance changed before the purchase completed.' };
    }

    const updatedCharacter = debit.character;
    const expiresAt = new Date(Date.now() + purchase.sink.durationHours * 60 * 60 * 1000);

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: input.paymentSource === 'bank' ? 'bank' : 'cash',
      amount: String(-purchase.cost),
      description: `Purchased ${purchase.sink.name}.`,
      metadata: {
        action: 'money_sink_purchase',
        sinkKey: purchase.sink.key,
        sinkName: purchase.sink.name,
        category: purchase.sink.category,
        paymentSource: input.paymentSource,
        cost: purchase.cost,
        cashBefore: character.cash,
        bankBefore: character.bank,
        cashAfter: updatedCharacter.cash,
        bankAfter: updatedCharacter.bank,
        durationHours: purchase.sink.durationHours,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: 'money_sink_purchase',
      payload: {
        sinkKey: purchase.sink.key,
        sinkName: purchase.sink.name,
        category: purchase.sink.category,
        paymentSource: input.paymentSource,
        cost: purchase.cost,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      ok: true as const,
      data: {
        character: updatedCharacter,
        purchase: {
          ...purchase,
          cashAfter: updatedCharacter.cash,
          bankAfter: updatedCharacter.bank,
          expiresAt,
        },
      },
    };
  });
}


export async function processLoanDefaults(input: { limit?: number; defaultGraceHours?: number } = {}) {
  const limit = Math.max(1, Math.min(200, Math.floor(input.limit ?? 50)));
  const defaultGraceHours = Math.max(1, Math.floor(input.defaultGraceHours ?? DEFAULT_LOAN_DEFAULT_GRACE_HOURS));
  const cutoff = new Date(Date.now() - defaultGraceHours * 60 * 60 * 1000);

  const overdueLoans = await db.query.characterLoans.findMany({
    where: and(eq(characterLoans.status, 'active'), lte(characterLoans.dueAt, cutoff)),
    orderBy: desc(characterLoans.dueAt),
    limit,
  });

  let defaulted = 0;

  for (const loan of overdueLoans) {
    const changed = await db.transaction(async (tx) => {
      const currentLoan = await tx.query.characterLoans.findFirst({
        where: and(eq(characterLoans.id, loan.id), eq(characterLoans.status, 'active'), lte(characterLoans.dueAt, cutoff)),
      });

      if (!currentLoan) {
        return false;
      }

      const character = await tx.query.characters.findFirst({ where: eq(characters.id, currentLoan.characterId) });

      const outstanding = calculateLoanOutstanding({
        principal: currentLoan.principal,
        fee: currentLoan.fee,
        repaidAmount: currentLoan.repaidAmount,
      });

      const lifecycle = calculateLoanLifecycle({
        status: currentLoan.status,
        dueAt: currentLoan.dueAt,
        defaultGraceHours,
      });

      await tx
        .update(characterLoans)
        .set({
          status: 'defaulted',
          metadata: sql`coalesce(${characterLoans.metadata}, '{}'::jsonb) || jsonb_build_object('defaultedAt', now(), 'defaultGraceHours', ${defaultGraceHours}, 'outstandingAtDefault', ${outstanding.outstanding})`,
          updatedAt: sql`now()`,
        })
        .where(and(eq(characterLoans.id, currentLoan.id), eq(characterLoans.status, 'active')))
        .returning();

      if (character) {
        await tx
          .update(characters)
          .set({ heat: sql`least(100, ${characters.heat} + 1)`, updatedAt: sql`now()` })
          .where(eq(characters.id, character.id));

        await tx.insert(financialTransactions).values({
          characterId: character.id,
          type: 'system',
          amount: '0',
          description: `Loan default recorded: ${currentLoan.offerKey}.`,
          metadata: {
            action: 'loan_default',
            loanId: currentLoan.id,
            offerKey: currentLoan.offerKey,
            outstanding: outstanding.outstanding,
            totalDue: outstanding.totalDue,
            dueAt: currentLoan.dueAt.toISOString(),
            defaultAt: lifecycle.defaultAt.toISOString(),
            defaultGraceHours,
            heatBefore: character.heat,
            heatAfter: Math.min(100, character.heat + 1),
          },
        });

        await tx.insert(playerEvents).values({
          userId: character.userId,
          characterId: character.id,
          type: 'loan_defaulted',
          payload: {
            loanId: currentLoan.id,
            offerKey: currentLoan.offerKey,
            outstanding: outstanding.outstanding,
            totalDue: outstanding.totalDue,
            dueAt: currentLoan.dueAt.toISOString(),
            defaultAt: lifecycle.defaultAt.toISOString(),
            defaultGraceHours,
          },
        });
      }

      return true;
    });

    if (changed) {
      defaulted += 1;
    }
  }

  return { scanned: overdueLoans.length, defaulted };
}
