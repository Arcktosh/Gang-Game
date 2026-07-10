import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FEATURE_FLAG_DEFINITIONS,
  buildFeatureFlagValue,
  isFeatureFlagKey,
  normalizeFeatureFlagValue,
} from '../index';

test('feature flag definitions expose production kill-switch keys', () => {
  assert.ok(FEATURE_FLAG_DEFINITIONS.length >= 10);
  assert.equal(isFeatureFlagKey('feature.messages'), true);
  assert.equal(isFeatureFlagKey('feature.unknown'), false);
});

test('feature flag values normalize disabled states and messages safely', () => {
  assert.deepEqual(normalizeFeatureFlagValue({ enabled: false, disabledMessage: 'Paused for maintenance.' }), {
    enabled: false,
    disabledMessage: 'Paused for maintenance.',
    reason: '',
  });

  assert.equal(normalizeFeatureFlagValue(null, true).enabled, true);
  assert.equal(buildFeatureFlagValue(false, 'Incident review in progress.').enabled, false);
});
