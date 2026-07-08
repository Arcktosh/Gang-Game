import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateActionExperience,
  calculateBankTransfer,
  calculateExperienceForLevel,
  calculateLevelFromExperience,
  calculateProgressionFromExperience,
  calculateMarketPrice,
  calculateMarketEventImpact,
  calculateMarketEventLifecycle,
  calculateMarketPressure,
  buildMarketEventNewsArticle,
  getMarketEventDefinition,
  hydrateMarketEventOccurrence,
  listMarketEventDefinitions,
  scheduleMarketEventOccurrence,
  normalizeBankTransferAmount,
  calculateScaledTrainingEnergyCost,
  calculateTimedProgressionPlan,
  evaluateCourseRequirements,
  summarizeProgressionQueue,
  calculateMoneySinkPurchase,
  getMoneySinkDefinition,
  listMoneySinkDefinitions,
  calculateLoanLifecycle,
  calculateLoanOutstanding,
  calculateLoanRepayment,
  calculateLoanRequest,
  calculatePlayerTradeExpiry,
  calculatePlayerTradeQuote,
  summarizePlayerTradeOffers,
  calculateConsumableEffect,
  calculateInventoryExposure,
  getItemRarityValueMultiplier,
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

test('market pressure snapshots expose normalized pricing inputs', () => {
  assert.deepEqual(calculateMarketPressure({ basePrice: 100.9, supply: 80, demand: 120, volatility: 1 }), {
    basePrice: 100,
    supply: 80,
    demand: 120,
    volatility: 1,
    pressure: 1.5,
    volatilityMultiplier: 1.03,
    price: 154,
  });
});

test('market event definitions are stable and copied for callers', () => {
  const events = listMarketEventDefinitions();
  assert.ok(events.length >= 5);
  assert.equal(getMarketEventDefinition('port_congestion')?.kind, 'shortage');
  assert.equal(getMarketEventDefinition('missing_event'), null);

  events[0].name = 'mutated in test';
  assert.equal(getMarketEventDefinition(events[0].key)?.name === 'mutated in test', false);
});

test('market events deterministically tune supply, demand, volatility, risk, and price', () => {
  assert.deepEqual(calculateMarketEventImpact({ basePrice: 100, supply: 100, demand: 100, volatility: 0, risk: 2, eventKey: 'port_congestion' }), {
    ok: true,
    code: 'ok',
    message: 'Market event applied.',
    event: getMarketEventDefinition('port_congestion'),
    baseline: {
      basePrice: 100,
      supply: 100,
      demand: 100,
      volatility: 0,
      pressure: 1,
      volatilityMultiplier: 1,
      price: 100,
    },
    adjusted: {
      basePrice: 100,
      supply: 65,
      demand: 105,
      volatility: 2,
      pressure: 105 / 65,
      volatilityMultiplier: 1.06,
      price: 171,
    },
    riskBefore: 2,
    riskAfter: 3,
    priceDelta: 71,
    priceDeltaPercent: 71,
  });

  assert.deepEqual(calculateMarketEventImpact({ basePrice: 100, supply: 100, demand: 100, volatility: 2, risk: 0, eventKey: 'warehouse_surplus' }), {
    ok: true,
    code: 'ok',
    message: 'Market event applied.',
    event: getMarketEventDefinition('warehouse_surplus'),
    baseline: {
      basePrice: 100,
      supply: 100,
      demand: 100,
      volatility: 2,
      pressure: 1,
      volatilityMultiplier: 1.06,
      price: 106,
    },
    adjusted: {
      basePrice: 100,
      supply: 145,
      demand: 95,
      volatility: 1,
      pressure: 95 / 145,
      volatilityMultiplier: 1.03,
      price: 67,
    },
    riskBefore: 0,
    riskAfter: 0,
    priceDelta: -39,
    priceDeltaPercent: -36.79,
  });
});


