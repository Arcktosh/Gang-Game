import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateActionExperience,
  calculateBankTransfer,
  calculateExperienceForLevel,
  calculateLevelFromExperience,
  calculateProgressionFromExperience,
  calculateMarketPrice,
  normalizeBankTransferAmount,
  calculateScaledTrainingEnergyCost,
  calculateMoneySinkPurchase,
  getMoneySinkDefinition,
  listMoneySinkDefinitions,
  calculateLoanLifecycle,
  calculateLoanOutstanding,
  calculateLoanRepayment,
  calculateLoanRequest,
  getLoanOfferDefinition,
  listLoanOfferDefinitions,
} from '../index';

test('market prices never fall below one and react to demand pressure', () => {
  assert.equal(
    calculateMarketPrice({ basePrice: 100, supply: 200, demand: 100, volatility: 0 }),
    50,
  );
  assert.equal(
    calculateMarketPrice({ basePrice: 100, supply: 100, demand: 200, volatility: 0 }),
    200,
  );
  assert.equal(
    calculateMarketPrice({ basePrice: 0, supply: 0, demand: 0, volatility: 0 }),
    1,
  );
});

test('market volatility applies as a deterministic multiplier', () => {
  assert.equal(
    calculateMarketPrice({ basePrice: 100, supply: 100, demand: 100, volatility: 2 }),
    106,
  );
});

test('training energy cost scales but never drops below the base cost', () => {
  assert.equal(calculateScaledTrainingEnergyCost({ baseEnergyCost: 10, currentStat: 0 }), 10);
  assert.equal(calculateScaledTrainingEnergyCost({ baseEnergyCost: 10, currentStat: 20 }), 13);
});

test('level calculation is monotonic and starts at level one', () => {
  assert.equal(calculateLevelFromExperience(-100), 1);
  assert.equal(calculateLevelFromExperience(0), 1);
  assert.equal(calculateLevelFromExperience(100), 2);
  assert.equal(calculateLevelFromExperience(900), 4);
});


test('progression snapshots expose next-level progress and rewards', () => {
  assert.equal(calculateExperienceForLevel(1), 0);
  assert.equal(calculateExperienceForLevel(4), 900);

  assert.deepEqual(calculateProgressionFromExperience(225), {
    level: 2,
    experience: 225,
    currentLevelExperience: 100,
    nextLevelExperience: 400,
    experienceIntoLevel: 125,
    experienceForNextLevel: 300,
    progressPercent: 41.67,
    rewards: { maxNerve: 21, energyCapBonus: 0, title: 'New Blood' },
  });

  assert.deepEqual(calculateProgressionFromExperience(900).rewards, {
    maxNerve: 23,
    energyCapBonus: 2,
    title: 'Runner',
  });
});

test('action experience rewards success while keeping failed actions useful', () => {
  assert.equal(calculateActionExperience({ base: 10, difficulty: 3, success: true }), 16);
  assert.equal(calculateActionExperience({ base: 10, difficulty: 3, success: false }), 4);
  assert.equal(calculateActionExperience({ base: 0, difficulty: 0, success: false }), 1);
});

test('bank transfer calculations normalize deposits and withdrawals safely', () => {
  assert.equal(normalizeBankTransferAmount(25.8), 25);
  assert.equal(normalizeBankTransferAmount(Number.NaN), 0);

  assert.deepEqual(calculateBankTransfer({ cash: 100, bank: 10, amount: 75, action: 'deposit' }), {
    action: 'deposit',
    requestedAmount: 75,
    appliedAmount: 75,
    cashBefore: 100,
    bankBefore: 10,
    cashAfter: 25,
    bankAfter: 85,
    sufficientFunds: true,
  });

  assert.deepEqual(calculateBankTransfer({ cash: 15, bank: 50, amount: 20, action: 'deposit' }), {
    action: 'deposit',
    requestedAmount: 20,
    appliedAmount: 15,
    cashBefore: 15,
    bankBefore: 50,
    cashAfter: 0,
    bankAfter: 65,
    sufficientFunds: false,
  });

  assert.deepEqual(calculateBankTransfer({ cash: 5, bank: 50, amount: 25, action: 'withdraw' }), {
    action: 'withdraw',
    requestedAmount: 25,
    appliedAmount: 25,
    cashBefore: 5,
    bankBefore: 50,
    cashAfter: 30,
    bankAfter: 25,
    sufficientFunds: true,
  });
});


test('money sink catalog exposes stable optional economy drains', () => {
  const sinks = listMoneySinkDefinitions();
  assert.ok(sinks.length >= 4);
  assert.equal(getMoneySinkDefinition('safehouse_upkeep')?.cost, 75);
  assert.equal(getMoneySinkDefinition('missing_sink'), null);
});

