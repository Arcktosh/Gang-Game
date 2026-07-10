export const FEATURE_FLAG_DEFINITIONS = [
  {
    key: 'feature.messages',
    label: 'Messages',
    category: 'social',
    description: 'Allows players to send direct, group, and faction messages.',
    defaultEnabled: true,
  },
  {
    key: 'feature.newspaper',
    label: 'Newspaper submissions',
    category: 'social',
    description: 'Allows player-submitted newspaper articles, comments, reactions, and reports.',
    defaultEnabled: true,
  },
  {
    key: 'feature.shops',
    label: 'Player shops',
    category: 'economy',
    description: 'Allows player shop creation, listings, purchases, reviews, and advertisements.',
    defaultEnabled: true,
  },
  {
    key: 'feature.trades',
    label: 'Player trades',
    category: 'economy',
    description: 'Allows player-to-player private trade offers and trade actions.',
    defaultEnabled: true,
  },
  {
    key: 'feature.gambling',
    label: 'Gambling',
    category: 'economy',
    description: 'Allows wager placement for casino-style fictional games.',
    defaultEnabled: true,
  },
  {
    key: 'feature.finance',
    label: 'Finance trading',
    category: 'economy',
    description: 'Allows fictional asset buy and sell orders.',
    defaultEnabled: true,
  },
  {
    key: 'feature.market',
    label: 'Market actions',
    category: 'economy',
    description: 'Allows location market buy and sell actions.',
    defaultEnabled: true,
  },
  {
    key: 'feature.contracts',
    label: 'Contracts',
    category: 'multiplayer',
    description: 'Allows player-created contracts and contract lifecycle actions.',
    defaultEnabled: true,
  },
  {
    key: 'feature.factions',
    label: 'Factions',
    category: 'multiplayer',
    description: 'Allows faction creation, membership, bank, armory, and member operations.',
    defaultEnabled: true,
  },
  {
    key: 'feature.pvp',
    label: 'PvP attacks',
    category: 'multiplayer',
    description: 'Allows local player-versus-player attack actions.',
    defaultEnabled: true,
  },
] as const;

export type FeatureFlagDefinition = (typeof FEATURE_FLAG_DEFINITIONS)[number];
export type FeatureFlagKey = FeatureFlagDefinition['key'];

export type FeatureFlagValue = {
  enabled?: boolean;
  disabledMessage?: string;
  reason?: string;
};

export type NormalizedFeatureFlag = {
  enabled: boolean;
  disabledMessage: string;
  reason: string;
};

const FEATURE_FLAG_KEY_SET = new Set<string>(FEATURE_FLAG_DEFINITIONS.map((definition) => definition.key));

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return FEATURE_FLAG_KEY_SET.has(value);
}

export function getFeatureFlagDefinition(key: FeatureFlagKey) {
  return FEATURE_FLAG_DEFINITIONS.find((definition) => definition.key === key)!;
}

export function normalizeFeatureFlagValue(value: unknown, fallbackEnabled = true): NormalizedFeatureFlag {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      enabled: fallbackEnabled,
      disabledMessage: 'This feature is temporarily unavailable while the game team completes maintenance.',
      reason: '',
    };
  }

  const record = value as FeatureFlagValue;
  const disabledMessage = typeof record.disabledMessage === 'string' && record.disabledMessage.trim().length > 0
    ? record.disabledMessage.trim().slice(0, 240)
    : 'This feature is temporarily unavailable while the game team completes maintenance.';
  const reason = typeof record.reason === 'string' ? record.reason.trim().slice(0, 240) : '';

  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : fallbackEnabled,
    disabledMessage,
    reason,
  };
}

export function buildFeatureFlagValue(enabled: boolean, disabledMessage?: string, reason?: string): NormalizedFeatureFlag {
  return normalizeFeatureFlagValue({ enabled, disabledMessage, reason }, enabled);
}