test('market event scheduling is deterministic per location, item, seed, and cadence bucket', () => {
  const first = scheduleMarketEventOccurrence({
    location: 'Starter-City',
    itemKey: 'bandages',
    now: '2026-01-01T07:15:00.000Z',
    seed: 'season-1',
  });
  const second = scheduleMarketEventOccurrence({
    location: 'starter-city',
    itemKey: 'bandages',
    now: '2026-01-01T08:30:00.000Z',
    seed: 'season-1',
  });

  if (!first || !second) {
    throw new Error('Expected deterministic market event occurrences.');
  }

  assert.equal(first.eventKey, second.eventKey);
  assert.equal(first.location, 'starter-city');
  assert.equal(first.itemKey, 'bandages');
  assert.equal(first.startsAt.toISOString(), '2026-01-01T06:00:00.000Z');
  assert.equal(first.endsAt.toISOString(), new Date(Date.parse(first.startsAt.toISOString()) + first.event.durationHours * 60 * 60 * 1000).toISOString());
  assert.equal(first.status, 'active');
});

test('market event scheduling supports allowed event filters and lifecycle states', () => {
  const occurrence = scheduleMarketEventOccurrence({
    location: 'starter-city',
    now: '2026-01-01T00:30:00.000Z',
    seed: 'filtered',
    cadenceHours: 12,
    allowedEventKeys: ['missing_event', 'warehouse_surplus'],
  });

  if (!occurrence) {
    throw new Error('Expected filtered market event occurrence.');
  }

  assert.equal(occurrence.eventKey, 'warehouse_surplus');
  assert.equal(scheduleMarketEventOccurrence({ location: 'starter-city', allowedEventKeys: ['missing_event'] }), null);
  assert.deepEqual(calculateMarketEventLifecycle({ startsAt: '2026-01-01T02:00:00.000Z', endsAt: '2026-01-01T04:00:00.000Z', now: '2026-01-01T01:00:00.000Z' }), {
    status: 'upcoming',
    startsAt: new Date('2026-01-01T02:00:00.000Z'),
    endsAt: new Date('2026-01-01T04:00:00.000Z'),
    startsInSeconds: 3600,
    expiresInSeconds: 10800,
    isActive: false,
  });
  assert.equal(calculateMarketEventLifecycle({ startsAt: '2026-01-01T02:00:00.000Z', endsAt: '2026-01-01T04:00:00.000Z', now: '2026-01-01T03:00:00.000Z' }).status, 'active');
  assert.equal(calculateMarketEventLifecycle({ startsAt: '2026-01-01T02:00:00.000Z', endsAt: '2026-01-01T04:00:00.000Z', now: '2026-01-01T04:00:00.000Z' }).status, 'expired');
});

test('persisted market events hydrate into lifecycle-aware occurrences', () => {
  const occurrence = hydrateMarketEventOccurrence({
    eventKey: 'district_crackdown',
    location: ' Starter-City ',
    itemKey: 'lockpicks',
    startsAt: '2026-01-01T06:00:00.000Z',
    endsAt: '2026-01-01T16:00:00.000Z',
    now: '2026-01-01T12:00:00.000Z',
  });

  if (!occurrence) {
    throw new Error('Expected persisted market event to hydrate.');
  }

  assert.equal(occurrence.eventKey, 'district_crackdown');
  assert.equal(occurrence.location, 'starter-city');
  assert.equal(occurrence.itemKey, 'lockpicks');
  assert.equal(occurrence.status, 'active');
  assert.equal(occurrence.event.kind, 'crackdown');
  assert.equal(hydrateMarketEventOccurrence({ eventKey: 'missing_event', location: 'starter-city', startsAt: Date.now(), endsAt: Date.now() }), null);
});

