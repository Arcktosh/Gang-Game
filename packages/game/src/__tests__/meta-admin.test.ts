import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateBankAdjustment,
  calculateCashAdjustment,
  calculateLegacyPoints,
  calculateObjectiveReward,
  calculatePrestigeReadiness,
  calculatePrestigeReset,
  calculateProfileScore,
  calculateSeasonPoints,
  clampAdminSeverity,
  clampProgress,
  getObjectivePeriod,
  getPrestigePerkKey,
  getSeasonRankBand,
  isProgressComplete,
  normalizeConfigValue,
  validateModerationReason,
} from '../index';

test('objective progress and period windows are bounded', () => {
  assert.equal(clampProgress(12.8, 10), 10);
  assert.equal(clampProgress(-5, 10), 0);
  assert.equal(isProgressComplete(10, 10), true);
  assert.equal(isProgressComplete(9, 10), false);

  const daily = getObjectivePeriod('daily', new Date('2026-07-04T13:45:00.000Z'));
  assert.equal(daily.start.toISOString(), '2026-07-04T00:00:00.000Z');
  assert.equal(daily.end.toISOString(), '2026-07-05T00:00:00.000Z');

  const weekly = getObjectivePeriod('weekly', new Date('2026-07-04T13:45:00.000Z'));
  assert.equal(weekly.start.toISOString(), '2026-06-29T00:00:00.000Z');
  assert.equal(weekly.end.toISOString(), '2026-07-06T00:00:00.000Z');
});

test('profile, objective, season, and prestige formulas remain stable', () => {
  assert.equal(calculateProfileScore({ achievementPoints: 10, objectivePoints: 20, level: 3, reputationBonus: 5 }), 65);
  assert.deepEqual(calculateObjectiveReward({ rewardCash: 99.9, rewardExperience: 15.2, cadence: 'daily' }), { cash: 99, experience: 15 });

  const seasonPoints = calculateSeasonPoints({
    level: 10,
    experience: 2000,
    cash: 5000,
    bank: 5000,
    profileScore: 1000,
    achievementPoints: 50,
    objectivePoints: 25,
    factionPower: 100,
    gamblingReputation: 20,
  });
  assert.equal(seasonPoints, 1125);
  assert.equal(getSeasonRankBand(seasonPoints), 'gold');

  assert.deepEqual(calculatePrestigeReadiness({ level: 10, profileScore: 1000, cash: 25000, bank: 25000, prestigeLevel: 0 }), {
    requiredLevel: 10,
    requiredProfileScore: 1000,
    requiredNetWorth: 50000,
    netWorth: 50000,
    ready: true,
  });
  assert.equal(calculateLegacyPoints({ level: 10, experience: 1000, profileScore: 1000, cash: 10000, bank: 10000, seasonPoints: 1000, prestigeLevel: 1 }), 36);
  assert.deepEqual(calculatePrestigeReset({ legacyPointsAwarded: 10, totalLegacyPoints: 20, prestigeLevel: 1 }), {
    cash: 1000,
    bank: 0,
    level: 1,
    experience: 0,
    health: 100,
    energy: 120,
    nerve: 30,
    heat: 0,
    prestigeLevel: 2,
  });
  assert.equal(getPrestigePerkKey(0), 'legacy_seed');
  assert.equal(getPrestigePerkKey(1), 'legacy_starter');
  assert.equal(getPrestigePerkKey(3), 'legacy_operator');
  assert.equal(getPrestigePerkKey(5), 'legacy_empire');
});

test('admin utility helpers clamp, normalize, and summarize safely', () => {
  assert.equal(clampAdminSeverity(Number.NaN), 1);
  assert.equal(clampAdminSeverity(0), 1);
  assert.equal(clampAdminSeverity(10), 5);
  assert.deepEqual(normalizeConfigValue({ market: { enabled: true } }), { market: { enabled: true } });
  assert.throws(() => normalizeConfigValue(null), /Config value/);
  assert.equal(validateModerationReason('  valid reason  '), 'valid reason');
  assert.throws(() => validateModerationReason('bad'), /at least 5/);

  assert.deepEqual(calculateCashAdjustment({ currentCash: 50, amount: -100 }), {
    amount: -100,
    before: 50,
    after: 0,
    deltaApplied: -50,
  });
  assert.deepEqual(calculateBankAdjustment({ currentBank: 50, amount: 25.8 }), {
    amount: 25,
    before: 50,
    after: 75,
    deltaApplied: 25,
  });
});