test('money sink purchases normalize source-specific balances', () => {
  assert.deepEqual(
    calculateMoneySinkPurchase({ cash: 100, bank: 20, sinkKey: 'safehouse_upkeep', paymentSource: 'cash' }),
    {
      ok: true,
      code: 'ok',
      message: 'Money sink purchased.',
      sink: getMoneySinkDefinition('safehouse_upkeep'),
      paymentSource: 'cash',
      cost: 75,
      cashBefore: 100,
      bankBefore: 20,
      cashAfter: 25,
      bankAfter: 20,
    },
  );

  assert.equal(
    calculateMoneySinkPurchase({ cash: 10, bank: 250, sinkKey: 'personal_security', paymentSource: 'cash' }).ok,
    false,
  );

  assert.deepEqual(
    calculateMoneySinkPurchase({ cash: 10, bank: 250, sinkKey: 'personal_security', paymentSource: 'bank' }),
    {
      ok: true,
      code: 'ok',
      message: 'Money sink purchased.',
      sink: getMoneySinkDefinition('personal_security'),
      paymentSource: 'bank',
      cost: 250,
      cashBefore: 10,
      bankBefore: 250,
      cashAfter: 10,
      bankAfter: 0,
    },
  );
});


test('loan offers enforce level and active-loan limits', () => {
  const offers = listLoanOfferDefinitions();
  assert.ok(offers.length >= 3);
  assert.equal(getLoanOfferDefinition('starter_float')?.principal, 250);
  assert.equal(getLoanOfferDefinition('missing_loan'), null);

  assert.deepEqual(calculateLoanRequest({ level: 1, hasActiveLoan: false, offerKey: 'starter_float' }), {
    ok: true,
    code: 'ok',
    message: 'Loan approved.',
    offer: getLoanOfferDefinition('starter_float'),
    level: 1,
    principal: 250,
    fee: 25,
    totalDue: 275,
  });

  assert.equal(calculateLoanRequest({ level: 1, hasActiveLoan: false, offerKey: 'business_bridge' }).code, 'forbidden');
  assert.equal(calculateLoanRequest({ level: 5, hasActiveLoan: true, offerKey: 'business_bridge' }).code, 'conflict');
});

test('loan outstanding clamps repayments to the total due', () => {
  assert.deepEqual(calculateLoanOutstanding({ principal: 250, fee: 25, repaidAmount: 0 }), {
    principal: 250,
    fee: 25,
    totalDue: 275,
    repaidAmount: 0,
    outstanding: 275,
  });

  assert.deepEqual(calculateLoanOutstanding({ principal: 250.8, fee: 25.1, repaidAmount: 999 }), {
    principal: 250,
    fee: 25,
    totalDue: 275,
    repaidAmount: 275,
    outstanding: 0,
  });
});




test('loan repayment supports partial payments and full payoff from bank', () => {
  assert.deepEqual(calculateLoanRepayment({ principal: 250, fee: 25, repaidAmount: 0, bank: 100, requestedAmount: 75 }), {
    ok: true,
    code: 'ok',
    message: 'Loan payment accepted.',
    principal: 250,
    fee: 25,
    totalDue: 275,
    repaidAmount: 0,
    outstanding: 275,
    bankBefore: 100,
    requestedAmount: 75,
    paymentAmount: 75,
    newRepaidAmount: 75,
    remainingOutstanding: 200,
    bankAfter: 25,
    isFullRepayment: false,
  });

  assert.deepEqual(calculateLoanRepayment({ principal: 250, fee: 25, repaidAmount: 75, bank: 500 }), {
    ok: true,
    code: 'ok',
    message: 'Loan payment accepted.',
    principal: 250,
    fee: 25,
    totalDue: 275,
    repaidAmount: 75,
    outstanding: 200,
    bankBefore: 500,
    requestedAmount: 200,
    paymentAmount: 200,
    newRepaidAmount: 275,
    remainingOutstanding: 0,
    bankAfter: 300,
    isFullRepayment: true,
  });

  assert.equal(
    calculateLoanRepayment({ principal: 250, fee: 25, repaidAmount: 0, bank: 20, requestedAmount: 75 }).code,
    'insufficient_funds',
  );
});

test('loan lifecycle tracks active, overdue, and defaulted windows', () => {
  const dueAt = new Date('2026-01-01T12:00:00.000Z');

  assert.deepEqual(calculateLoanLifecycle({ status: 'active', dueAt, now: '2026-01-01T11:00:00.000Z', defaultGraceHours: 24 }), {
    lifecycleStatus: 'active',
    isOverdue: false,
    isDefaulted: false,
    hoursPastDue: 0,
    defaultAt: new Date('2026-01-02T12:00:00.000Z'),
    graceHours: 24,
  });

  assert.deepEqual(calculateLoanLifecycle({ status: 'active', dueAt, now: '2026-01-01T15:30:00.000Z', defaultGraceHours: 24 }), {
    lifecycleStatus: 'overdue',
    isOverdue: true,
    isDefaulted: false,
    hoursPastDue: 3,
    defaultAt: new Date('2026-01-02T12:00:00.000Z'),
    graceHours: 24,
  });

  assert.deepEqual(calculateLoanLifecycle({ status: 'active', dueAt, now: '2026-01-02T12:00:00.000Z', defaultGraceHours: 24 }), {
    lifecycleStatus: 'defaulted',
    isOverdue: true,
    isDefaulted: true,
    hoursPastDue: 24,
    defaultAt: new Date('2026-01-02T12:00:00.000Z'),
    graceHours: 24,
  });

  assert.equal(calculateLoanLifecycle({ status: 'repaid', dueAt, now: '2026-01-03T12:00:00.000Z' }).isOverdue, false);
});
