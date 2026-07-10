export type { FeatureFlagKey } from '@drugdeal/game';

import {
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagKey,
  getFeatureFlagDefinition,
  normalizeFeatureFlagValue,
} from '@drugdeal/game';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../client';
import { gameConfigEntries } from '../schema';

export type FeatureFlagState = {
  key: FeatureFlagKey;
  label: string;
  category: string;
  description: string;
  enabled: boolean;
  disabledMessage: string;
  reason: string;
  isConfigured: boolean;
  updatedAt: Date | null;
};

function hydrateFeatureFlagState(key: FeatureFlagKey, entry?: typeof gameConfigEntries.$inferSelect | null): FeatureFlagState {
  const definition = getFeatureFlagDefinition(key);
  const normalized = normalizeFeatureFlagValue(entry?.value, definition.defaultEnabled);

  return {
    key,
    label: definition.label,
    category: definition.category,
    description: definition.description,
    enabled: normalized.enabled,
    disabledMessage: normalized.disabledMessage,
    reason: normalized.reason,
    isConfigured: Boolean(entry),
    updatedAt: entry?.updatedAt ?? null,
  };
}

export async function listFeatureFlagStates(): Promise<FeatureFlagState[]> {
  const keys = FEATURE_FLAG_DEFINITIONS.map((definition) => definition.key);
  const entries = await db.query.gameConfigEntries.findMany({
    where: inArray(gameConfigEntries.key, keys),
  });
  const entryMap = new Map(entries.map((entry) => [entry.key, entry]));

  return FEATURE_FLAG_DEFINITIONS.map((definition) => hydrateFeatureFlagState(definition.key, entryMap.get(definition.key)));
}

export async function getFeatureFlagState(key: FeatureFlagKey): Promise<FeatureFlagState> {
  const entry = await db.query.gameConfigEntries.findFirst({ where: eq(gameConfigEntries.key, key) });
  return hydrateFeatureFlagState(key, entry);
}

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const state = await getFeatureFlagState(key);
  return state.enabled;
}