test('market event news payloads are ready for newspaper publishing', () => {
  const occurrence = scheduleMarketEventOccurrence({
    location: 'starter-city',
    itemKey: 'fuel_cells',
    now: '2026-01-01T12:00:00.000Z',
    seed: 'news',
    allowedEventKeys: ['port_congestion'],
  });

  if (!occurrence) {
    throw new Error('Expected market event occurrence for news payload.');
  }

  const article = buildMarketEventNewsArticle({ occurrence, itemName: 'Fuel cells' });
  assert.equal(article.category, 'market');
  assert.equal(article.metadata.source, 'market_event');
  assert.equal(article.metadata.eventKey, 'port_congestion');
  assert.equal(article.metadata.location, 'starter-city');
  assert.equal(article.metadata.itemKey, 'fuel_cells');
  assert.match(article.title, /Starter City/);
  assert.match(article.body, /supply x0.65/);
});

test('market event impact safely handles no-op and missing event requests', () => {
  assert.equal(calculateMarketEventImpact({ basePrice: 100, supply: 100, demand: 100, volatility: 0 }).message, 'No market event applied.');
  assert.deepEqual(calculateMarketEventImpact({ basePrice: 100, supply: 100, demand: 100, volatility: 0, eventKey: 'missing_event' }), {
    ok: false,
    code: 'not_found',
    message: 'Market event not found.',
    event: null,
    baseline: {
      basePrice: 100,
      supply: 100,
      demand: 100,
      volatility: 0,
      pressure: 1,
      volatilityMultiplier: 1,
      price: 100,
    },
    adjusted: {
      basePrice: 100,
      supply: 100,
      demand: 100,
      volatility: 0,
      pressure: 1,
      volatilityMultiplier: 1,
      price: 100,
    },
    riskBefore: 0,
    riskAfter: 0,
    priceDelta: 0,
    priceDeltaPercent: 0,
  });
});

test('training energy cost scales but never drops below the base cost', () => {
  assert.equal(calculateScaledTrainingEnergyCost({ baseEnergyCost: 10, currentStat: 0 }), 10);
  assert.equal(calculateScaledTrainingEnergyCost({ baseEnergyCost: 10, currentStat: 20 }), 13);
});



test('timed progression plans scale costs and due times deterministically', () => {
  const plan = calculateTimedProgressionPlan({
    baseEnergyCost: 10,
    baseCashCost: 25,
    baseDurationSeconds: 1800,
    currentStat: 21,
    now: new Date('2026-01-01T00:00:00.000Z'),
  });

  assert.deepEqual(plan, {
    energyCost: 13,
    cashCost: 25,
    durationSeconds: 1920,
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    dueAt: new Date('2026-01-01T00:32:00.000Z'),
  });
});

test('course requirements report level and prerequisite blockers', () => {
  assert.deepEqual(evaluateCourseRequirements({ characterLevel: 1, completedCourseKeys: [], requiredLevel: 3 }), {
    ok: false,
    code: 'level_required',
    message: 'Requires level 3.',
    requiredLevel: 3,
  });

  assert.deepEqual(
    evaluateCourseRequirements({
      characterLevel: 4,
      completedCourseKeys: ['basic-accounting'],
      requiredLevel: 3,
      prerequisiteCourseKey: 'street-law',
    }),
    {
      ok: false,
      code: 'course_required',
      message: 'Requires course street-law.',
      prerequisiteCourseKey: 'street-law',
    },
  );

  assert.equal(
    evaluateCourseRequirements({
      characterLevel: 4,
      completedCourseKeys: ['street-law'],
      requiredLevel: 3,
      prerequisiteCourseKey: 'street-law',
    }).ok,
    true,
  );
});

