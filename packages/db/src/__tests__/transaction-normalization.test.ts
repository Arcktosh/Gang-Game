import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeInteger,
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
} from '../transaction-normalization';

test('normalizes monetary and experience values to non-negative integers', () => {
  assert.equal(normalizeNonNegativeInteger(12.9), 12);
  assert.equal(normalizeNonNegativeInteger(0), 0);
  assert.equal(normalizeNonNegativeInteger(-4.2), 0);
});

test('normalizes quantities to positive integers', () => {
  assert.equal(normalizePositiveInteger(9.8), 9);
  assert.equal(normalizePositiveInteger(1), 1);
  assert.equal(normalizePositiveInteger(0), 1);
  assert.equal(normalizePositiveInteger(-8), 1);
});

test('normalizes signed deltas without changing their sign', () => {
  assert.equal(normalizeInteger(7.9), 7);
  assert.equal(normalizeInteger(-7.1), -8);
  assert.equal(normalizeInteger(0), 0);
});
