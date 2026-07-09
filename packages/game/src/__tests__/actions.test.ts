import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateCrimeSuccessChance,
  calculateFailedCrimeConsequence,
  calculateJobPayout,
  calculateRegeneratedResources,
  calculateMaxEnergy,
  calculateMaxNerve,
} from '../index';

test('job payouts scale with labour and floor to whole cash units', () => {
  assert.equal(calculateJobPayout({ baseWage: 100, labour: 0 }), 100);
  assert.equal(calculateJobPayout({ baseWage: 100, labour: 5 }), 125);
  assert.equal(calculateJobPayout({ baseWage: 99, labour: 1 }), 103);
});

test('crime success chance is clamped to the configured risk bounds', () => {
  assert.equal(
    calculateCrimeSuccessChance({ intelligence: 0, dexterity: 0, heat: 100, difficulty: 100 }),
    0.05,
  );
  assert.equal(
    calculateCrimeSuccessChance({ intelligence: 100, dexterity: 100, heat: 0, difficulty: 0 }),
    0.95,
  );
  assert.equal(
    calculateCrimeSuccessChance({ intelligence: 5, dexterity: 5, heat: 5, difficulty: 5 }),
    0.375,
  );
});

test('failed crime consequences are deterministic with supplied rolls', () => {
  const input = { heat: 20, jailRisk: 5, difficulty: 6, endurance: 3, defense: 2 };

  assert.deepEqual(calculateFailedCrimeConsequence(input, 0.01), {
    type: 'jail',
    severity: 4,
    durationSeconds: 1500,
    healthLost: 0,
    fine: 300,
    bill: 0,
  });

  assert.deepEqual(calculateFailedCrimeConsequence(input, 0.5), {
    type: 'hospital',
    severity: 3,
    durationSeconds: 900,
    healthLost: 36,
    fine: 0,
    bill: 150,
  });

  assert.deepEqual(calculateFailedCrimeConsequence(input, 0.99), {
    type: 'none',
    severity: 0,
    durationSeconds: 0,
    healthLost: 0,
    fine: 0,
    bill: 0,
  });
});

test('resource regeneration respects elapsed time and resource caps', () => {
  const result = calculateRegeneratedResources({
    energy: 90,
    nerve: 18,
    maxEnergy: 100,
    maxNerve: 20,
    endurance: 25,
    lastResourceTickAt: new Date('2026-01-01T00:00:00.000Z'),
    now: new Date('2026-01-01T00:10:00.000Z'),
  });

  assert.deepEqual(result, { energy: 100, nerve: 20, changed: true, minutesElapsed: 10 });
});

test('maximum resource formulas are stable', () => {
  assert.equal(calculateMaxEnergy(1), 100);
  assert.equal(calculateMaxEnergy(11), 120);
  assert.equal(calculateMaxNerve(1), 20);
  assert.equal(calculateMaxNerve(10), 29);
});
