import { type FeatureFlagKey, getFeatureFlagState } from '@drugdeal/db';
import { jsonError } from './api';

export async function requireFeatureEnabled(featureKey: FeatureFlagKey) {
  const state = await getFeatureFlagState(featureKey);

  if (state.enabled) {
    return { ok: true as const, state };
  }

  return {
    ok: false as const,
    state,
    response: jsonError('feature_disabled', state.disabledMessage, 503, {
      featureKey: state.key,
      label: state.label,
      reason: state.reason,
    }),
  };
}
