import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateBailSettlement, calculateCourtOutcome, calculateFineSettlement, calculateJailActivity } from '../legal';

test('jail fine and bail settlements include affordability and deterministic costs', () => {
  const fine = calculateFineSettlement({ fine: 250, severity: 3, remainingSeconds: 1800, cash: 300, bank: 0, paymentSource: 'cash' });
  assert.deepEqual(fine, {
    action: 'pay_fine',
    cost: 250,
    paymentSource: 'cash',
    remainingSeconds: 1800,
    releaseNow: true,
    heatReduction: 4,
    canAfford: true,
  });

  const bail = calculateBailSettlement({ fine: 100, severity: 3, remainingSeconds: 1800, cash: 300, bank: 600, paymentSource: 'bank' });
  assert.deepEqual(bail, {
    action: 'post_bail',
    cost: 425,
    paymentSource: 'bank',
    remainingSeconds: 1800,
    releaseNow: true,
    heatReduction: 2,
    canAfford: true,
  });
});

test('court outcomes are deterministic with supplied rolls', () => {
  const input = { severity: 3, heat: 10, legalReputation: 5, intelligence: 8, remainingSeconds: 2400, fine: 300, plea: 'contest' as const };

  assert.equal(calculateCourtOutcome({ ...input, roll: 0.01 }).outcome, 'dismissed');
  assert.equal(calculateCourtOutcome({ ...input, roll: 0.3 }).outcome, 'reduced');
  assert.equal(calculateCourtOutcome({ ...input, roll: 0.5 }).outcome, 'unchanged');
  assert.equal(calculateCourtOutcome({ ...input, roll: 0.97 }).outcome, 'extended');
});

test('jail activities provide bounded release reductions and stat gains', () => {
  assert.deepEqual(calculateJailActivity({ activity: 'library', severity: 2, remainingSeconds: 600, intelligence: 24, labour: 1, endurance: 1, strength: 1 }), {
    activity: 'library',
    releaseReductionSeconds: 330,
    experience: 12,
    intelligenceGain: 1,
    labourGain: 0,
    strengthGain: 0,
    enduranceGain: 0,
    releaseNow: false,
  });

  assert.equal(calculateJailActivity({ activity: 'work_detail', severity: 5, remainingSeconds: 120, intelligence: 1, labour: 1, endurance: 1, strength: 1 }).releaseNow, true);
});