test('progression queue summaries expose active and overdue completions', () => {
  assert.deepEqual(
    summarizeProgressionQueue({
      training: [
        { status: 'scheduled', dueAt: '2026-01-01T00:05:00.000Z' },
        { status: 'completed', dueAt: '2026-01-01T00:01:00.000Z' },
      ],
      courses: [{ status: 'scheduled', dueAt: '2026-01-01T00:15:00.000Z' }],
      now: new Date('2026-01-01T00:10:00.000Z'),
    }),
    {
      activeTraining: 1,
      activeCourses: 1,
      overdueCompletions: 1,
      nextDueAt: new Date('2026-01-01T00:05:00.000Z'),
    },
  );
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


test('player trade quotes clamp quantity, price, and seller fee', () => {
  assert.deepEqual(calculatePlayerTradeQuote({ quantity: 4, priceEach: 125 }), {
    quantity: 4,
    priceEach: 125,
    gross: 500,
    sellerFee: 12,
    sellerPayout: 488,
    buyerCost: 500,
  });

  assert.deepEqual(calculatePlayerTradeQuote({ quantity: 0, priceEach: 0, sellerFeeBasisPoints: 0 }), {
    quantity: 1,
    priceEach: 1,
    gross: 1,
    sellerFee: 0,
    sellerPayout: 1,
    buyerCost: 1,
  });
});

test('player trade expiry normalizes windows to production bounds', () => {
  const shortWindow = calculatePlayerTradeExpiry({ now: '2026-01-01T00:00:00.000Z', expiresInHours: 0 });
  assert.equal(shortWindow.expiresInHours, 1);
  assert.equal(shortWindow.expiresAt.toISOString(), '2026-01-01T01:00:00.000Z');

  const longWindow = calculatePlayerTradeExpiry({ now: '2026-01-01T00:00:00.000Z', expiresInHours: 999 });
  assert.equal(longWindow.expiresInHours, 168);
  assert.equal(longWindow.expiresAt.toISOString(), '2026-01-08T00:00:00.000Z');
});

test('player trade summary separates open exposure from completed volume', () => {
  const summary = summarizePlayerTradeOffers({
    sentOffers: [
      { status: 'open', gross: 500, buyerCost: 500, sellerFee: 12, sellerPayout: 488 },
      { status: 'accepted', gross: 300, buyerCost: 300, sellerFee: 7, sellerPayout: 293 },
      { status: 'open', isExpired: true, gross: 100, buyerCost: 100, sellerFee: 2, sellerPayout: 98 },
    ],
    receivedOffers: [
      { status: 'open', gross: 250, buyerCost: 250, sellerFee: 6, sellerPayout: 244 },
      { status: 'cancelled', gross: 125, buyerCost: 125, sellerFee: 3, sellerPayout: 122 },
    ],
  });

  assert.deepEqual(summary, {
    sentCount: 3,
    receivedCount: 2,
    openSentCount: 1,
    openReceivedCount: 1,
    completedCount: 1,
    cancelledCount: 1,
    expiredCount: 1,
    reservedInventoryValue: 500,
    pendingBuyerCost: 250,
    completedGrossVolume: 300,
    completedSellerPayout: 293,
    completedSellerFees: 7,
  });
});



test('consumable effects restore bounded character resources', () => {
  assert.deepEqual(
    calculateConsumableEffect({
      itemKey: 'first-aid-kit',
      category: 'medical',
      character: { health: 80, energy: 20, maxEnergy: 100, nerve: 5, maxNerve: 20, heat: 7 },
    }),
    {
      isConsumable: true,
      healthDelta: 20,
      energyDelta: 0,
      nerveDelta: 0,
      heatDelta: 0,
      nextHealth: 100,
      nextEnergy: 20,
      nextNerve: 5,
      nextHeat: 7,
      summary: 'Restored health with a first-aid kit.',
    },
  );

  assert.equal(
    calculateConsumableEffect({
      itemKey: 'lockpick-set',
      category: 'tool',
      character: { health: 80, energy: 20, maxEnergy: 100, nerve: 5, maxNerve: 20 },
    }).isConsumable,
    false,
  );
});

test('inventory exposure applies rarity value and risk scoring', () => {
  assert.deepEqual(
    calculateInventoryExposure({ quantity: 3, basePrice: 100, baseRisk: 2, isIllegal: true, rarity: 'rare' }),
    {
      quantity: 3,
      rarity: 'rare',
      estimatedValue: 465,
      riskScore: 8,
      isHighRisk: false,
    },
  );
  assert.equal(getItemRarityValueMultiplier('legendary'), 3);
  assert.equal(calculateInventoryExposure({ quantity: 20, basePrice: 10, baseRisk: 1, isIllegal: true }).isHighRisk, true);
});
