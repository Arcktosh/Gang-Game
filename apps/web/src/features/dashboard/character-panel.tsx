'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/features/ui/toast-provider';
import { formatDateOnly, formatDateTime } from '@/lib/format';

const NOTIFICATION_CATEGORIES = [
  'system',
  'combat',
  'economy',
  'contract',
  'faction',
  'travel',
  'crew',
  'crafting',
  'market',
  'season',
  'admin',
] as const;
const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const DASHBOARD_SECTIONS = [
  { id: 'dashboard-overview', label: 'Overview', icon: '▣' },
  { id: 'dashboard-actions', label: 'Actions', icon: '▤' },
  { id: 'dashboard-messages', label: 'Messages', icon: '✉' },
  { id: 'dashboard-activity', label: 'Activity', icon: '◫' },
  { id: 'dashboard-economy', label: 'Economy', icon: '↕' },
  { id: 'dashboard-progression', label: 'Progression', icon: '◉' },
  { id: 'dashboard-crew', label: 'Crew', icon: '⬢' },
  { id: 'dashboard-news', label: 'News', icon: '◇' },
] as const;

type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]['id'];

type Character = {
  id: string;
  name: string;
  status: string;
  location: string;
  cash: number;
  bank: number;
  level: number;
  experience: number;
  health: number;
  energy: number;
  maxEnergy: number;
  nerve: number;
  maxNerve: number;
  heat: number;
  legalReputation?: number;
  gamblingReputation?: number;
  statusUntil?: string | Date | null;
  statusReason?: string | null;
  prestigeLevel?: number;
  legacyPoints?: number;
  seasonPoints?: number;
  intelligence: number;
  labour: number;
  endurance: number;
  strength: number;
  stamina: number;
  defense: number;
  dexterity: number;
};

type Job = {
  key: string;
  name: string;
  description: string;
  energyCost: number;
  baseWage: number;
  requiredLabour: number;
  requiredIntelligence: number;
};
type Crime = {
  key: string;
  name: string;
  description: string;
  requiredLevel: number;
  requiredNerve: number;
  minReward: number;
  maxReward: number;
  heatGain: number;
  difficulty: number;
  cooldownSeconds: number;
};
type Route = {
  id: string;
  fromLocation: string;
  toLocation: string;
  cost: number;
  durationSeconds: number;
  risk: number;
};
type TrainingActivity = {
  key: string;
  name: string;
  description: string;
  stat: string;
  energyCost: number;
  cashCost: number;
  statGain: number;
  durationSeconds: number;
};
type Course = {
  key: string;
  name: string;
  description: string;
  stat: string;
  energyCost: number;
  cashCost: number;
  statGain: number;
  durationSeconds: number;
  requiredLevel?: number;
  prerequisiteCourseKey?: string | null;
};
type MarketItem = {
  itemKey: string;
  price: number;
  supply: number;
  demand: number;
  item: { key: string; name: string; category: string; description: string; isIllegal: boolean };
};
type InventoryItem = { id: string; itemKey: string; quantity: number };
type StatusDetail = {
  hospitalStay?: {
    reason: string;
    severity: number;
    bill: number;
    releasedAt: string | Date;
  } | null;
  jailSentence?: {
    reason: string;
    severity: number;
    fine: number;
    releaseAt: string | Date;
  } | null;
  blockedUntil?: string | Date | null;
  reason?: string | null;
} | null;

type FactionSummary = {
  id: string;
  name: string;
  tag: string;
  description: string;
  bank: number;
  reputation: number;
  power?: number;
  memberCount?: number;
};

type OwnFaction = {
  membership: {
    factionId: string;
    characterId: string;
    role: string;
    status: string;
    contributionPoints?: number;
  };
  faction: FactionSummary | null;
  members: { characterId: string; role: string; status: string; contributionPoints?: number }[];
  ledger: {
    id: string;
    entryType: string;
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: string | Date;
  }[];
  controlledTerritories: Territory[];
} | null;

type Territory = {
  key: string;
  name: string;
  location: string;
  description: string;
  incomePerTick: number;
  defenseRating: number;
  heatModifier: number;
  controlledByFactionId?: string | null;
  controlScore: number;
  contestedUntil?: string | Date | null;
};

type ShopSummary = {
  id: string;
  ownerCharacterId: string;
  name: string;
  description?: string;
  location: string;
  reputation: number;
  isOpen?: boolean;
  advertisingUntil?: string | Date | null;
  isAdvertising?: boolean;
  averageRating?: number | null;
  activeListingCount?: number;
};

type ShopDetail = {
  shop: ShopSummary;
  listings: {
    id: string;
    itemKey: string;
    quantity: number;
    soldQuantity: number;
    priceEach: number;
    status: string;
    itemName: string;
  }[];
  ledger: { id: string; description: string; amount: number; createdAt: string | Date }[];
  reviews?: {
    id: string;
    rating: number;
    body: string;
    createdAt: string | Date;
    reviewer?: { name: string } | null;
  }[];
  activeAds?: { id: string; spend: number; endsAt: string | Date }[];
};

type ShopListing = {
  listingId: string;
  shopId: string;
  shopName: string;
  ownerCharacterId: string;
  itemKey: string;
  itemName: string;
  itemCategory: string;
  quantity: number;
  soldQuantity: number;
  priceEach: number;
  reputation: number;
  location: string;
};

type NewspaperArticle = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  body: string;
  location?: string | null;
  createdAt: string | Date;
  author?: { id: string; name: string } | null;
  comments?: {
    id: string;
    body: string;
    createdAt: string | Date;
    author?: { id: string; name: string } | null;
  }[];
  reactionCounts?: Record<string, number>;
  myReactions?: string[];
  myReports?: { id: string; status: string; createdAt: string | Date }[];
};

type SystemAnnouncement = {
  id: string;
  title: string;
  body: string;
  severity: string;
  startsAt: string | Date;
};

type FinanceMarketEntry = {
  asset: {
    key: string;
    assetType: string;
    symbol: string;
    name: string;
    sector: string;
    volatility: number;
    description: string;
  };
  price: number;
  volume: number;
  sentiment: number;
  pricedAt: string | Date;
};

type PortfolioPosition = {
  id: string;
  assetKey: string;
  quantity: number;
  averageCost: number;
  realizedProfit: number;
  currentPrice: number;
  marketValue: number;
  unrealizedProfit: number;
  asset?: { key: string; symbol: string; name: string; assetType: string } | null;
};

type FinanceHistoryPoint = {
  id: string;
  price: number;
  volume: number;
  sentiment: number;
  createdAt: string | Date;
};

type FinanceHistorySnapshot = {
  status: 'loading' | 'loaded' | 'error';
  prices: FinanceHistoryPoint[];
  message?: string;
};

type BankTransaction = {
  id: string;
  amount: string | number;
  description: string;
  metadata?: {
    action?: string;
    cashBefore?: number;
    cashAfter?: number;
    bankBefore?: number;
    bankAfter?: number;
  } | null;
  createdAt: string | Date;
};

type BankStatementSummary = {
  action: string;
  limit: number;
  offset: number;
  returned: number;
  hasMore: boolean;
  inflow: number;
  outflow: number;
  netAmount: number;
  openingBank?: number;
  closingBank?: number;
  currentBank: number;
};

type BankStatementSnapshot = {
  transactions: BankTransaction[];
  summary: BankStatementSummary;
};

type MoneySink = {
  key: string;
  name: string;
  category: string;
  description: string;
  cost: number;
  durationHours: number;
  benefit: string;
};

type LoanOffer = {
  key: string;
  name: string;
  description: string;
  principal: number;
  fee: number;
  totalDue: number;
  dueHours: number;
  minimumLevel: number;
};

type CharacterLoan = {
  id: string;
  offerKey: string;
  principal: number;
  fee: number;
  totalDue: number;
  repaidAmount: number;
  outstanding: number;
  status: string;
  lifecycleStatus?: string;
  dueAt: string | Date;
  defaultAt?: string | Date | null;
  repaidAt?: string | Date | null;
  isOverdue?: boolean;
  isDefaulted?: boolean;
  hoursPastDue?: number;
  createdAt: string | Date;
};

type LoanProfile = {
  offers: LoanOffer[];
  loans: CharacterLoan[];
  activeLoan?: CharacterLoan | null;
} | null;

type GamblingGame = {
  key: string;
  name: string;
  description: string;
  minWager: number;
  maxWager: number;
  houseEdgeBasisPoints: number;
  variance: number;
};

type GamblingWager = {
  id: string;
  gameKey: string;
  wager: number;
  outcome: string;
  payout: number;
  profit: number;
  roll: number;
  metadata?: { label?: string } | null;
  createdAt: string | Date;
};

type GamblingSummary = {
  reputation: number;
  tableLimit: number;
  totals: { wagered: number; profit: number; count: number };
  recent: GamblingWager[];
} | null;

type ContractSummary = {
  id: string;
  createdByCharacterId: string;
  assignedToCharacterId?: string | null;
  contractType: string;
  status: string;
  title: string;
  description: string;
  originLocation?: string | null;
  targetLocation?: string | null;
  itemKey?: string | null;
  itemName?: string | null;
  quantity: number;
  reward: number;
  risk: number;
  expiresAt?: string | Date | null;
  createdAt: string | Date;
};

type ContractsSummary = {
  openContracts: ContractSummary[];
  mine: ContractSummary[];
} | null;

type ProgressionProfile = {
  characterId: string;
  activeTitle?: { id: string; titleKey: string; title: string; isActive: boolean } | null;
  titles: { id: string; titleKey: string; title: string; isActive: boolean }[];
  summary: {
    achievementPoints: number;
    objectivePoints: number;
    profileScore: number;
    completedAchievements: number;
    totalAchievements: number;
    claimableAchievements: number;
    claimableObjectives: number;
  };
  achievements: {
    progress: {
      achievementKey: string;
      progress: number;
      target: number;
      isCompleted: boolean;
      claimedAt?: string | Date | null;
    };
    definition: {
      key: string;
      title: string;
      description: string;
      category: string;
      points: number;
      cashReward: number;
      experienceReward: number;
      titleRewardName?: string | null;
    };
  }[];
  objectives: {
    objective: {
      id: string;
      cadence: string;
      progress: number;
      target: number;
      status: string;
      periodEnd: string | Date;
      claimedAt?: string | Date | null;
    };
    definition: {
      key: string;
      title: string;
      description: string;
      rewardCash: number;
      rewardExperience: number;
      rewardPoints: number;
    };
  }[];
} | null;

type SeasonProfile = {
  character: Character;
  season: {
    id: string;
    key: string;
    title: string;
    description: string;
    startsAt: string | Date;
    endsAt: string | Date;
  } | null;
  progress: { seasonPoints: number; highestClaimedTier: number; bestRank?: number | null } | null;
  rewards: {
    id: string;
    tier: number;
    pointsRequired: number;
    title: string;
    description: string;
    rewardCash: number;
    rewardExperience: number;
    rewardLegacyPoints: number;
    titleRewardName?: string | null;
  }[];
  rankBand: string;
  prestigeReadiness: {
    requiredLevel: number;
    requiredProfileScore: number;
    requiredNetWorth: number;
    netWorth: number;
    ready: boolean;
  };
  legacyRecords: {
    id: string;
    prestigeLevel: number;
    legacyPointsAwarded: number;
    retiredLevel: number;
    profileScore: number;
    createdAt: string | Date;
  }[];
  legacyPerks: { id: string; perkKey: string; tier: number; source: string }[];
} | null;

type AssetOrder = {
  id: string;
  assetKey: string;
  side: string;
  quantity: number;
  priceEach: number;
  fee: number;
  netAmount: number;
  createdAt: string | Date;
};

type VehicleProfile = {
  vehicles: {
    id: string;
    itemKey: string;
    itemName: string;
    durability: number;
    maxDurability: number;
    stats: Record<string, number>;
    installedUpgrades: { id: string; upgradeKey: string; name: string; upgradeType: string }[];
  }[];
  upgrades: {
    key: string;
    name: string;
    upgradeType: string;
    description: string;
    cashCost: number;
    requiredLevel: number;
    statModifiers: Record<string, number>;
  }[];
} | null;

type EquipmentProfile = {
  equipped: {
    id: string;
    itemKey: string;
    slot: string;
    durability: number;
    maxDurability: number;
    repairCost: number;
    itemName: string;
    itemCategory: string;
    modifiers: Record<string, number>;
  }[];
  inventoryGear: {
    inventoryItemId: string;
    itemKey: string;
    quantity: number;
    itemName: string;
    itemCategory: string;
    slot?: string | null;
    maxDurability: number;
    modifiers: Record<string, number>;
  }[];
  modifiers: Record<string, number>;
  effectiveStats: Record<string, number>;
} | null;

type CraftingProfile = {
  recipes: {
    key: string;
    name: string;
    recipeType: string;
    workshopType: string;
    description: string;
    outputItemKey: string;
    outputQuantity: number;
    requiredLevel: number;
    requiredIntelligence: number;
    requiredLabour: number;
    energyCost: number;
    cashCost: number;
    durationSeconds: number;
    risk: number;
    inputs: Record<string, number>;
    canStart: boolean;
    missingReasons: string[];
    estimatedDurationSeconds: number;
    estimatedRisk: number;
    workshopId?: string | null;
    outputItem?: { name: string } | null;
  }[];
  workshops: {
    id: string;
    workshopType: string;
    name: string;
    level: number;
    condition: number;
    storageCapacity: number;
    isHidden: boolean;
  }[];
  jobs: {
    id: string;
    recipeKey: string;
    status: string;
    outputItemKey: string;
    outputQuantity: number;
    riskScore: number;
    completesAt: string | Date;
    completedAt?: string | Date | null;
    recipe?: { name: string } | null;
    outputItem?: { name: string } | null;
    workshop?: { name: string } | null;
  }[];
} | null;

type ContactsProfile = {
  recruitable: {
    key: string;
    name: string;
    specialty: string;
    description: string;
    minLevel: number;
    baseLoyalty: number;
    recruitCost: number;
    upkeep: number;
    owned: boolean;
    canRecruit: boolean;
  }[];
  contacts: {
    id: string;
    contactKey: string;
    nickname?: string | null;
    specialty: string;
    level: number;
    experience: number;
    loyalty: number;
    upkeep: number;
    status: string;
    statusUntil?: string | Date | null;
    definition?: { name: string } | null;
  }[];
  assignments: {
    id: string;
    contactId: string;
    assignmentType: string;
    status: string;
    riskScore: number;
    rewardCash: number;
    rewardExperience: number;
    loyaltyDelta: number;
    completesAt: string | Date;
    completedAt?: string | Date | null;
    contact?: { nickname?: string | null; definition?: { name: string } | null } | null;
  }[];
  assignmentTypes: string[];
} | null;

type NotificationItem = {
  id: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  readAt?: string | Date | null;
  archivedAt?: string | Date | null;
  createdAt: string | Date;
};

type ActivityFeedEntry = {
  id: string;
  scope: string;
  category: string;
  title: string;
  body: string;
  createdAt: string | Date;
};

type NotificationCenter = {
  unreadCount: number;
  highPriorityCount: number;
  recent: NotificationItem[];
  unread: NotificationItem[];
  feed: ActivityFeedEntry[];
  preferences?: {
    mutedCategories: string[];
    digestEnabled: boolean;
    digestFrequencyMinutes: number;
  };
  filters?: { category: string; priority: string; unreadOnly: boolean };
  digests: {
    id: string;
    notificationCount: number;
    unreadCount: number;
    summary: string;
    createdAt: string | Date;
  }[];
} | null;

type NotificationLiveSnapshot = {
  characterId?: string | null;
  unreadCount: number;
  highPriorityCount: number;
  latestNotification?: NotificationItem | null;
  latestUnread?: NotificationItem | null;
  latestActivity?: ActivityFeedEntry | null;
  checkedAt: string;
} | null;

type MessageLiveSnapshot = {
  characterId: string;
  unreadTotal: number;
  threadCount: number;
  blockedCount: number;
  blockedByCount: number;
  latestThread?: {
    threadId: string;
    title: string;
    unreadCount: number;
    muted: boolean;
    memberCount: number;
    latestMessage?: {
      id: string;
      senderCharacterId: string;
      senderName: string;
      body: string;
      createdAt: string | Date;
    } | null;
  } | null;
  latestIncoming?: {
    threadId: string;
    title: string;
    unreadCount: number;
    muted: boolean;
    memberCount: number;
    latestMessage?: {
      id: string;
      senderCharacterId: string;
      senderName: string;
      body: string;
      createdAt: string | Date;
    } | null;
  } | null;
  threads: {
    threadId: string;
    title: string;
    unreadCount: number;
    muted: boolean;
    memberCount: number;
    latestMessage?: {
      id: string;
      senderCharacterId: string;
      senderName: string;
      body: string;
      createdAt: string | Date;
    } | null;
  }[];
  checkedAt: string;
} | null;

type MessageCenter = {
  unreadTotal: number;
  blockedByCount: number;
  threads: {
    membership: {
      threadId: string;
      characterId: string;
      lastReadAt?: string | Date | null;
      mutedAt?: string | Date | null;
      leftAt?: string | Date | null;
    };
    thread: { id: string; type: string; title?: string | null; createdAt: string | Date } | null;
    members: { id: string; name: string; level: number; status: string }[];
    recentMessages: {
      id: string;
      threadId: string;
      senderCharacterId: string;
      senderName: string;
      body: string;
      createdAt: string | Date;
    }[];
    unreadCount: number;
  }[];
  blocked: { id: string; name: string; reason: string; createdAt: string | Date }[];
  possibleRecipients: { id: string; name: string; level: number; location: string }[];
  reports: {
    id: string;
    messageId: string;
    reason: string;
    status: string;
    createdAt: string | Date;
  }[];
} | null;

type SafetyProfile = {
  activeEnforcements: {
    id: string;
    actionType: string;
    reason: string;
    severity: number;
    endsAt?: string | Date | null;
    createdAt: string | Date;
  }[];
  appeals: {
    id: string;
    enforcementId: string;
    body: string;
    status: string;
    resolutionNote?: string | null;
    createdAt: string | Date;
    reviewedAt?: string | Date | null;
  }[];
  notes: { id: string; note: string; severity: string; createdAt: string | Date }[];
} | null;

type PvpProfile = {
  character: Character;
  possibleTargets: {
    id: string;
    name: string;
    level: number;
    location: string;
    status: string;
    health: number;
    cash: number;
  }[];
  activeBounties: {
    id: string;
    createdByCharacterId: string;
    targetCharacterId: string;
    claimedByCharacterId?: string | null;
    status: string;
    reward: number;
    reason: string;
    expiresAt?: string | Date | null;
    createdAt: string | Date;
  }[];
  recentCombat: {
    id: string;
    attackerCharacterId: string;
    defenderCharacterId: string;
    outcome: string;
    attackerPower: number;
    defenderPower: number;
    damageToAttacker: number;
    damageToDefender: number;
    cashStolen: number;
    experienceAwarded: number;
    createdAt: string | Date;
  }[];
  activeWars: {
    id: string;
    attackerFactionId: string;
    defenderFactionId: string;
    territoryKey?: string | null;
    status: string;
    attackerScore: number;
    defenderScore: number;
    endsAt?: string | Date | null;
    createdAt: string | Date;
  }[];
} | null;

type ActionLock = { actionType: string; lockedUntil: string | Date; metadata?: unknown };

type CharacterProgressionHistory = {
  training: {
    id: string;
    activityKey: string;
    status: string;
    stat: string;
    statGain: number;
    dueAt?: string | Date | null;
    completedAt?: string | Date | null;
    startedAt: string | Date;
  }[];
  courses: {
    id: string;
    courseKey: string;
    status: string;
    stat: string;
    statGain: number;
    dueAt?: string | Date | null;
    completedAt?: string | Date | null;
    startedAt: string | Date;
  }[];
  queue: {
    activeTraining: number;
    activeCourses: number;
    overdueCompletions: number;
    nextDueAt?: string | Date | null;
  };
};

type CharacterPanelProps = {
  characters: Character[];
  jobs: Job[];
  crimes: Crime[];
  routes: Route[];
  trainingActivities: TrainingActivity[];
  courses: Course[];
  market: MarketItem[];
  inventory: InventoryItem[];
  statusDetail: StatusDetail;
  factions: FactionSummary[];
  ownFaction: OwnFaction;
  territories: Territory[];
  shops: ShopSummary[];
  ownShops: ShopDetail[];
  shopListings: ShopListing[];
  articles: NewspaperArticle[];
  announcements: SystemAnnouncement[];
  financeMarket: FinanceMarketEntry[];
  portfolio: PortfolioPosition[];
  assetOrders: AssetOrder[];
  bankTransactions: BankTransaction[];
  loanProfile: LoanProfile;
  gamblingGames: GamblingGame[];
  moneySinks: MoneySink[];
  gamblingSummary: GamblingSummary;
  contracts: ContractsSummary;
  progressionProfile: ProgressionProfile;
  seasonProfile: SeasonProfile;
  pvpProfile: PvpProfile;
  equipmentProfile: EquipmentProfile;
  vehicleProfile: VehicleProfile;
  craftingProfile: CraftingProfile;
  contactsProfile: ContactsProfile;
  notificationCenter: NotificationCenter;
  messageCenter: MessageCenter;
  safetyProfile: SafetyProfile;
  actionLocks?: ActionLock[];
  characterProgression: CharacterProgressionHistory;
};


function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatSignedMoney(amount: string | number) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return '$0';
  }

  return `${numericAmount >= 0 ? '+' : '-'}$${Math.abs(numericAmount).toFixed(0)}`;
}

function buildSparklinePoints(prices: FinanceHistoryPoint[], width = 180, height = 48) {
  if (prices.length === 0) {
    return '';
  }

  if (prices.length === 1) {
    return `0,${height / 2} ${width},${height / 2}`;
  }

  const values = prices.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return prices
    .map((point, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((point.price - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'Action failed.');
  }

  return result;
}

async function getJson(path: string) {
  const response = await fetch(path);
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'Request failed.');
  }

  return result;
}

export function CharacterPanel({
  characters,
  jobs,
  crimes,
  routes,
  trainingActivities,
  courses,
  market,
  inventory,
  statusDetail,
  factions,
  ownFaction,
  territories,
  shops,
  ownShops,
  shopListings,
  articles,
  announcements,
  financeMarket,
  portfolio,
  assetOrders,
  bankTransactions,
  loanProfile,
  gamblingGames,
  moneySinks,
  gamblingSummary,
  contracts,
  progressionProfile,
  seasonProfile,
  pvpProfile,
  equipmentProfile,
  vehicleProfile,
  craftingProfile,
  contactsProfile,
  notificationCenter,
  messageCenter,
  safetyProfile,
  actionLocks = [],
  characterProgression,
}: CharacterPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankStatement, setBankStatement] = useState<BankStatementSnapshot | null>(null);
  const [bankStatementStatus, setBankStatementStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [bankStatementError, setBankStatementError] = useState('');
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const [financeHistories, setFinanceHistories] = useState<Record<string, FinanceHistorySnapshot>>({});
  const [liveNotifications, setLiveNotifications] = useState<NotificationLiveSnapshot>(null);
  const [liveNotificationStatus, setLiveNotificationStatus] = useState<
    'connecting' | 'connected' | 'closed' | 'error'
  >('closed');
  const [liveMessages, setLiveMessages] = useState<MessageLiveSnapshot>(null);
  const [liveMessageStatus, setLiveMessageStatus] = useState<
    'connecting' | 'connected' | 'closed' | 'error'
  >('closed');
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<
    'default' | 'denied' | 'granted' | 'unsupported'
  >('unsupported');
  const [notificationCategoryFilter, setNotificationCategoryFilter] = useState('all');
  const [notificationPriorityFilter, setNotificationPriorityFilter] = useState('all');
  const [notificationUnreadOnly, setNotificationUnreadOnly] = useState(false);
  const [activeDashboardSection, setActiveDashboardSection] =
    useState<DashboardSectionId>('dashboard-overview');
  const dashboardSectionIds = useMemo(
    () => new Set<DashboardSectionId>(DASHBOARD_SECTIONS.map((section) => section.id)),
    [],
  );
  const dashboardSectionLabel =
    DASHBOARD_SECTIONS.find((section) => section.id === activeDashboardSection)?.label ??
    'Overview';
  const lastToastNotificationIdRef = useRef<string | null>(null);
  const lastIncomingMessageIdRef = useRef<string | null>(null);
  const activeCharacter = characters[0];
  const displayedBankTransactions = bankStatement?.transactions ?? bankTransactions;
  const bankStatementSummary = bankStatement?.summary;
  const bankStatementCsvUrl = activeCharacter
    ? `/api/bank/history?characterId=${encodeURIComponent(activeCharacter.id)}&format=csv&limit=100`
    : '#';
  const financeHistoryAssetKeys = useMemo(
    () => financeMarket.slice(0, 10).map((entry) => entry.asset.key),
    [financeMarket],
  );
  const financeHistoryKey = financeHistoryAssetKeys.join('|');

  useEffect(() => {
    if (!activeCharacter?.id) {
      setLiveNotifications(null);
      setLiveNotificationStatus('closed');
      return;
    }

    setLiveNotificationStatus('connecting');
    const source = new EventSource(`/api/notifications/stream?characterId=${activeCharacter.id}`);

    source.addEventListener('notification.snapshot', (event) => {
      const snapshot = JSON.parse((event as MessageEvent).data) as NotificationLiveSnapshot;
      setLiveNotifications(snapshot);
      setLiveNotificationStatus('connected');

      const latestUnread = snapshot?.latestUnread;
      const shouldSendBrowserAlert =
        latestUnread &&
        latestUnread.priority === 'urgent' &&
        latestUnread.id !== lastToastNotificationIdRef.current;

      if (shouldSendBrowserAlert) {
        lastToastNotificationIdRef.current = latestUnread.id;

        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(latestUnread.title, { body: latestUnread.body });
        }
      }
    });

    source.addEventListener('notification.heartbeat', () => {
      setLiveNotificationStatus('connected');
    });

    source.onerror = () => {
      setLiveNotificationStatus('error');
    };

    return () => {
      source.close();
      setLiveNotificationStatus('closed');
    };
  }, [activeCharacter?.id, toast]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserNotificationPermission('unsupported');
      return;
    }

    setBrowserNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!actionLocks.length) {
      return;
    }

    const interval = window.setInterval(() => setCooldownNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [actionLocks.length]);

  useEffect(() => {
    const assetKeys = financeHistoryKey.split('|').filter(Boolean);

    if (assetKeys.length === 0) {
      setFinanceHistories((current) => (Object.keys(current).length === 0 ? current : {}));
      return;
    }

    if (activeDashboardSection !== 'dashboard-economy') {
      return;
    }

    const missingAssetKeys = assetKeys.filter((assetKey) => !financeHistories[assetKey]);

    if (missingAssetKeys.length === 0) {
      return;
    }

    let cancelled = false;

    setFinanceHistories((current) => {
      const next = { ...current };
      for (const assetKey of missingAssetKeys) {
        next[assetKey] = { status: 'loading', prices: [] };
      }
      return next;
    });

    void Promise.all(
      missingAssetKeys.map(async (assetKey) => {
        try {
          const response = await fetch(
            `/api/finance/history?assetKey=${encodeURIComponent(assetKey)}&limit=24`,
          );
          const body = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(body?.error?.message ?? `Could not load ${assetKey} history.`);
          }

          return [assetKey, { status: 'loaded', prices: body?.data?.prices ?? [] }] as const;
        } catch (caught) {
          return [
            assetKey,
            {
              status: 'error',
              prices: [],
              message: caught instanceof Error ? caught.message : 'Could not load price history.',
            },
          ] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      setFinanceHistories((current) => {
        const next = { ...current };
        for (const [assetKey, snapshot] of entries) {
          next[assetKey] = snapshot as FinanceHistorySnapshot;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeDashboardSection, financeHistories, financeHistoryKey]);

  useEffect(() => {
    if (!activeCharacter?.id) {
      setLiveMessages(null);
      setLiveMessageStatus('closed');
      return;
    }

    setLiveMessageStatus('connecting');
    const source = new EventSource(`/api/messages/stream?characterId=${activeCharacter.id}`);

    source.addEventListener('message.snapshot', (event) => {
      const snapshot = JSON.parse((event as MessageEvent).data) as MessageLiveSnapshot;
      setLiveMessages(snapshot);
      setLiveMessageStatus('connected');

      const latestIncoming = snapshot?.latestIncoming?.latestMessage;
      if (latestIncoming && latestIncoming.id !== lastIncomingMessageIdRef.current) {
        lastIncomingMessageIdRef.current = latestIncoming.id;
      }
    });

    source.addEventListener('message.heartbeat', () => {
      setLiveMessageStatus('connected');
    });

    source.onerror = () => {
      setLiveMessageStatus('error');
    };

    return () => {
      source.close();
      setLiveMessageStatus('closed');
    };
  }, [activeCharacter?.id, toast]);

  useEffect(() => {
    function resolveDashboardSectionFromHash() {
      const hash = window.location.hash.replace('#', '');
      const nextSection = dashboardSectionIds.has(hash as DashboardSectionId)
        ? (hash as DashboardSectionId)
        : 'dashboard-overview';
      setActiveDashboardSection((current) => (current === nextSection ? current : nextSection));
    }

    resolveDashboardSectionFromHash();
    window.addEventListener('hashchange', resolveDashboardSectionFromHash);

    return () => window.removeEventListener('hashchange', resolveDashboardSectionFromHash);
  }, [dashboardSectionIds]);

  async function handleEnableBrowserAlerts() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserNotificationPermission(permission);
  }

  async function handleCreateCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '');

    try {
      await postJson('/api/characters', { name });
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not create character.');
      setIsSubmitting(false);
    }
  }

  async function handleLoadBankStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeCharacter) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams({
      characterId: activeCharacter.id,
      action: String(formData.get('action') ?? 'all'),
      limit: String(formData.get('limit') ?? '25'),
    });
    const from = String(formData.get('from') ?? '').trim();
    const to = String(formData.get('to') ?? '').trim();

    if (from) {
      params.set('from', new Date(`${from}T00:00:00.000Z`).toISOString());
    }

    if (to) {
      params.set('to', new Date(`${to}T23:59:59.999Z`).toISOString());
    }

    setBankStatementStatus('loading');
    setBankStatementError('');

    try {
      const result = await getJson(`/api/bank/history?${params.toString()}`);
      setBankStatement(result.data as BankStatementSnapshot);
      setBankStatementStatus('loaded');
    } catch (caught) {
      setBankStatementStatus('error');
      setBankStatementError(caught instanceof Error ? caught.message : 'Could not load bank statement.');
    }
  }

  async function handleBankTransfer(event: FormEvent<HTMLFormElement>, action: 'deposit' | 'withdraw') {
    event.preventDefault();

    if (!activeCharacter) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get('amount') ?? 0);

    setIsSubmitting(true);

    try {
      await postJson('/api/bank', { characterId: activeCharacter.id, action, amount });
      toast.success(action === 'deposit' ? `Deposited $${amount}.` : `Withdrew $${amount}.`);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Bank transfer failed.');
    } finally {
      setIsSubmitting(false);
    }
  }


  async function handleMoneySinkPurchase(sinkKey: string, paymentSource: 'cash' | 'bank') {
    const sink = moneySinks.find((item) => item.key === sinkKey);
    await runAction(
      '/api/economy/sinks',
      { characterId: activeCharacter.id, sinkKey, paymentSource },
      sink ? `Purchased ${sink.name}.` : 'Money sink purchased.',
    );
  }

  async function handleLoanRequest(offerKey: string) {
    const offer = loanProfile?.offers.find((item) => item.key === offerKey);
    await runAction(
      '/api/economy/loans',
      { action: 'request', characterId: activeCharacter.id, offerKey },
      offer ? `Loan funded: ${offer.name}.` : 'Loan funded.',
    );
  }

  async function handleLoanRepayment(
    event: FormEvent<HTMLFormElement>,
    loanId: string,
    outstanding: number,
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const amount = Math.max(1, Math.floor(Number(formData.get('amount') ?? outstanding)));

    await runAction(
      '/api/economy/loans',
      { action: 'repay', characterId: activeCharacter.id, loanId, amount },
      amount >= outstanding ? 'Loan repaid.' : `Paid $${amount} toward loan.`,
    );
  }

  async function handleCreateFaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '');
    const tag = String(formData.get('tag') ?? '').toUpperCase();
    const description = String(formData.get('description') ?? '');

    try {
      await postJson('/api/factions', { characterId: activeCharacter?.id, name, tag, description });
      toast.success(`Created faction ${name}.`);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not create faction.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cooldownMessage = actionCooldownMessage('shop_create');
    if (cooldownMessage) {
      toast.warning(cooldownMessage, 'Action unavailable');
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '');
    const description = String(formData.get('description') ?? '');

    try {
      await postJson('/api/shops', { characterId: activeCharacter?.id, name, description });
      toast.success(`Opened shop ${name}.`);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not open shop.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cooldownMessage = actionCooldownMessage('contract_create');
    if (cooldownMessage) {
      toast.warning(cooldownMessage, 'Action unavailable');
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '');
    const description = String(formData.get('description') ?? '');
    const contractType = String(formData.get('contractType') ?? 'delivery');
    const targetLocationValue = String(formData.get('targetLocation') ?? '').trim();
    const itemKeyValue = String(formData.get('itemKey') ?? '').trim();
    const quantity = Number(formData.get('quantity') ?? 0);
    const reward = Number(formData.get('reward') ?? 0);

    try {
      await postJson('/api/contracts', {
        characterId: activeCharacter?.id,
        contractType,
        title,
        description,
        targetLocation: targetLocationValue || undefined,
        itemKey: itemKeyValue || undefined,
        quantity,
        reward,
        expiresInHours: 24,
      });
      toast.success(`Posted contract ${title}.`);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not post contract.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeclareWar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cooldownMessage = actionCooldownMessage('faction_action');
    if (cooldownMessage) {
      toast.warning(cooldownMessage, 'Action unavailable');
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const defenderFactionId = String(formData.get('defenderFactionId') ?? '');
    const territoryKeyValue = String(formData.get('territoryKey') ?? '').trim();

    try {
      await postJson('/api/faction-wars', {
        characterId: activeCharacter?.id,
        defenderFactionId,
        territoryKey: territoryKeyValue || undefined,
      });
      toast.success('Declared faction war.');
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not declare war.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateBounty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cooldownMessage = actionCooldownMessage('bounty_create');
    if (cooldownMessage) {
      toast.warning(cooldownMessage, 'Action unavailable');
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const targetCharacterId = String(formData.get('targetCharacterId') ?? '');
    const reward = Number(formData.get('reward') ?? 0);
    const reason = String(formData.get('reason') ?? '');

    try {
      await postJson('/api/bounties', {
        characterId: activeCharacter?.id,
        targetCharacterId,
        reward,
        reason,
      });
      toast.success('Posted bounty.');
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not post bounty.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const recipientCharacterId = String(formData.get('recipientCharacterId') ?? '');
    const body = String(formData.get('body') ?? '');
    await runAction(
      '/api/messages',
      { action: 'send', senderCharacterId: activeCharacter.id, recipientCharacterId, body },
      'Message sent.',
    );
    form.reset();
  }

  async function handleSubmitAppeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const enforcementId = String(formData.get('enforcementId') ?? '');
    const body = String(formData.get('body') ?? '');
    await runAction(
      '/api/enforcements/appeals',
      { characterId: activeCharacter.id, enforcementId, body },
      'Appeal submitted.',
    );
    form.reset();
  }

  async function handleReplyMessage(event: FormEvent<HTMLFormElement>, threadId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = String(formData.get('body') ?? '');
    await runAction(
      '/api/messages',
      { action: 'send', senderCharacterId: activeCharacter.id, threadId, body },
      'Reply sent.',
    );
    form.reset();
  }

  async function handleBuildWorkshop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await runAction(
      '/api/crafting',
      {
        action: 'build_workshop',
        characterId: activeCharacter.id,
        workshopType: String(formData.get('workshopType')),
        name: String(formData.get('name') || ''),
      },
      'Workshop built.',
    );
    form.reset();
  }

  async function handleSubmitArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '');
    const body = String(formData.get('body') ?? '');

    try {
      await postJson('/api/newspaper', {
        action: 'submit_article',
        characterId: activeCharacter?.id,
        title,
        body,
        category: 'player_blog',
      });
      toast.success('Submitted newspaper article.');
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not submit article.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCommentArticle(event: FormEvent<HTMLFormElement>, articleId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = String(formData.get('body') ?? '');
    await runAction(
      '/api/newspaper',
      { action: 'comment', characterId: activeCharacter.id, articleId, body },
      'Comment posted.',
    );
    form.reset();
  }

  async function handleReactArticle(articleId: string, reactionType: string) {
    await runAction(
      '/api/newspaper',
      { action: 'react', characterId: activeCharacter.id, articleId, reactionType },
      'Article reaction updated.',
    );
  }

  async function handleReportArticle(articleId: string) {
    await runAction(
      '/api/newspaper',
      {
        action: 'report',
        characterId: activeCharacter.id,
        articleId,
        reason: 'Player requested moderation review.',
      },
      'Article reported for moderation review.',
    );
  }

  async function handleNotificationPreferenceUpdate(next: {
    mutedCategories?: string[];
    digestEnabled?: boolean;
    digestFrequencyMinutes?: number;
  }) {
    const current = notificationCenter?.preferences ?? {
      mutedCategories: [],
      digestEnabled: true,
      digestFrequencyMinutes: 1440,
    };
    await runAction(
      '/api/notifications',
      {
        action: 'preferences',
        mutedCategories: next.mutedCategories ?? current.mutedCategories,
        digestEnabled: next.digestEnabled ?? current.digestEnabled,
        digestFrequencyMinutes: next.digestFrequencyMinutes ?? current.digestFrequencyMinutes,
      },
      'Notification preferences updated.',
    );
  }

  async function handleToggleMutedNotificationCategory(category: string) {
    const current = notificationCenter?.preferences?.mutedCategories ?? [];
    const mutedCategories = current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category];
    await handleNotificationPreferenceUpdate({ mutedCategories });
  }

  function inferCooldownAction(path: string, body: Record<string, unknown>) {
    if (path === '/api/jobs') return 'job';
    if (path === '/api/crimes') return 'crime';
    if (path === '/api/training') return 'training';
    if (path === '/api/education') return 'education';
    if (path === '/api/travel') return 'travel';
    if (path === '/api/legal/bribe') return 'legal_bribe';
    if (path === '/api/market') return body.action === 'sell' ? 'market_sell' : 'market_buy';
    if (path === '/api/finance') return body.side === 'sell' ? 'finance_sell' : 'finance_buy';
    if (path === '/api/gambling') return 'gambling';
    if (path === '/api/economy/sinks') return 'money_sink';
    if (path === '/api/territories/actions') return 'faction_action';
    if (path === '/api/shops') return 'shop_create';
    if (path === '/api/shops/listings') return 'shop_list';
    if (path === '/api/shops/purchase') return 'shop_purchase';
    if (path === '/api/contracts') return 'contract_create';
    if (path.includes('/api/contracts/') && path.endsWith('/accept')) return 'contract_accept';
    if (path.includes('/api/contracts/') && path.endsWith('/complete')) return 'contract_complete';
    if (path === '/api/contacts') return 'contacts';
    if (path === '/api/crafting') return 'crafting';
    if (path === '/api/vehicles') return 'vehicle_upgrade';
    if (path === '/api/equipment') return 'equipment_change';
    if (path === '/api/pvp/attack') return 'pvp_attack';
    if (path === '/api/bounties') return 'bounty_create';
    return null;
  }

  function actionLock(actionType: string | null) {
    if (!actionType) {
      return null;
    }

    const lock = actionLocks.find((item) => item.actionType === actionType) ?? null;
    if (!lock) {
      return null;
    }

    return new Date(lock.lockedUntil).getTime() > cooldownNow ? lock : null;
  }

  function actionCooldownRemaining(actionType: string | null) {
    const lock = actionLock(actionType);
    if (!lock) {
      return null;
    }

    return formatRemainingTime(new Date(lock.lockedUntil).getTime() - cooldownNow);
  }

  function hasActionCooldown(actionType: string | null) {
    return Boolean(actionLock(actionType));
  }

  function actionCooldownMessage(actionType: string | null) {
    const remaining = actionCooldownRemaining(actionType);
    return remaining ? `Cooldown: ${remaining} remaining.` : null;
  }

  function cooldownButtonLabel(actionType: string | null, label: ReactNode) {
    const remaining = actionCooldownRemaining(actionType);
    return remaining ? (
      <span className="cooldown-button-label">
        Ready in <span className="countdown-timer">{remaining}</span>
      </span>
    ) : (
      label
    );
  }

  async function runAction(path: string, body: Record<string, unknown>, message: string) {
    const actionType = inferCooldownAction(path, body);
    const cooldownMessage = actionCooldownMessage(actionType);

    if (cooldownMessage) {
      toast.warning(cooldownMessage, 'Action unavailable');
      return;
    }

    setIsSubmitting(true);

    try {
      await postJson(path, body);
      toast.success(message);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activeCharacter) {
    return (
      <section className="card">
        <h2>Create your first character</h2>
        <p>
          Your account is ready. Create a character to start working, traveling, messaging, and
          joining factions.
        </p>
        <form onSubmit={handleCreateCharacter} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <input name="name" minLength={3} maxLength={24} required placeholder="Character name" />
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating...' : 'Create character'}
          </button>
        </form>
      </section>
    );
  }

  const inventoryByKey = new Map(inventory.map((item) => [item.itemKey, item.quantity]));
  const primaryShop = ownShops[0]?.shop ?? null;
  const listableInventory = inventory.filter((item) => item.quantity > 0);
  const activeStatusUntil = statusDetail?.blockedUntil ?? activeCharacter.statusUntil ?? null;
  const isAvailable = activeCharacter.status === 'free';
  const gamblingProfit = gamblingSummary?.totals?.profit ?? 0;
  const gamblingWagerCount = gamblingSummary?.totals?.count ?? 0;
  const gamblingTableLimit = gamblingSummary?.tableLimit ?? 0;
  const completedCourseKeys = new Set(
    characterProgression.courses
      .filter((course) => course.status === 'completed')
      .map((course) => course.courseKey),
  );
  const activeTrainingQueue = characterProgression.training.filter(
    (session) => session.status === 'scheduled',
  );
  const activeCourseQueue = characterProgression.courses.filter(
    (course) => course.status === 'scheduled',
  );
  const nextProgressionDueAt = characterProgression.queue.nextDueAt;

  function getCharacterStat(stat: string) {
    switch (stat) {
      case 'strength':
      case 'stamina':
      case 'defense':
      case 'dexterity':
      case 'endurance':
      case 'intelligence':
      case 'labour':
        return activeCharacter[stat];
      default:
        return 0;
    }
  }

  function scaledTrainingEnergy(activity: TrainingActivity) {
    const currentStat = getCharacterStat(activity.stat);
    return Math.max(activity.energyCost, Math.floor(activity.energyCost + currentStat * 0.15));
  }

  function courseRequirementMessage(course: Course) {
    const requiredLevel = course.requiredLevel ?? 1;

    if (activeCharacter.level < requiredLevel) {
      return `Requires level ${requiredLevel}`;
    }

    if (course.prerequisiteCourseKey && !completedCourseKeys.has(course.prerequisiteCourseKey)) {
      return `Requires ${course.prerequisiteCourseKey}`;
    }

    return null;
  }
  const filteredNotifications = notificationCenter
    ? notificationCenter.recent.filter((item) => {
        if (notificationCategoryFilter !== 'all' && item.category !== notificationCategoryFilter)
          return false;
        if (notificationPriorityFilter !== 'all' && item.priority !== notificationPriorityFilter)
          return false;
        if (notificationUnreadOnly && item.readAt) return false;
        return true;
      })
    : [];
  const filteredUnreadNotifications = filteredNotifications.filter((item) => !item.readAt);
  const filteredActivityFeed = notificationCenter
    ? notificationCenter.feed.filter(
        (entry) =>
          notificationCategoryFilter === 'all' || entry.category === notificationCategoryFilter,
      )
    : [];
  const notificationPreferences = notificationCenter?.preferences ?? {
    mutedCategories: [],
    digestEnabled: true,
    digestFrequencyMinutes: 1440,
  };
  const isSectionActive = (sectionId: DashboardSectionId) => activeDashboardSection === sectionId;
  const actionGridVisible = [
    'dashboard-actions',
    'dashboard-economy',
    'dashboard-progression',
    'dashboard-crew',
    'dashboard-news',
  ].includes(activeDashboardSection);
  const overviewProgress = [
    {
      label: 'Health',
      value: activeCharacter.health,
      max: 100,
      meta: `${activeCharacter.health}/100`,
    },
    {
      label: 'Energy',
      value: activeCharacter.energy,
      max: activeCharacter.maxEnergy,
      meta: `${activeCharacter.energy}/${activeCharacter.maxEnergy}`,
    },
    {
      label: 'Nerve',
      value: activeCharacter.nerve,
      max: activeCharacter.maxNerve,
      meta: `${activeCharacter.nerve}/${activeCharacter.maxNerve}`,
    },
    { label: 'Heat', value: activeCharacter.heat, max: 100, meta: `${activeCharacter.heat}/100` },
  ];
  const activeCooldowns = actionLocks
    .map((lock) => ({
      ...lock,
      remaining: formatRemainingTime(new Date(lock.lockedUntil).getTime() - cooldownNow),
      active: new Date(lock.lockedUntil).getTime() > cooldownNow,
    }))
    .filter((lock) => lock.active);
  const stats = [
    ['Cash', `$${activeCharacter.cash}`],
    ['Bank', `$${activeCharacter.bank}`],
    ['Location', activeCharacter.location],
    ['Status', activeCharacter.status],
    ['Level', activeCharacter.level],
    ['Experience', activeCharacter.experience],
    ['Title', progressionProfile?.activeTitle?.title ?? 'None'],
    ['Profile score', progressionProfile?.summary.profileScore ?? 0],
    ['Legal reputation', activeCharacter.legalReputation ?? 0],
    ['Gambling reputation', activeCharacter.gamblingReputation ?? 0],
    ['Prestige', activeCharacter.prestigeLevel ?? 0],
    ['Legacy points', activeCharacter.legacyPoints ?? 0],
    ['Season points', seasonProfile?.progress?.seasonPoints ?? activeCharacter.seasonPoints ?? 0],
    ['Gear modifiers', Object.keys(equipmentProfile?.modifiers ?? {}).length],
    ['Vehicles', vehicleProfile?.vehicles.length ?? 0],
    ['Workshops', craftingProfile?.workshops.length ?? 0],
    ['Contacts', contactsProfile?.contacts.length ?? 0],
    ['Unread alerts', notificationCenter?.unreadCount ?? 0],
    ['Blocked until', activeStatusUntil ? formatDateTime(activeStatusUntil) : 'None'],
    ['Intelligence', activeCharacter.intelligence],
    ['Labour', activeCharacter.labour],
    ['Endurance', activeCharacter.endurance],
    ['Strength', activeCharacter.strength],
    ['Stamina', activeCharacter.stamina],
    ['Defense', activeCharacter.defense],
    ['Dexterity', activeCharacter.dexterity],
  ];

  return (
    <section className="character-dashboard">
      {announcements.length ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {announcements.map((announcement) => (
            <article
              key={announcement.id}
              style={{
                border: '1px solid #3f3f46',
                borderRadius: 12,
                padding: 16,
                background: 'rgba(63, 63, 70, 0.25)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: '#a1a1aa',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {announcement.severity}
              </p>
              <h3 style={{ margin: '6px 0' }}>{announcement.title}</h3>
              <p style={{ margin: 0 }}>{announcement.body}</p>
            </article>
          ))}
        </div>
      ) : null}

      <p className="dashboard-section-focus">Showing {dashboardSectionLabel}.</p>

      {activeCooldowns.length ? (
        <div className="cooldown-summary" aria-live="polite">
          <strong>Action cooldowns</strong>
          <div>
            {activeCooldowns.map((lock) => (
              <span key={lock.actionType} className="cooldown-pill">
                {lock.actionType.replaceAll('_', ' ')}: {lock.remaining}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div
        id="dashboard-overview"
        className="dashboard-section"
        hidden={!isSectionActive('dashboard-overview')}
      >
        <h2>{activeCharacter.name}</h2>
        <div className="progress-grid">
          {overviewProgress.map((item) => (
            <ProgressBar
              key={item.label}
              label={item.label}
              value={item.value}
              max={item.max}
              meta={item.meta}
            />
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          }}
        >
          {stats.map(([label, value]) => (
            <article key={label} className="stat-card">
              <h3 style={{ margin: 0, color: '#a1a1aa', fontSize: 14 }}>{label}</h3>
              <p style={{ fontSize: 24, margin: '8px 0 0' }}>{value}</p>
            </article>
          ))}
        </div>
      </div>

      {!isAvailable ? (
        <article
          hidden={!isSectionActive('dashboard-overview')}
          style={{
            border: '1px solid #f97316',
            borderRadius: 12,
            padding: 16,
            background: 'rgba(249, 115, 22, 0.08)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Character unavailable</h3>
          <p style={{ marginBottom: 4 }}>Status: {activeCharacter.status}</p>
          <p style={{ marginBottom: 4 }}>
            Reason: {statusDetail?.reason ?? activeCharacter.statusReason ?? 'No reason recorded.'}
          </p>
          {activeStatusUntil ? (
            <p style={{ marginBottom: 0 }}>
              Expected release/recovery: {formatDateTime(activeStatusUntil)}
            </p>
          ) : null}
          {statusDetail?.hospitalStay ? (
            <p style={{ marginBottom: 0 }}>Hospital bill: ${statusDetail.hospitalStay.bill}</p>
          ) : null}
          {statusDetail?.jailSentence ? (
            <p style={{ marginBottom: 0 }}>Fine paid/owed: ${statusDetail.jailSentence.fine}</p>
          ) : null}
        </article>
      ) : null}

      {safetyProfile &&
      (safetyProfile.activeEnforcements.length ||
        safetyProfile.appeals.length ||
        safetyProfile.notes.length) ? (
        <article
          hidden={!isSectionActive('dashboard-overview')}
          style={{
            border: '1px solid #f97316',
            borderRadius: 12,
            padding: 16,
            background: 'rgba(249, 115, 22, 0.06)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Safety / Moderation</h3>
          {safetyProfile.activeEnforcements.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <strong>Active enforcements</strong>
              {safetyProfile.activeEnforcements.map((enforcement) => {
                const existingAppeal = safetyProfile.appeals.find(
                  (appeal) => appeal.enforcementId === enforcement.id && appeal.status === 'open',
                );
                return (
                  <div
                    key={enforcement.id}
                    style={{ border: '1px solid #3f3f46', borderRadius: 10, padding: 12 }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>{enforcement.actionType}</strong> · severity {enforcement.severity}
                    </p>
                    <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                      {enforcement.endsAt
                        ? `Ends ${formatDateTime(enforcement.endsAt)}`
                        : 'No expiry'}{' '}
                      · {enforcement.reason}
                    </p>
                    {existingAppeal ? (
                      <p style={{ color: '#facc15', margin: 0 }}>Appeal pending.</p>
                    ) : (
                      <form
                        onSubmit={handleSubmitAppeal}
                        style={{ display: 'grid', gap: 8, marginTop: 8 }}
                      >
                        <input name="enforcementId" type="hidden" value={enforcement.id} />
                        <textarea
                          name="body"
                          required
                          minLength={10}
                          maxLength={1000}
                          placeholder="Explain why this enforcement should be reviewed..."
                        />
                        <button disabled={isSubmitting} type="submit">
                          Submit appeal
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
          {safetyProfile.appeals.length ? (
            <div style={{ marginTop: 16 }}>
              <strong>Recent appeals</strong>
              {safetyProfile.appeals.slice(0, 5).map((appeal) => (
                <p key={appeal.id} style={{ margin: '6px 0', color: '#a1a1aa' }}>
                  {appeal.status} · {formatDateTime(appeal.createdAt)}{' '}
                  {appeal.resolutionNote ? `· ${appeal.resolutionNote}` : ''}
                </p>
              ))}
            </div>
          ) : null}
        </article>
      ) : null}

      {messageCenter ? (
        <article
          className="card dashboard-section"
          id="dashboard-messages"
          hidden={!isSectionActive('dashboard-messages')}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Messages / Social</h3>
              <p style={{ margin: '6px 0 0', color: '#a1a1aa' }}>
                {liveMessages?.unreadTotal ?? messageCenter.unreadTotal} unread ·{' '}
                {liveMessages?.threadCount ?? messageCenter.threads.length} active threads ·{' '}
                {liveMessages?.blockedCount ?? messageCenter.blocked.length} blocked · live{' '}
                {liveMessageStatus}
              </p>
            </div>
            {(liveMessages?.blockedByCount ?? messageCenter.blockedByCount) ? (
              <span style={{ color: '#f97316' }}>
                {liveMessages?.blockedByCount ?? messageCenter.blockedByCount} character(s) have
                blocked you
              </span>
            ) : null}
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <strong>Start direct message</strong>
            <select name="recipientCharacterId" required defaultValue="">
              <option value="" disabled>
                Select recipient
              </option>
              {messageCenter.possibleRecipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name} · level {recipient.level} · {recipient.location}
                </option>
              ))}
            </select>
            <textarea
              name="body"
              required
              minLength={1}
              maxLength={2000}
              placeholder="Write an in-game message..."
            />
            <button disabled={isSubmitting || !messageCenter.possibleRecipients.length}>
              Send message
            </button>
          </form>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              marginTop: 16,
            }}
          >
            {messageCenter.threads.length ? (
              messageCenter.threads.slice(0, 6).map((thread) => (
                <div
                  key={thread.membership.threadId}
                  style={{ border: '1px solid #3f3f46', borderRadius: 10, padding: 12 }}
                >
                  <p style={{ margin: 0 }}>
                    <strong>
                      {thread.thread?.title ??
                        (thread.members
                          .filter((member) => member.id !== activeCharacter.id)
                          .map((member) => member.name)
                          .join(', ') ||
                          'Direct thread')}
                    </strong>
                  </p>
                  <p style={{ margin: '4px 0', color: '#a1a1aa' }}>
                    {thread.unreadCount} unread · {thread.members.length} member(s)
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
                    {thread.members
                      .filter((member) => member.id !== activeCharacter.id)
                      .map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            runAction(
                              '/api/messages',
                              {
                                action: 'block',
                                characterId: activeCharacter.id,
                                blockedCharacterId: member.id,
                                reason: 'Blocked from dashboard.',
                              },
                              `Blocked ${member.name}.`,
                            )
                          }
                        >
                          Block {member.name}
                        </button>
                      ))}
                  </div>
                  <div style={{ display: 'grid', gap: 6, margin: '8px 0' }}>
                    {thread.recentMessages.map((message) => (
                      <div
                        key={message.id}
                        style={{ borderTop: '1px solid #27272a', paddingTop: 6 }}
                      >
                        <p style={{ margin: 0 }}>
                          <strong>{message.senderName}:</strong> {message.body}
                        </p>
                        <p style={{ margin: '2px 0', color: '#71717a' }}>
                          {formatDateTime(message.createdAt)}
                        </p>
                        {message.senderCharacterId !== activeCharacter.id ? (
                          <button
                            disabled={isSubmitting}
                            onClick={() =>
                              runAction(
                                '/api/messages',
                                {
                                  action: 'report',
                                  characterId: activeCharacter.id,
                                  messageId: message.id,
                                  reason: 'Reported from dashboard.',
                                },
                                'Message reported for moderation.',
                              )
                            }
                          >
                            Report
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={(event) => handleReplyMessage(event, thread.membership.threadId)}
                    style={{ display: 'grid', gap: 8 }}
                  >
                    <input name="body" required maxLength={2000} placeholder="Reply..." />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button disabled={isSubmitting}>Reply</button>
                      <button
                        type="button"
                        disabled={isSubmitting || thread.unreadCount === 0}
                        onClick={() =>
                          runAction(
                            '/api/messages',
                            {
                              action: 'mark_thread_read',
                              characterId: activeCharacter.id,
                              threadId: thread.membership.threadId,
                            },
                            'Thread marked read.',
                          )
                        }
                      >
                        Mark read
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          runAction(
                            '/api/messages',
                            {
                              action: 'mute_thread',
                              characterId: activeCharacter.id,
                              threadId: thread.membership.threadId,
                              muted: !thread.membership.mutedAt,
                            },
                            thread.membership.mutedAt ? 'Thread unmuted.' : 'Thread muted.',
                          )
                        }
                      >
                        {thread.membership.mutedAt ? 'Unmute' : 'Mute'}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          runAction(
                            '/api/messages',
                            {
                              action: 'leave_thread',
                              characterId: activeCharacter.id,
                              threadId: thread.membership.threadId,
                            },
                            'Thread left.',
                          )
                        }
                      >
                        Leave
                      </button>
                    </div>
                  </form>
                </div>
              ))
            ) : (
              <span style={{ color: '#a1a1aa' }}>No message threads yet.</span>
            )}
          </div>
          {messageCenter.blocked.length ? (
            <div style={{ marginTop: 16 }}>
              <strong>Blocked characters</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {messageCenter.blocked.map((blocked) => (
                  <button
                    key={blocked.id}
                    disabled={isSubmitting}
                    onClick={() =>
                      runAction(
                        '/api/messages',
                        {
                          action: 'unblock',
                          characterId: activeCharacter.id,
                          blockedCharacterId: blocked.id,
                        },
                        `Unblocked ${blocked.name}.`,
                      )
                    }
                  >
                    Unblock {blocked.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      ) : null}

      {notificationCenter ? (
        <article
          className="card dashboard-section"
          id="dashboard-activity"
          hidden={!isSectionActive('dashboard-activity')}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Inbox / Activity</h3>
              <p style={{ margin: '6px 0 0', color: '#a1a1aa' }}>
                {liveNotifications?.unreadCount ?? notificationCenter.unreadCount} unread ·{' '}
                {liveNotifications?.highPriorityCount ?? notificationCenter.highPriorityCount} high
                priority · live {liveNotificationStatus} · urgent browser alerts enabled when
                permitted
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                disabled={isSubmitting || notificationCenter.unreadCount === 0}
                onClick={() =>
                  runAction(
                    '/api/notifications',
                    { action: 'mark_all_read', characterId: activeCharacter.id },
                    'Marked notifications as read.',
                  )
                }
              >
                Mark all read
              </button>
              <button
                disabled={isSubmitting}
                onClick={() =>
                  runAction(
                    '/api/notifications',
                    { action: 'archive_read', characterId: activeCharacter.id },
                    'Archived read notifications.',
                  )
                }
              >
                Archive read
              </button>
              <button
                type="button"
                disabled={
                  browserNotificationPermission === 'granted' ||
                  browserNotificationPermission === 'unsupported'
                }
                onClick={handleEnableBrowserAlerts}
              >
                Browser alerts: {browserNotificationPermission}
              </button>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              marginTop: 16,
            }}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>Notification filters</strong>
              <label style={{ display: 'grid', gap: 4, color: '#a1a1aa' }}>
                Category
                <select
                  value={notificationCategoryFilter}
                  onChange={(event) => setNotificationCategoryFilter(event.target.value)}
                >
                  <option value="all">All categories</option>
                  {NOTIFICATION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4, color: '#a1a1aa' }}>
                Priority
                <select
                  value={notificationPriorityFilter}
                  onChange={(event) => setNotificationPriorityFilter(event.target.value)}
                >
                  <option value="all">All priorities</option>
                  {NOTIFICATION_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a1a1aa' }}>
                <input
                  type="checkbox"
                  checked={notificationUnreadOnly}
                  onChange={(event) => setNotificationUnreadOnly(event.target.checked)}
                />
                Unread only
              </label>
              <span style={{ color: '#a1a1aa' }}>
                {filteredNotifications.length} visible notification
                {filteredNotifications.length === 1 ? '' : 's'}.
              </span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>Preferences</strong>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a1a1aa' }}>
                <input
                  type="checkbox"
                  checked={notificationPreferences.digestEnabled}
                  onChange={(event) =>
                    handleNotificationPreferenceUpdate({ digestEnabled: event.target.checked })
                  }
                  disabled={isSubmitting}
                />
                Digest enabled
              </label>
              <label style={{ display: 'grid', gap: 4, color: '#a1a1aa' }}>
                Digest cadence
                <select
                  value={notificationPreferences.digestFrequencyMinutes}
                  onChange={(event) =>
                    handleNotificationPreferenceUpdate({
                      digestFrequencyMinutes: Number(event.target.value),
                    })
                  }
                  disabled={isSubmitting}
                >
                  <option value={60}>Hourly</option>
                  <option value={360}>Every 6 hours</option>
                  <option value={720}>Every 12 hours</option>
                  <option value={1440}>Daily</option>
                  <option value={10080}>Weekly</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {NOTIFICATION_CATEGORIES.map((category) => {
                  const muted = notificationPreferences.mutedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      disabled={isSubmitting}
                      onClick={() => handleToggleMutedNotificationCategory(category)}
                    >
                      {muted ? `Unmute ${category}` : `Mute ${category}`}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>Unread alerts</strong>
              {filteredUnreadNotifications.length ? (
                filteredUnreadNotifications.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    style={{ border: '1px solid #3f3f46', borderRadius: 8, padding: 10 }}
                  >
                    <p style={{ margin: 0 }}>{item.title}</p>
                    <p style={{ margin: '4px 0', color: '#a1a1aa' }}>
                      {item.category} · {item.priority} · {formatDateTime(item.createdAt)}
                    </p>
                    <p style={{ margin: '4px 0' }}>{item.body}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        disabled={isSubmitting}
                        onClick={() =>
                          runAction(
                            '/api/notifications',
                            {
                              action: 'mark_read',
                              characterId: activeCharacter.id,
                              notificationId: item.id,
                            },
                            'Marked notification as read.',
                          )
                        }
                      >
                        Read
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={() =>
                          runAction(
                            '/api/notifications',
                            {
                              action: 'archive',
                              characterId: activeCharacter.id,
                              notificationId: item.id,
                            },
                            'Archived notification.',
                          )
                        }
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <span style={{ color: '#a1a1aa' }}>
                  No unread notifications match the current filters.
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>Recent notifications</strong>
              {filteredNotifications.length ? (
                filteredNotifications.slice(0, 8).map((item) => (
                  <p
                    key={item.id}
                    style={{ margin: 0, color: item.readAt ? '#a1a1aa' : '#e4e4e7' }}
                  >
                    {item.title} · {item.category} · {item.priority} ·{' '}
                    {formatDateTime(item.createdAt)}
                  </p>
                ))
              ) : (
                <span style={{ color: '#a1a1aa' }}>
                  No notifications match the current filters.
                </span>
              )}
              <strong>Recent activity</strong>
              {filteredActivityFeed.length ? (
                filteredActivityFeed.slice(0, 8).map((entry) => (
                  <p key={entry.id} style={{ margin: 0, color: '#a1a1aa' }}>
                    {entry.title} · {entry.category} · {formatDateTime(entry.createdAt)}
                  </p>
                ))
              ) : (
                <span style={{ color: '#a1a1aa' }}>
                  No activity feed entries match the current filters.
                </span>
              )}
              <strong>Recent digests</strong>
              {notificationCenter.digests.length ? (
                notificationCenter.digests.slice(0, 3).map((digest) => (
                  <span key={digest.id} style={{ color: '#a1a1aa' }}>
                    {digest.summary} · {formatDateOnly(digest.createdAt)}
                  </span>
                ))
              ) : (
                <span style={{ color: '#a1a1aa' }}>No digests generated yet.</span>
              )}
            </div>
          </div>
        </article>
      ) : null}

      <div
        id="dashboard-actions"
        className="dashboard-section dashboard-section-grid"
        hidden={!actionGridVisible}
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        <ActionCard
          hidden={!isSectionActive('dashboard-actions')}
          title="Day Job"
          items={jobs}
          empty="No jobs available."
          render={(job) => (
            <button
              disabled={isSubmitting || !isAvailable || hasActionCooldown('job')}
              onClick={() =>
                runAction(
                  '/api/jobs',
                  { characterId: activeCharacter.id, jobKey: job.key },
                  `Completed ${job.name}.`,
                )
              }
            >
              {cooldownButtonLabel(
                'job',
                <>
                  {job.name} · ${job.baseWage} · {job.energyCost} energy
                </>,
              )}
            </button>
          )}
        />

        <ActionCard
          hidden={!isSectionActive('dashboard-actions')}
          title="Crimes"
          items={crimes.filter((crime) => activeCharacter.level >= crime.requiredLevel)}
          empty="No crimes available at your current level."
          render={(crime) => (
            <button
              disabled={isSubmitting || !isAvailable || hasActionCooldown('crime')}
              onClick={() =>
                runAction(
                  '/api/crimes',
                  { characterId: activeCharacter.id, crimeKey: crime.key },
                  `Attempted ${crime.name}.`,
                )
              }
            >
              {cooldownButtonLabel(
                'crime',
                <>
                  {crime.name} · ${crime.minReward}-${crime.maxReward} · {crime.requiredNerve}{' '}
                  nerve
                </>,
              )}
            </button>
          )}
        />

        <ActionCard
          hidden={!isSectionActive('dashboard-actions')}
          title="Training"
          items={trainingActivities}
          empty="No training available."
          render={(activity) => {
            const energyCost = scaledTrainingEnergy(activity);
            return (
              <button
                disabled={
                  isSubmitting ||
                  !isAvailable ||
                  hasActionCooldown('training') ||
                  activeCharacter.energy < energyCost ||
                  activeCharacter.cash < activity.cashCost
                }
                onClick={() =>
                  runAction(
                    '/api/training',
                    { characterId: activeCharacter.id, activityKey: activity.key },
                    `Started ${activity.name}.`,
                  )
                }
              >
                {cooldownButtonLabel(
                  'training',
                  <>
                    Start {activity.name} · +{activity.statGain} {activity.stat} · {energyCost}{' '}
                    energy · {formatRemainingTime(activity.durationSeconds * 1000)}
                  </>,
                )}
              </button>
            );
          }}
        />

        <ActionCard
          hidden={!isSectionActive('dashboard-actions')}
          title="Education"
          items={courses}
          empty="No courses available."
          render={(course) => {
            const requirement = courseRequirementMessage(course);
            return (
              <button
                disabled={
                  isSubmitting ||
                  !isAvailable ||
                  hasActionCooldown('education') ||
                  Boolean(requirement) ||
                  activeCharacter.energy < course.energyCost ||
                  activeCharacter.cash < course.cashCost
                }
                onClick={() =>
                  runAction(
                    '/api/education',
                    { characterId: activeCharacter.id, courseKey: course.key },
                    `Started ${course.name}.`,
                  )
                }
              >
                {cooldownButtonLabel(
                  'education',
                  <>
                    {requirement ? `${course.name} · ${requirement}` : `Start ${course.name}`} · +
                    {course.statGain} {course.stat} · ${course.cashCost} ·{' '}
                    {formatRemainingTime(course.durationSeconds * 1000)}
                  </>,
                )}
              </button>
            );
          }}
        />

        <article className="card" hidden={!isSectionActive('dashboard-actions')}>
          <h3 style={{ marginTop: 0 }}>Training queue</h3>
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>
            Active training {activeTrainingQueue.length} · active courses {activeCourseQueue.length}
            {nextProgressionDueAt ? ` · next completion ${formatDateTime(nextProgressionDueAt)}` : ''}
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {[...activeTrainingQueue, ...activeCourseQueue].length ? (
              [...activeTrainingQueue, ...activeCourseQueue].slice(0, 6).map((entry) => (
                <div key={entry.id} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
                  <strong>{'activityKey' in entry ? entry.activityKey : entry.courseKey}</strong>
                  <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                    +{entry.statGain} {entry.stat} · due{' '}
                    {entry.dueAt ? formatDateTime(entry.dueAt) : 'soon'}
                  </p>
                </div>
              ))
            ) : (
              <span style={{ color: '#a1a1aa' }}>No active training or education timers.</span>
            )}
          </div>
        </article>

        <ActionCard
          hidden={!isSectionActive('dashboard-actions')}
          title="Travel"
          items={routes}
          empty="No routes from this location."
          render={(route) => (
            <button
              disabled={isSubmitting || !isAvailable || hasActionCooldown('travel')}
              onClick={() =>
                runAction(
                  '/api/travel',
                  { characterId: activeCharacter.id, routeId: route.id },
                  `Started travel to ${route.toLocation}.`,
                )
              }
            >
              {cooldownButtonLabel(
                'travel',
                <>
                  To {route.toLocation} · ${route.cost} · {Math.ceil(route.durationSeconds / 60)} min
                </>,
              )}
            </button>
          )}
        />

        <article className="card" hidden={!isSectionActive('dashboard-actions')}>
          <h3 style={{ marginTop: 0 }}>Legal / Recovery</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              disabled={isSubmitting || activeCharacter.heat <= 0}
              onClick={() =>
                runAction(
                  '/api/legal/lawyer',
                  { characterId: activeCharacter.id, tier: 'public' },
                  'Hired a public defender.',
                )
              }
            >
              Public defender · $50
            </button>
            <button
              disabled={isSubmitting || activeCharacter.heat <= 0}
              onClick={() =>
                runAction(
                  '/api/legal/lawyer',
                  { characterId: activeCharacter.id, tier: 'street' },
                  'Hired a street lawyer.',
                )
              }
            >
              Street lawyer · $300
            </button>
            <button
              disabled={isSubmitting || activeCharacter.heat <= 0}
              onClick={() =>
                runAction(
                  '/api/legal/lawyer',
                  { characterId: activeCharacter.id, tier: 'firm' },
                  'Hired a private legal firm.',
                )
              }
            >
              Private firm · $1000
            </button>
            <button
              disabled={
                isSubmitting || activeCharacter.heat <= 0 || hasActionCooldown('legal_bribe')
              }
              onClick={() =>
                runAction(
                  '/api/legal/bribe',
                  { characterId: activeCharacter.id },
                  'Attempted a bribe.',
                )
              }
            >
              {cooldownButtonLabel(
                'legal_bribe',
                <>Attempt bribe · estimated ${100 + activeCharacter.heat * 35}</>,
              )}
            </button>
            <button
              disabled={isSubmitting || activeCharacter.status !== 'hospitalized'}
              onClick={() =>
                runAction(
                  '/api/hospital/care',
                  { characterId: activeCharacter.id, service: 'private' },
                  'Bought private hospital care.',
                )
              }
            >
              Private hospital care · $350
            </button>
          </div>
        </article>

        <article className="card" id="dashboard-crew" hidden={!isSectionActive('dashboard-crew')}>
          <h3 style={{ marginTop: 0 }}>Faction</h3>
          {ownFaction?.faction ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <strong>
                  {ownFaction.faction.name} [{ownFaction.faction.tag}]
                </strong>
                <p style={{ margin: '6px 0 0', color: '#a1a1aa' }}>
                  Role: {ownFaction.membership.role} · Bank: ${ownFaction.faction.bank} · Power:{' '}
                  {ownFaction.faction.power ?? 0} · Contribution:{' '}
                  {ownFaction.membership.contributionPoints ?? 0}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  disabled={isSubmitting || activeCharacter.cash < 50}
                  onClick={() =>
                    runAction(
                      `/api/factions/${ownFaction.faction?.id}/bank`,
                      { characterId: activeCharacter.id, action: 'deposit', amount: 50 },
                      'Deposited $50 into the faction bank.',
                    )
                  }
                >
                  Deposit $50
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() =>
                    runAction(
                      `/api/factions/${ownFaction.faction?.id}/bank`,
                      { characterId: activeCharacter.id, action: 'withdraw', amount: 50 },
                      'Withdrew $50 from the faction bank.',
                    )
                  }
                >
                  Withdraw $50
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() =>
                    runAction(
                      `/api/factions/${ownFaction.faction?.id}/leave`,
                      { characterId: activeCharacter.id },
                      'Left faction.',
                    )
                  }
                >
                  Leave faction
                </button>
              </div>
              <div>
                <strong>Recent ledger</strong>
                <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                  {ownFaction.ledger.length ? (
                    ownFaction.ledger.slice(0, 4).map((entry) => (
                      <span key={entry.id} style={{ color: '#a1a1aa' }}>
                        {entry.description} · {entry.amount >= 0 ? '+' : ''}${entry.amount}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#a1a1aa' }}>No ledger entries yet.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <form onSubmit={handleCreateFaction} style={{ display: 'grid', gap: 8 }}>
                <input
                  name="name"
                  minLength={3}
                  maxLength={32}
                  required
                  placeholder="Faction name"
                />
                <input name="tag" minLength={2} maxLength={6} required placeholder="TAG" />
                <textarea name="description" maxLength={500} placeholder="Description" />
                <button
                  disabled={isSubmitting || !isAvailable || hasActionCooldown('faction_action')}
                  type="submit"
                >
                  Create faction
                </button>
              </form>
              <div style={{ display: 'grid', gap: 8 }}>
                {factions.length ? (
                  factions.map((faction) => (
                    <button
                      key={faction.id}
                      disabled={isSubmitting || !isAvailable || hasActionCooldown('faction_action')}
                      onClick={() =>
                        runAction(
                          `/api/factions/${faction.id}/join`,
                          { characterId: activeCharacter.id },
                          `Joined ${faction.name}.`,
                        )
                      }
                    >
                      Join {faction.name} [{faction.tag}] · {faction.memberCount ?? 0} members
                    </button>
                  ))
                ) : (
                  <p>No factions available yet.</p>
                )}
              </div>
            </div>
          )}
        </article>

        <ActionCard
          hidden={!isSectionActive('dashboard-crew')}
          title="Territories"
          items={territories}
          empty="No territories available."
          render={(territory) => {
            const ownedByUs =
              ownFaction?.faction?.id && territory.controlledByFactionId === ownFaction.faction.id;
            const uncontrolled = !territory.controlledByFactionId;
            return (
              <div style={{ display: 'grid', gap: 6 }}>
                <strong>{territory.name}</strong>
                <span style={{ color: '#a1a1aa' }}>
                  ${territory.incomePerTick}/tick · defense {territory.defenseRating} · control{' '}
                  {territory.controlScore} ·{' '}
                  {ownedByUs
                    ? 'controlled by your faction'
                    : uncontrolled
                      ? 'uncontrolled'
                      : 'enemy controlled'}
                </span>
                <ProgressBar
                  label={`${territory.name} control`}
                  value={territory.controlScore}
                  max={100}
                  meta={`${territory.controlScore}/100 control`}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    disabled={
                      isSubmitting ||
                      !isAvailable ||
                      !ownFaction?.faction ||
                      hasActionCooldown('faction_action')
                    }
                    onClick={() =>
                      runAction(
                        '/api/territories/actions',
                        {
                          characterId: activeCharacter.id,
                          territoryKey: territory.key,
                          action: 'scout',
                        },
                        `Scouted ${territory.name}.`,
                      )
                    }
                  >
                    Scout
                  </button>
                  <button
                    disabled={
                      isSubmitting ||
                      !isAvailable ||
                      !ownFaction?.faction ||
                      !uncontrolled ||
                      hasActionCooldown('faction_action')
                    }
                    onClick={() =>
                      runAction(
                        '/api/territories/actions',
                        {
                          characterId: activeCharacter.id,
                          territoryKey: territory.key,
                          action: 'claim',
                        },
                        `Claimed ${territory.name}.`,
                      )
                    }
                  >
                    Claim
                  </button>
                  <button
                    disabled={
                      isSubmitting ||
                      !isAvailable ||
                      !ownedByUs ||
                      hasActionCooldown('faction_action')
                    }
                    onClick={() =>
                      runAction(
                        '/api/territories/actions',
                        {
                          characterId: activeCharacter.id,
                          territoryKey: territory.key,
                          action: 'reinforce',
                        },
                        `Reinforced ${territory.name}.`,
                      )
                    }
                  >
                    Reinforce
                  </button>
                  <button
                    disabled={
                      isSubmitting ||
                      !isAvailable ||
                      !ownFaction?.faction ||
                      ownedByUs ||
                      uncontrolled ||
                      hasActionCooldown('faction_action')
                    }
                    onClick={() =>
                      runAction(
                        '/api/territories/actions',
                        {
                          characterId: activeCharacter.id,
                          territoryKey: territory.key,
                          action: 'attack',
                        },
                        `Attacked ${territory.name}.`,
                      )
                    }
                  >
                    Attack
                  </button>
                </div>
              </div>
            );
          }}
        />

        <article
          className="card"
          id="dashboard-economy"
          hidden={!isSectionActive('dashboard-economy')}
        >
          <h3 style={{ marginTop: 0 }}>Player Shops</h3>
          {primaryShop ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <strong>
                {primaryShop.name} {primaryShop.isAdvertising ? '· Sponsored' : ''}
              </strong>
              <span style={{ color: '#a1a1aa' }}>
                Reputation {primaryShop.reputation} · rating {primaryShop.averageRating ?? 'new'} ·{' '}
                {primaryShop.isOpen === false ? 'closed' : 'open'} ·{' '}
                {ownShops[0]?.listings.length ?? 0} active listings
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  disabled={isSubmitting || !isAvailable}
                  onClick={() =>
                    runAction(
                      '/api/shops/actions',
                      {
                        action: 'set_status',
                        characterId: activeCharacter.id,
                        shopId: primaryShop.id,
                        isOpen: primaryShop.isOpen === false,
                      },
                      primaryShop.isOpen === false ? 'Shop reopened.' : 'Shop closed temporarily.',
                    )
                  }
                >
                  {primaryShop.isOpen === false ? 'Reopen shop' : 'Close shop'}
                </button>
                <button
                  disabled={isSubmitting || !isAvailable || activeCharacter.cash < 25}
                  onClick={() =>
                    runAction(
                      '/api/shops/actions',
                      {
                        action: 'advertise',
                        characterId: activeCharacter.id,
                        shopId: primaryShop.id,
                        spend: 100,
                      },
                      'Bought a shop advertisement.',
                    )
                  }
                >
                  Advertise · $100
                </button>
              </div>
              {ownShops[0]?.listings.length ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <strong>Manage listings</strong>
                  {ownShops[0].listings.slice(0, 6).map((listing) => (
                    <button
                      key={listing.id}
                      disabled={isSubmitting || !isAvailable || listing.status !== 'active'}
                      onClick={() =>
                        runAction(
                          '/api/shops/actions',
                          {
                            action: 'cancel_listing',
                            characterId: activeCharacter.id,
                            listingId: listing.id,
                          },
                          `Cancelled ${listing.itemName} listing.`,
                        )
                      }
                    >
                      Cancel {listing.itemName} · {listing.quantity - listing.soldQuantity} unsold ·
                      ${listing.priceEach}
                    </button>
                  ))}
                </div>
              ) : null}
              <div style={{ display: 'grid', gap: 6 }}>
                {listableInventory.length ? (
                  listableInventory.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      disabled={isSubmitting || !isAvailable}
                      onClick={() =>
                        runAction(
                          '/api/shops/listings',
                          {
                            characterId: activeCharacter.id,
                            shopId: primaryShop.id,
                            itemKey: item.itemKey,
                            quantity: 1,
                            priceEach: 100,
                          },
                          `Listed ${item.itemKey} in your shop.`,
                        )
                      }
                    >
                      List 1x {item.itemKey} for $100 · owned {item.quantity}
                    </button>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>
                    Buy or earn inventory before creating listings.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateShop} style={{ display: 'grid', gap: 8 }}>
              <input name="name" minLength={3} maxLength={48} required placeholder="Shop name" />
              <textarea name="description" maxLength={500} placeholder="Shop description" />
              <button
                disabled={
                  isSubmitting ||
                  !isAvailable ||
                  activeCharacter.cash < 250 ||
                  hasActionCooldown('shop_create')
                }
                type="submit"
              >
                Open shop · $250
              </button>
            </form>
          )}
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <strong>Local listings</strong>
            {shopListings.length ? (
              shopListings.slice(0, 8).map((listing) => {
                const remaining = listing.quantity - listing.soldQuantity;
                return (
                  <div key={listing.listingId} style={{ display: 'grid', gap: 4 }}>
                    <button
                      disabled={
                        isSubmitting ||
                        !isAvailable ||
                        listing.ownerCharacterId === activeCharacter.id ||
                        remaining < 1
                      }
                      onClick={() =>
                        runAction(
                          '/api/shops/purchase',
                          {
                            characterId: activeCharacter.id,
                            listingId: listing.listingId,
                            quantity: 1,
                          },
                          `Bought ${listing.itemName} from ${listing.shopName}.`,
                        )
                      }
                    >
                      {listing.itemName} · ${listing.priceEach} · {remaining} left ·{' '}
                      {listing.shopName}
                    </button>
                    <button
                      disabled={
                        isSubmitting ||
                        !isAvailable ||
                        listing.ownerCharacterId === activeCharacter.id
                      }
                      onClick={() =>
                        runAction(
                          '/api/shops/actions',
                          {
                            action: 'review',
                            characterId: activeCharacter.id,
                            shopId: listing.shopId,
                            rating: 5,
                            body: 'Reliable local seller.',
                          },
                          `Reviewed ${listing.shopName}.`,
                        )
                      }
                    >
                      Leave 5-star review for {listing.shopName}
                    </button>
                  </div>
                );
              })
            ) : (
              <span style={{ color: '#a1a1aa' }}>No active local shop listings.</span>
            )}
          </div>
        </article>

        <article className="card" id="dashboard-news" hidden={!isSectionActive('dashboard-news')}>
          <h3 style={{ marginTop: 0 }}>Newspaper</h3>
          <form
            onSubmit={handleSubmitArticle}
            style={{ display: 'grid', gap: 8, marginBottom: 12 }}
          >
            <input
              name="title"
              minLength={5}
              maxLength={120}
              required
              placeholder="Article title"
            />
            <textarea
              name="body"
              minLength={20}
              maxLength={5000}
              required
              placeholder="Write a blog/news article"
            />
            <button disabled={isSubmitting || !isAvailable} type="submit">
              Submit article
            </button>
          </form>
          <div style={{ display: 'grid', gap: 12 }}>
            {articles.length ? (
              articles.slice(0, 5).map((article) => {
                const liked = article.myReactions?.includes('like');
                const reported = Boolean(article.myReports?.length);
                return (
                  <div
                    key={article.id}
                    style={{
                      borderTop: '1px solid #27272a',
                      display: 'grid',
                      gap: 8,
                      paddingTop: 8,
                    }}
                  >
                    <div>
                      <strong>{article.title}</strong>
                      <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                        {article.excerpt} · {article.category} · by{' '}
                        {article.author?.name ?? 'Staff'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        disabled={isSubmitting || !isAvailable}
                        onClick={() => handleReactArticle(article.id, 'like')}
                        type="button"
                      >
                        {liked ? 'Unlike' : 'Like'} · {article.reactionCounts?.like ?? 0}
                      </button>
                      <button
                        disabled={isSubmitting || !isAvailable}
                        onClick={() => handleReactArticle(article.id, 'insightful')}
                        type="button"
                      >
                        Insightful · {article.reactionCounts?.insightful ?? 0}
                      </button>
                      <button
                        disabled={isSubmitting || !isAvailable || reported}
                        onClick={() => handleReportArticle(article.id)}
                        type="button"
                      >
                        {reported ? 'Reported' : 'Report'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {article.comments?.length ? (
                        article.comments.map((comment) => (
                          <div
                            key={comment.id}
                            style={{
                              borderLeft: '2px solid #3f3f46',
                              color: '#d4d4d8',
                              paddingLeft: 8,
                            }}
                          >
                            <strong>{comment.author?.name ?? 'Unknown'}:</strong> {comment.body}
                          </div>
                        ))
                      ) : (
                        <span style={{ color: '#71717a' }}>No comments yet.</span>
                      )}
                      <form
                        onSubmit={(event) => handleCommentArticle(event, article.id)}
                        style={{ display: 'flex', gap: 8 }}
                      >
                        <input
                          name="body"
                          minLength={2}
                          maxLength={1000}
                          required
                          placeholder="Add a comment"
                          style={{ flex: 1 }}
                        />
                        <button disabled={isSubmitting || !isAvailable} type="submit">
                          Comment
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ color: '#a1a1aa' }}>No articles yet.</span>
            )}
          </div>
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-economy')}>
          <h3 style={{ marginTop: 0 }}>Banking</h3>
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>
            Move funds between pocket cash and protected bank balance. Cash is used for most quick
            actions; bank balance counts toward net worth and safer long-term progression.
          </p>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <form onSubmit={(event) => handleBankTransfer(event, 'deposit')} style={{ display: 'grid', gap: 8 }}>
              <label htmlFor="bank-deposit-amount">Deposit amount</label>
              <input
                id="bank-deposit-amount"
                name="amount"
                type="number"
                min={1}
                max={Math.max(1, activeCharacter.cash)}
                defaultValue={Math.min(100, Math.max(1, activeCharacter.cash))}
                required
              />
              <button disabled={isSubmitting || !isAvailable || activeCharacter.cash <= 0} type="submit">
                Deposit cash
              </button>
            </form>
            <form onSubmit={(event) => handleBankTransfer(event, 'withdraw')} style={{ display: 'grid', gap: 8 }}>
              <label htmlFor="bank-withdraw-amount">Withdraw amount</label>
              <input
                id="bank-withdraw-amount"
                name="amount"
                type="number"
                min={1}
                max={Math.max(1, activeCharacter.bank)}
                defaultValue={Math.min(100, Math.max(1, activeCharacter.bank))}
                required
              />
              <button disabled={isSubmitting || !isAvailable || activeCharacter.bank <= 0} type="submit">
                Withdraw cash
              </button>
            </form>
          </div>
          <form
            onSubmit={handleLoadBankStatement}
            style={{
              borderTop: '1px solid #27272a',
              display: 'grid',
              gap: 10,
              marginTop: 16,
              paddingTop: 16,
            }}
          >
            <strong>Bank statement</strong>
            <div
              style={{
                display: 'grid',
                gap: 10,
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                Type
                <select name="action" defaultValue="all">
                  <option value="all">All bank movements</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdraw">Withdrawals</option>
                  <option value="loan_request">Loan funding</option>
                  <option value="loan_repayment">Loan repayments</option>
                  <option value="loan_partial_repayment">Partial loan payments</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                From
                <input name="from" type="date" />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                To
                <input name="to" type="date" />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                Rows
                <select name="limit" defaultValue="25">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </label>
            </div>
            <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button disabled={bankStatementStatus === 'loading'} type="submit">
                {bankStatementStatus === 'loading' ? 'Loading statement...' : 'Load statement'}
              </button>
              <a className="button-link" href={bankStatementCsvUrl}>
                Download latest CSV
              </a>
              {bankStatementStatus === 'error' ? (
                <span style={{ color: '#fca5a5' }}>{bankStatementError}</span>
              ) : null}
            </div>
          </form>
          {bankStatementSummary ? (
            <div
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                marginTop: 12,
              }}
            >
              <span className="stat-card">Inflow: ${bankStatementSummary.inflow.toFixed(0)}</span>
              <span className="stat-card">Outflow: ${bankStatementSummary.outflow.toFixed(0)}</span>
              <span className="stat-card">Net: {formatSignedMoney(bankStatementSummary.netAmount)}</span>
              <span className="stat-card">Rows: {bankStatementSummary.returned}</span>
            </div>
          ) : null}
          <div style={{ display: 'grid', gap: 6, marginTop: 16 }}>
            <strong>{bankStatement ? 'Statement results' : 'Recent bank activity'}</strong>
            {displayedBankTransactions.length ? (
              displayedBankTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  style={{
                    borderTop: '1px solid #27272a',
                    display: 'grid',
                    gap: 4,
                    paddingTop: 8,
                  }}
                >
                  <span>
                    {formatSignedMoney(transaction.amount)} · {transaction.description}
                  </span>
                  <span style={{ color: '#71717a' }}>
                    {formatDateTime(transaction.createdAt)}
                    {transaction.metadata?.action ? ` · ${transaction.metadata.action.replaceAll('_', ' ')}` : ''}
                    {typeof transaction.metadata?.cashAfter === 'number' &&
                    typeof transaction.metadata?.bankAfter === 'number'
                      ? ` · cash $${transaction.metadata.cashAfter} · bank $${transaction.metadata.bankAfter}`
                      : ''}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ color: '#a1a1aa' }}>No matching bank transactions yet.</span>
            )}
          </div>
        </article>


        <article className="card" hidden={!isSectionActive('dashboard-economy')}>
          <h3 style={{ marginTop: 0 }}>Loans</h3>
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>
            Use fictional short-term loans as a controlled cashflow tool. Funds are deposited into
            the bank and must be repaid from the bank balance before another loan can be opened.
            Overdue loans enter default after a short grace window and can still be repaid from bank.
          </p>
          {loanProfile?.activeLoan ? (
            <div
              style={{
                border: '1px solid #3f3f46',
                borderRadius: 12,
                display: 'grid',
                gap: 6,
                marginBottom: 12,
                padding: 12,
              }}
            >
              <strong>
                {loanProfile.activeLoan.isDefaulted ? 'Defaulted loan' : 'Active loan'} · {loanProfile.activeLoan.offerKey} · outstanding $
                {loanProfile.activeLoan.outstanding}
              </strong>
              <span style={{ color: loanProfile.activeLoan.isDefaulted ? '#f87171' : loanProfile.activeLoan.isOverdue ? '#fca5a5' : '#a1a1aa' }}>
                Due {formatDateTime(loanProfile.activeLoan.dueAt)} · total due $
                {loanProfile.activeLoan.totalDue}
                {loanProfile.activeLoan.isDefaulted
                  ? ' · defaulted'
                  : loanProfile.activeLoan.isOverdue
                    ? ` · overdue${loanProfile.activeLoan.hoursPastDue ? ` by ${loanProfile.activeLoan.hoursPastDue}h` : ''}`
                    : ''}
              </span>
              {loanProfile.activeLoan.defaultAt ? (
                <span style={{ color: '#71717a' }}>
                  Default review after {formatDateTime(loanProfile.activeLoan.defaultAt)}.
                </span>
              ) : null}
              <span style={{ color: '#71717a' }}>
                Paid ${loanProfile.activeLoan.repaidAmount} of ${loanProfile.activeLoan.totalDue}.
              </span>
              <form
                onSubmit={(event) =>
                  handleLoanRepayment(
                    event,
                    loanProfile.activeLoan!.id,
                    loanProfile.activeLoan!.outstanding,
                  )
                }
                style={{ display: 'grid', gap: 8 }}
              >
                <label htmlFor="loan-payment-amount">Repayment amount</label>
                <input
                  id="loan-payment-amount"
                  name="amount"
                  type="number"
                  min={1}
                  max={Math.max(1, loanProfile.activeLoan.outstanding)}
                  defaultValue={Math.min(
                    loanProfile.activeLoan.outstanding,
                    Math.max(1, activeCharacter.bank),
                  )}
                  required
                />
                <button
                  disabled={isSubmitting || !isAvailable || activeCharacter.bank <= 0}
                  type="submit"
                >
                  Pay from bank
                </button>
              </form>
            </div>
          ) : null}
          <div style={{ display: 'grid', gap: 10 }}>
            {loanProfile?.offers.length ? (
              loanProfile.offers.map((offer) => {
                const locked = activeCharacter.level < offer.minimumLevel || Boolean(loanProfile.activeLoan);
                return (
                  <div
                    key={offer.key}
                    style={{
                      borderTop: '1px solid #27272a',
                      display: 'grid',
                      gap: 6,
                      paddingTop: 8,
                    }}
                  >
                    <strong>
                      {offer.name} · receive ${offer.principal} · repay ${offer.totalDue}
                    </strong>
                    <span style={{ color: '#a1a1aa' }}>
                      {offer.description} · fee ${offer.fee} · due in {offer.dueHours}h · level {offer.minimumLevel}+
                    </span>
                    <button
                      disabled={isSubmitting || !isAvailable || locked}
                      onClick={() => handleLoanRequest(offer.key)}
                      type="button"
                    >
                      {loanProfile.activeLoan
                        ? 'Repay active loan first'
                        : activeCharacter.level < offer.minimumLevel
                          ? `Requires level ${offer.minimumLevel}`
                          : 'Request loan'}
                    </button>
                  </div>
                );
              })
            ) : (
              <span style={{ color: '#a1a1aa' }}>No loan offers configured.</span>
            )}
          </div>
          {loanProfile?.loans.length ? (
            <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
              <strong>Recent loans</strong>
              {loanProfile.loans.slice(0, 5).map((loan) => (
                <span key={loan.id} style={{ color: '#71717a' }}>
                  {loan.offerKey} · {loan.lifecycleStatus ?? loan.status} · outstanding ${loan.outstanding} · opened{' '}
                  {formatDateTime(loan.createdAt)}
                  {loan.isDefaulted ? ' · repay before requesting another loan' : ''}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-economy')}>
          <h3 style={{ marginTop: 0 }}>Money Sinks</h3>
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>
            Spend excess cash or bank balance on temporary lifestyle and service purchases. These
            are intentionally low-impact drains for economy balancing and audit visibility.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {moneySinks.length ? (
              moneySinks.map((sink) => (
                <div
                  key={sink.key}
                  style={{
                    borderTop: '1px solid #27272a',
                    display: 'grid',
                    gap: 6,
                    paddingTop: 8,
                  }}
                >
                  <strong>
                    {sink.name} · ${sink.cost}
                  </strong>
                  <span style={{ color: '#a1a1aa' }}>
                    {sink.description} · {sink.durationHours}h · {sink.category}
                  </span>
                  <span style={{ color: '#71717a' }}>{sink.benefit}</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      disabled={isSubmitting || !isAvailable || activeCharacter.cash < sink.cost}
                      onClick={() => handleMoneySinkPurchase(sink.key, 'cash')}
                    >
                      Pay cash
                    </button>
                    <button
                      disabled={isSubmitting || !isAvailable || activeCharacter.bank < sink.cost}
                      onClick={() => handleMoneySinkPurchase(sink.key, 'bank')}
                    >
                      Pay bank
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <span style={{ color: '#a1a1aa' }}>No money sinks configured.</span>
            )}
          </div>
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-economy')}>
          <h3 style={{ marginTop: 0 }}>Stocks & Crypto</h3>
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            {financeMarket.length ? (
              financeMarket.slice(0, 10).map((entry) => {
                const owned = portfolio.find((position) => position.assetKey === entry.asset.key);
                const history = financeHistories[entry.asset.key];
                const historyPrices = history?.prices ?? [];
                const firstPrice = historyPrices[0]?.price ?? entry.price;
                const lastPrice = historyPrices[historyPrices.length - 1]?.price ?? entry.price;
                const priceChange = lastPrice - firstPrice;
                const sparklinePoints = buildSparklinePoints(historyPrices);
                return (
                  <div
                    key={entry.asset.key}
                    style={{
                      borderBottom: '1px solid #27272a',
                      display: 'grid',
                      gap: 6,
                      paddingBottom: 8,
                    }}
                  >
                    <strong>
                      {entry.asset.symbol} · {entry.asset.name}
                    </strong>
                    <span style={{ color: '#a1a1aa' }}>
                      {entry.asset.assetType} · ${entry.price} · sentiment {entry.sentiment} ·
                      volume {entry.volume} · owned {owned?.quantity ?? 0}
                    </span>
                    <div
                      aria-label={`${entry.asset.symbol} price history`}
                      style={{ display: 'grid', gap: 4 }}
                    >
                      {history?.status === 'loaded' && historyPrices.length ? (
                        <>
                          <svg
                            aria-hidden="true"
                            focusable="false"
                            height="48"
                            viewBox="0 0 180 48"
                            width="180"
                          >
                            <polyline
                              fill="none"
                              points={sparklinePoints}
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                          <span style={{ color: '#71717a' }}>
                            24-point trend: {priceChange >= 0 ? '+' : ''}${priceChange} · high $
                            {Math.max(...historyPrices.map((point) => point.price))} · low $
                            {Math.min(...historyPrices.map((point) => point.price))}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#71717a' }}>
                          {history?.status === 'error'
                            ? history.message ?? 'Could not load price history.'
                            : history?.status === 'loaded'
                              ? 'No price history yet.'
                              : 'Loading price history...'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        disabled={
                          isSubmitting ||
                          !isAvailable ||
                          activeCharacter.cash < entry.price ||
                          hasActionCooldown('finance_buy')
                        }
                        onClick={() =>
                          runAction(
                            '/api/finance',
                            {
                              characterId: activeCharacter.id,
                              assetKey: entry.asset.key,
                              side: 'buy',
                              quantity: 1,
                            },
                            `Bought 1 ${entry.asset.symbol}.`,
                          )
                        }
                      >
                        {cooldownButtonLabel('finance_buy', 'Buy 1')}
                      </button>
                      <button
                        disabled={
                          isSubmitting ||
                          !isAvailable ||
                          !owned ||
                          owned.quantity < 1 ||
                          hasActionCooldown('finance_sell')
                        }
                        onClick={() =>
                          runAction(
                            '/api/finance',
                            {
                              characterId: activeCharacter.id,
                              assetKey: entry.asset.key,
                              side: 'sell',
                              quantity: 1,
                            },
                            `Sold 1 ${entry.asset.symbol}.`,
                          )
                        }
                      >
                        {cooldownButtonLabel('finance_sell', 'Sell 1')}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ color: '#a1a1aa' }}>No listed assets yet.</span>
            )}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <strong>Portfolio</strong>
            {portfolio.length ? (
              portfolio.slice(0, 6).map((position) => (
                <span key={position.id} style={{ color: '#a1a1aa' }}>
                  {position.asset?.symbol ?? position.assetKey}: {position.quantity} · value $
                  {position.marketValue} · unrealized {position.unrealizedProfit >= 0 ? '+' : ''}$
                  {position.unrealizedProfit}
                </span>
              ))
            ) : (
              <span style={{ color: '#a1a1aa' }}>No portfolio holdings yet.</span>
            )}
            {assetOrders.length ? (
              <span style={{ color: '#71717a' }}>
                Last order: {assetOrders[0].side} {assetOrders[0].quantity} at $
                {assetOrders[0].priceEach}
              </span>
            ) : null}
          </div>
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-economy')}>
          <h3 style={{ marginTop: 0 }}>Casino</h3>
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>
            Table limit ${gamblingTableLimit} · lifetime profit {gamblingProfit >= 0 ? '+' : ''}$
            {gamblingProfit} · wagers {gamblingWagerCount}
          </p>
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            {gamblingGames.length ? (
              gamblingGames.map((game) => {
                const quickWager = Math.min(game.minWager, gamblingTableLimit || game.minWager);
                const mediumWager = Math.min(
                  Math.max(game.minWager, 50),
                  gamblingTableLimit || game.maxWager,
                  game.maxWager,
                );
                return (
                  <div
                    key={game.key}
                    style={{
                      borderBottom: '1px solid #27272a',
                      display: 'grid',
                      gap: 6,
                      paddingBottom: 8,
                    }}
                  >
                    <strong>{game.name}</strong>
                    <span style={{ color: '#a1a1aa' }}>
                      {game.description} · ${game.minWager}-$
                      {Math.min(game.maxWager, gamblingTableLimit || game.maxWager)}
                    </span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        disabled={
                          isSubmitting ||
                          !isAvailable ||
                          activeCharacter.cash < quickWager ||
                          quickWager < game.minWager ||
                          hasActionCooldown('gambling')
                        }
                        onClick={() =>
                          runAction(
                            '/api/gambling',
                            {
                              characterId: activeCharacter.id,
                              gameKey: game.key,
                              wager: quickWager,
                            },
                            `Played ${game.name}.`,
                          )
                        }
                      >
                        Wager ${quickWager}
                      </button>
                      <button
                        disabled={
                          isSubmitting ||
                          !isAvailable ||
                          activeCharacter.cash < mediumWager ||
                          mediumWager < game.minWager ||
                          hasActionCooldown('gambling')
                        }
                        onClick={() =>
                          runAction(
                            '/api/gambling',
                            {
                              characterId: activeCharacter.id,
                              gameKey: game.key,
                              wager: mediumWager,
                            },
                            `Played ${game.name}.`,
                          )
                        }
                      >
                        Wager ${mediumWager}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ color: '#a1a1aa' }}>No casino games available.</span>
            )}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <strong>Recent wagers</strong>
            {gamblingSummary?.recent?.length ? (
              gamblingSummary.recent.slice(0, 5).map((wager) => (
                <span key={wager.id} style={{ color: '#a1a1aa' }}>
                  {wager.gameKey}: {wager.outcome} · wager ${wager.wager} · profit{' '}
                  {wager.profit >= 0 ? '+' : ''}${wager.profit}
                </span>
              ))
            ) : (
              <span style={{ color: '#a1a1aa' }}>No wagers yet.</span>
            )}
          </div>
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-economy')}>
          <h3 style={{ marginTop: 0 }}>Contracts</h3>
          <form
            onSubmit={handleCreateContract}
            style={{ display: 'grid', gap: 8, marginBottom: 12 }}
          >
            <select name="contractType" defaultValue="delivery">
              <option value="delivery">Delivery</option>
              <option value="protection">Protection</option>
              <option value="collection">Collection</option>
              <option value="bounty">Bounty</option>
              <option value="faction_task">Faction task</option>
            </select>
            <input
              name="title"
              minLength={4}
              maxLength={80}
              required
              placeholder="Contract title"
            />
            <textarea name="description" maxLength={1000} placeholder="Contract details" />
            <input
              name="targetLocation"
              maxLength={64}
              placeholder={`Target location, default ${activeCharacter.location}`}
            />
            <input name="itemKey" maxLength={64} placeholder="Optional item key for delivery" />
            <input name="quantity" type="number" min={0} max={1000} defaultValue={0} />
            <input
              name="reward"
              type="number"
              min={25}
              max={1000000}
              required
              placeholder="Reward"
            />
            <button
              disabled={
                isSubmitting ||
                !isAvailable ||
                activeCharacter.cash < 35 ||
                hasActionCooldown('contract_create')
              }
              type="submit"
            >
              {cooldownButtonLabel('contract_create', 'Post contract')}
            </button>
          </form>
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <strong>Open board</strong>
            {contracts?.openContracts?.length ? (
              contracts.openContracts.slice(0, 6).map((contract) => (
                <div
                  key={contract.id}
                  style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 6, paddingTop: 8 }}
                >
                  <strong>{contract.title}</strong>
                  <span style={{ color: '#a1a1aa' }}>
                    {contract.contractType} · ${contract.reward} · risk {contract.risk} · target{' '}
                    {contract.targetLocation ?? 'anywhere'}
                    {contract.itemKey
                      ? ` · ${contract.quantity}x ${contract.itemName ?? contract.itemKey}`
                      : ''}
                  </span>
                  <button
                    disabled={
                      isSubmitting ||
                      !isAvailable ||
                      contract.createdByCharacterId === activeCharacter.id ||
                      hasActionCooldown('contract_accept')
                    }
                    onClick={() =>
                      runAction(
                        `/api/contracts/${contract.id}/accept`,
                        { characterId: activeCharacter.id },
                        `Accepted ${contract.title}.`,
                      )
                    }
                  >
                    Accept
                  </button>
                </div>
              ))
            ) : (
              <span style={{ color: '#a1a1aa' }}>No open contracts yet.</span>
            )}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <strong>My contracts</strong>
            {contracts?.mine?.length ? (
              contracts.mine.slice(0, 6).map((contract) => (
                <div
                  key={contract.id}
                  style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 6, paddingTop: 8 }}
                >
                  <strong>{contract.title}</strong>
                  <span style={{ color: '#a1a1aa' }}>
                    {contract.status} · {contract.contractType} · ${contract.reward} · target{' '}
                    {contract.targetLocation ?? 'anywhere'}
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      disabled={
                        isSubmitting ||
                        !isAvailable ||
                        contract.assignedToCharacterId !== activeCharacter.id ||
                        contract.status !== 'accepted' ||
                        hasActionCooldown('contract_complete')
                      }
                      onClick={() =>
                        runAction(
                          `/api/contracts/${contract.id}/complete`,
                          { characterId: activeCharacter.id },
                          `Completed ${contract.title}.`,
                        )
                      }
                    >
                      Complete
                    </button>
                    <button
                      disabled={
                        isSubmitting ||
                        contract.createdByCharacterId !== activeCharacter.id ||
                        contract.status !== 'open'
                      }
                      onClick={() =>
                        runAction(
                          `/api/contracts/${contract.id}/cancel`,
                          { characterId: activeCharacter.id },
                          `Cancelled ${contract.title}.`,
                        )
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <span style={{ color: '#a1a1aa' }}>You have no contracts yet.</span>
            )}
          </div>
        </article>

        <article
          className="card"
          id="dashboard-progression"
          hidden={!isSectionActive('dashboard-progression')}
        >
          <h3 style={{ marginTop: 0 }}>Goals / Profile</h3>
          {progressionProfile ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ color: '#a1a1aa', marginTop: 0 }}>
                Score {progressionProfile.summary.profileScore} · achievements{' '}
                {progressionProfile.summary.completedAchievements}/
                {progressionProfile.summary.totalAchievements} · claimable{' '}
                {progressionProfile.summary.claimableAchievements +
                  progressionProfile.summary.claimableObjectives}
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Daily / Weekly objectives</strong>
                {progressionProfile.objectives.length ? (
                  progressionProfile.objectives.slice(0, 6).map((entry) => {
                    const done =
                      entry.objective.status === 'completed' ||
                      entry.objective.status === 'claimed';
                    const claimed =
                      Boolean(entry.objective.claimedAt) || entry.objective.status === 'claimed';
                    return (
                      <div
                        key={entry.objective.id}
                        style={{
                          borderTop: '1px solid #27272a',
                          display: 'grid',
                          gap: 4,
                          paddingTop: 8,
                        }}
                      >
                        <strong>{entry.definition.title}</strong>
                        <span style={{ color: '#a1a1aa' }}>
                          {entry.objective.cadence} · {entry.objective.progress}/
                          {entry.objective.target} · reward ${entry.definition.rewardCash} +{' '}
                          {entry.definition.rewardExperience} XP
                        </span>
                        <ProgressBar
                          label={`${entry.definition.title} progress`}
                          value={entry.objective.progress}
                          max={entry.objective.target}
                          meta={`${entry.objective.progress}/${entry.objective.target}`}
                        />
                        <button
                          disabled={isSubmitting || !done || claimed}
                          onClick={() =>
                            runAction(
                              `/api/profile/objectives/${entry.objective.id}/claim`,
                              { characterId: activeCharacter.id },
                              `Claimed ${entry.definition.title}.`,
                            )
                          }
                        >
                          {claimed ? 'Claimed' : done ? 'Claim reward' : 'In progress'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No active objectives yet.</span>
                )}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Achievements</strong>
                {progressionProfile.achievements.length ? (
                  progressionProfile.achievements.slice(0, 8).map((entry) => {
                    const claimed = Boolean(entry.progress.claimedAt);
                    return (
                      <div
                        key={entry.definition.key}
                        style={{
                          borderTop: '1px solid #27272a',
                          display: 'grid',
                          gap: 4,
                          paddingTop: 8,
                        }}
                      >
                        <strong>{entry.definition.title}</strong>
                        <span style={{ color: '#a1a1aa' }}>
                          {entry.definition.category} · {entry.progress.progress}/
                          {entry.progress.target} · {entry.definition.points} pts · reward $
                          {entry.definition.cashReward} + {entry.definition.experienceReward} XP
                          {entry.definition.titleRewardName
                            ? ` · title ${entry.definition.titleRewardName}`
                            : ''}
                        </span>
                        <ProgressBar
                          label={`${entry.definition.title} progress`}
                          value={entry.progress.progress}
                          max={entry.progress.target}
                          meta={`${entry.progress.progress}/${entry.progress.target}`}
                        />
                        <button
                          disabled={isSubmitting || !entry.progress.isCompleted || claimed}
                          onClick={() =>
                            runAction(
                              `/api/profile/achievements/${entry.definition.key}/claim`,
                              { characterId: activeCharacter.id },
                              `Claimed ${entry.definition.title}.`,
                            )
                          }
                        >
                          {claimed
                            ? 'Claimed'
                            : entry.progress.isCompleted
                              ? 'Claim reward'
                              : 'In progress'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No achievements loaded.</span>
                )}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Titles</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    disabled={isSubmitting || !progressionProfile.activeTitle}
                    onClick={() =>
                      runAction(
                        '/api/profile/titles/active',
                        { characterId: activeCharacter.id, titleKey: null },
                        'Cleared active title.',
                      )
                    }
                  >
                    Clear title
                  </button>
                  {progressionProfile.titles.length ? (
                    progressionProfile.titles.slice(0, 8).map((title) => (
                      <button
                        key={title.id}
                        disabled={isSubmitting || title.isActive}
                        onClick={() =>
                          runAction(
                            '/api/profile/titles/active',
                            { characterId: activeCharacter.id, titleKey: title.titleKey },
                            `Equipped title ${title.title}.`,
                          )
                        }
                      >
                        {title.isActive ? `Active: ${title.title}` : title.title}
                      </button>
                    ))
                  ) : (
                    <span style={{ color: '#a1a1aa' }}>Claim achievements to unlock titles.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <span style={{ color: '#a1a1aa' }}>
              Create a character to start earning achievements and objectives.
            </span>
          )}
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-progression')}>
          <h3 style={{ marginTop: 0 }}>Season / Legacy</h3>
          {seasonProfile ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {seasonProfile.season ? (
                <div>
                  <strong>{seasonProfile.season.title}</strong>
                  <p style={{ color: '#a1a1aa', margin: '6px 0 0' }}>
                    {seasonProfile.rankBand} · {seasonProfile.progress?.seasonPoints ?? 0} points ·
                    ends {formatDateOnly(seasonProfile.season.endsAt)}
                  </p>
                </div>
              ) : (
                <span style={{ color: '#a1a1aa' }}>No active season.</span>
              )}

              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Season rewards</strong>
                {seasonProfile.rewards.length ? (
                  seasonProfile.rewards.map((reward) => {
                    const seasonPoints = seasonProfile.progress?.seasonPoints ?? 0;
                    const claimed =
                      reward.tier <= (seasonProfile.progress?.highestClaimedTier ?? 0);
                    const claimable =
                      seasonPoints >= reward.pointsRequired &&
                      !claimed &&
                      reward.tier === (seasonProfile.progress?.highestClaimedTier ?? 0) + 1;
                    return (
                      <div
                        key={reward.id}
                        style={{
                          borderTop: '1px solid #27272a',
                          display: 'grid',
                          gap: 4,
                          paddingTop: 8,
                        }}
                      >
                        <strong>
                          Tier {reward.tier}: {reward.title}
                        </strong>
                        <span style={{ color: '#a1a1aa' }}>
                          {reward.pointsRequired} pts · ${reward.rewardCash} +{' '}
                          {reward.rewardExperience} XP + {reward.rewardLegacyPoints} legacy
                          {reward.titleRewardName ? ` · title ${reward.titleRewardName}` : ''}
                        </span>
                        <ProgressBar
                          label={`${reward.title} season progress`}
                          value={seasonPoints}
                          max={reward.pointsRequired}
                          meta={`${Math.min(seasonPoints, reward.pointsRequired)}/${reward.pointsRequired} pts`}
                        />
                        <button
                          disabled={isSubmitting || !claimable}
                          onClick={() =>
                            runAction(
                              '/api/seasons/rewards',
                              { characterId: activeCharacter.id, tier: reward.tier },
                              `Claimed season tier ${reward.tier}.`,
                            )
                          }
                        >
                          {claimed ? 'Claimed' : claimable ? 'Claim reward' : 'Locked'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No season rewards loaded.</span>
                )}
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Prestige readiness</strong>
                <span style={{ color: '#a1a1aa' }}>
                  Level {activeCharacter.level}/{seasonProfile.prestigeReadiness.requiredLevel} ·
                  profile {progressionProfile?.summary.profileScore ?? 0}/
                  {seasonProfile.prestigeReadiness.requiredProfileScore} · net worth $
                  {seasonProfile.prestigeReadiness.netWorth}/$
                  {seasonProfile.prestigeReadiness.requiredNetWorth}
                </span>
                <div className="progress-grid">
                  <ProgressBar
                    label="Level readiness"
                    value={activeCharacter.level}
                    max={seasonProfile.prestigeReadiness.requiredLevel}
                    meta={`${activeCharacter.level}/${seasonProfile.prestigeReadiness.requiredLevel}`}
                  />
                  <ProgressBar
                    label="Profile score"
                    value={progressionProfile?.summary.profileScore ?? 0}
                    max={seasonProfile.prestigeReadiness.requiredProfileScore}
                    meta={`${progressionProfile?.summary.profileScore ?? 0}/${seasonProfile.prestigeReadiness.requiredProfileScore}`}
                  />
                  <ProgressBar
                    label="Net worth"
                    value={seasonProfile.prestigeReadiness.netWorth}
                    max={seasonProfile.prestigeReadiness.requiredNetWorth}
                    meta={`$${seasonProfile.prestigeReadiness.netWorth}/$${seasonProfile.prestigeReadiness.requiredNetWorth}`}
                  />
                </div>
                <button
                  disabled={isSubmitting || !isAvailable || !seasonProfile.prestigeReadiness.ready}
                  onClick={() =>
                    runAction(
                      '/api/prestige',
                      { characterId: activeCharacter.id },
                      'Entered legacy prestige.',
                    )
                  }
                >
                  Prestige / start legacy run
                </button>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <strong>Legacy perks</strong>
                {seasonProfile.legacyPerks.length ? (
                  seasonProfile.legacyPerks.map((perk) => (
                    <span key={perk.id} style={{ color: '#a1a1aa' }}>
                      {perk.perkKey} · tier {perk.tier}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No legacy perks yet.</span>
                )}
              </div>
            </div>
          ) : (
            <span style={{ color: '#a1a1aa' }}>Season profile unavailable.</span>
          )}
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-progression')}>
          <h3 style={{ marginTop: 0 }}>Crafting / Workshops</h3>

          {contactsProfile ? (
            <article className="card">
              <h3 style={{ marginTop: 0 }}>Contacts / Crew</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <strong>Recruitable</strong>
                {contactsProfile.recruitable
                  .filter((contact) => !contact.owned)
                  .slice(0, 4)
                  .map((contact) => (
                    <button
                      key={contact.key}
                      disabled={
                        isSubmitting || !contact.canRecruit || hasActionCooldown('contacts')
                      }
                      onClick={() =>
                        runAction(
                          '/api/contacts',
                          {
                            action: 'recruit',
                            characterId: activeCharacter.id,
                            contactKey: contact.key,
                          },
                          `Recruited ${contact.name}.`,
                        )
                      }
                    >
                      {contact.name} · {contact.specialty} · ${contact.recruitCost}
                    </button>
                  ))}
                <strong>Active contacts</strong>
                {contactsProfile.contacts.length ? (
                  contactsProfile.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      style={{ border: '1px solid #3f3f46', borderRadius: 8, padding: 10 }}
                    >
                      <p style={{ margin: 0 }}>
                        {contact.nickname || contact.definition?.name || contact.contactKey} ·{' '}
                        {contact.specialty} · L{contact.level}
                      </p>
                      <p style={{ margin: '4px 0', color: '#a1a1aa' }}>
                        Status: {contact.status} · Loyalty: {contact.loyalty} · Upkeep: $
                        {contact.upkeep}
                      </p>
                      <ProgressBar
                        label={`${contact.nickname || contact.definition?.name || contact.contactKey} loyalty`}
                        value={contact.loyalty}
                        max={100}
                        meta={`${contact.loyalty}/100 loyalty`}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button
                          disabled={
                            isSubmitting ||
                            contact.status !== 'idle' ||
                            hasActionCooldown('contacts')
                          }
                          onClick={() =>
                            runAction(
                              '/api/contacts',
                              {
                                action: 'assign',
                                characterId: activeCharacter.id,
                                contactId: contact.id,
                                assignmentType: 'job_assist',
                              },
                              'Contact assigned to job assist.',
                            )
                          }
                        >
                          Job assist
                        </button>
                        <button
                          disabled={
                            isSubmitting ||
                            contact.status !== 'idle' ||
                            hasActionCooldown('contacts')
                          }
                          onClick={() =>
                            runAction(
                              '/api/contacts',
                              {
                                action: 'assign',
                                characterId: activeCharacter.id,
                                contactId: contact.id,
                                assignmentType: 'crime_setup',
                              },
                              'Contact assigned to crime setup.',
                            )
                          }
                        >
                          Crime setup
                        </button>
                        <button
                          disabled={
                            isSubmitting ||
                            contact.status !== 'idle' ||
                            hasActionCooldown('contacts')
                          }
                          onClick={() =>
                            runAction(
                              '/api/contacts',
                              {
                                action: 'assign',
                                characterId: activeCharacter.id,
                                contactId: contact.id,
                                assignmentType: 'market_tip',
                              },
                              'Contact assigned to gather market tips.',
                            )
                          }
                        >
                          Market tip
                        </button>
                        <button
                          disabled={isSubmitting || hasActionCooldown('contacts')}
                          onClick={() =>
                            runAction(
                              '/api/contacts',
                              {
                                action: 'pay_upkeep',
                                characterId: activeCharacter.id,
                                contactId: contact.id,
                              },
                              'Paid contact upkeep.',
                            )
                          }
                        >
                          Pay upkeep
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No contacts recruited yet.</p>
                )}
                <strong>Recent assignments</strong>
                {contactsProfile.assignments.slice(0, 5).map((assignment) => (
                  <p key={assignment.id} style={{ margin: 0, color: '#a1a1aa' }}>
                    {assignment.assignmentType} · {assignment.status} · reward $
                    {assignment.rewardCash}
                  </p>
                ))}
              </div>
            </article>
          ) : null}

          {craftingProfile ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <form onSubmit={handleBuildWorkshop} style={{ display: 'grid', gap: 8 }}>
                <strong>Build workshop</strong>
                <select name="workshopType" required defaultValue="garage">
                  <option value="garage">Garage</option>
                  <option value="electronics">Electronics</option>
                  <option value="clinic">Clinic</option>
                  <option value="tailor">Tailor</option>
                  <option value="forge">Forge</option>
                  <option value="lab">Lab</option>
                </select>
                <input name="name" placeholder="Workshop name" maxLength={48} />
                <button
                  disabled={isSubmitting || !isAvailable || hasActionCooldown('crafting')}
                  type="submit"
                >
                  Build workshop
                </button>
              </form>

              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Owned workshops</strong>
                {craftingProfile.workshops.length ? (
                  craftingProfile.workshops.map((workshop) => (
                    <div
                      key={workshop.id}
                      style={{
                        borderTop: '1px solid #27272a',
                        paddingTop: 8,
                        display: 'grid',
                        gap: 4,
                      }}
                    >
                      <span>
                        {workshop.name} · {workshop.workshopType} · level {workshop.level} ·
                        condition {workshop.condition}
                      </span>
                      <span style={{ color: '#a1a1aa' }}>
                        Storage {workshop.storageCapacity} ·{' '}
                        {workshop.isHidden ? 'hidden' : 'visible'}
                      </span>
                      <ProgressBar
                        label={`${workshop.name} condition`}
                        value={workshop.condition}
                        max={100}
                        meta={`${workshop.condition}/100 condition`}
                      />
                      <button
                        disabled={isSubmitting || !isAvailable || hasActionCooldown('crafting')}
                        onClick={() =>
                          runAction(
                            '/api/crafting',
                            {
                              action: 'upgrade_workshop',
                              characterId: activeCharacter.id,
                              workshopId: workshop.id,
                            },
                            `Upgraded ${workshop.name}.`,
                          )
                        }
                      >
                        Upgrade workshop
                      </button>
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>
                    No workshops yet. Build one to craft items.
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Recipes</strong>
                {craftingProfile.recipes.length ? (
                  craftingProfile.recipes.slice(0, 8).map((recipe) => (
                    <div
                      key={recipe.key}
                      style={{
                        borderTop: '1px solid #27272a',
                        paddingTop: 8,
                        display: 'grid',
                        gap: 4,
                      }}
                    >
                      <span>
                        {recipe.name} → {recipe.outputQuantity}x{' '}
                        {recipe.outputItem?.name ?? recipe.outputItemKey}
                      </span>
                      <span style={{ color: '#a1a1aa' }}>
                        {recipe.workshopType} · ${recipe.cashCost} · energy {recipe.energyCost} ·{' '}
                        {Math.round(recipe.estimatedDurationSeconds / 60)}m · risk{' '}
                        {recipe.estimatedRisk}
                      </span>
                      <span style={{ color: '#a1a1aa' }}>
                        Inputs:{' '}
                        {Object.entries(recipe.inputs)
                          .map(([key, qty]) => `${qty}x ${key}`)
                          .join(', ') || 'none'}
                      </span>
                      {!recipe.canStart ? (
                        <span style={{ color: '#fca5a5' }}>{recipe.missingReasons.join(' ')}</span>
                      ) : null}
                      <button
                        disabled={
                          isSubmitting ||
                          !isAvailable ||
                          !recipe.canStart ||
                          hasActionCooldown('crafting')
                        }
                        onClick={() =>
                          runAction(
                            '/api/crafting',
                            {
                              action: 'start_recipe',
                              characterId: activeCharacter.id,
                              recipeKey: recipe.key,
                              workshopId: recipe.workshopId ?? undefined,
                            },
                            `Started ${recipe.name}.`,
                          )
                        }
                      >
                        Start recipe
                      </button>
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No recipes available.</span>
                )}
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Recent crafting jobs</strong>
                {craftingProfile.jobs.length ? (
                  craftingProfile.jobs.slice(0, 6).map((job) => (
                    <span key={job.id} style={{ color: '#a1a1aa' }}>
                      {job.recipe?.name ?? job.recipeKey} · {job.status} · {job.outputQuantity}x{' '}
                      {job.outputItem?.name ?? job.outputItemKey} · completes{' '}
                      {formatDateTime(job.completesAt)}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No crafting jobs yet.</span>
                )}
              </div>
            </div>
          ) : (
            <span style={{ color: '#a1a1aa' }}>Crafting profile unavailable.</span>
          )}
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-progression')}>
          <h3 style={{ marginTop: 0 }}>Vehicles / Garage</h3>
          {vehicleProfile?.vehicles.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {vehicleProfile.vehicles.map((vehicle) => {
                const installed = new Set(
                  vehicle.installedUpgrades.map((upgrade) => upgrade.upgradeKey),
                );
                return (
                  <div
                    key={vehicle.id}
                    style={{ border: '1px solid #3f3f46', borderRadius: 10, padding: 12 }}
                  >
                    <strong>{vehicle.itemName}</strong>
                    <p style={{ margin: '6px 0', color: '#a1a1aa' }}>
                      Durability {vehicle.durability}/{vehicle.maxDurability} · Capacity{' '}
                      {vehicle.stats.cargoCapacity ?? 0} · Speed {vehicle.stats.travelSpeed ?? 0} ·
                      Safety {vehicle.stats.travelSafety ?? 0}
                    </p>
                    <ProgressBar
                      label={`${vehicle.itemName} durability`}
                      value={vehicle.durability}
                      max={vehicle.maxDurability}
                      meta={`${vehicle.durability}/${vehicle.maxDurability} durability`}
                    />
                    <p style={{ margin: '6px 0', color: '#a1a1aa' }}>
                      Installed:{' '}
                      {vehicle.installedUpgrades.length
                        ? vehicle.installedUpgrades.map((upgrade) => upgrade.name).join(', ')
                        : 'No upgrades yet'}
                    </p>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {vehicleProfile.upgrades
                        .filter((upgrade) => activeCharacter.level >= upgrade.requiredLevel)
                        .slice(0, 6)
                        .map((upgrade) => (
                          <button
                            key={`${vehicle.id}-${upgrade.key}`}
                            disabled={
                              isSubmitting ||
                              !isAvailable ||
                              installed.has(upgrade.key) ||
                              activeCharacter.cash < upgrade.cashCost ||
                              hasActionCooldown('vehicle_upgrade')
                            }
                            onClick={() =>
                              runAction(
                                '/api/vehicles',
                                {
                                  action: 'upgrade',
                                  characterId: activeCharacter.id,
                                  equipmentId: vehicle.id,
                                  upgradeKey: upgrade.key,
                                },
                                `Installed ${upgrade.name}.`,
                              )
                            }
                          >
                            {installed.has(upgrade.key) ? 'Installed' : 'Install'} {upgrade.name} ·
                            ${upgrade.cashCost}
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#a1a1aa' }}>
              Equip a vehicle from your gear inventory to unlock route bonuses, smuggling capacity,
              and vehicle upgrades.
            </p>
          )}
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-progression')}>
          <h3 style={{ marginTop: 0 }}>Gear / Equipment</h3>
          {equipmentProfile ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong>Equipped</strong>
                {equipmentProfile.equipped.length ? (
                  equipmentProfile.equipped.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderTop: '1px solid #27272a',
                        paddingTop: 8,
                        display: 'grid',
                        gap: 4,
                      }}
                    >
                      <span>
                        {item.slot}: {item.itemName} · durability {item.durability}/
                        {item.maxDurability}
                      </span>
                      <ProgressBar
                        label={`${item.itemName} durability`}
                        value={item.durability}
                        max={item.maxDurability}
                        meta={`${item.durability}/${item.maxDurability}`}
                      />
                      <span style={{ color: '#a1a1aa' }}>
                        {formatModifiers(item.modifiers) || 'No active modifiers'}
                      </span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          disabled={isSubmitting || hasActionCooldown('equipment_change')}
                          onClick={() =>
                            runAction(
                              '/api/equipment',
                              {
                                action: 'unequip',
                                characterId: activeCharacter.id,
                                slot: item.slot,
                              },
                              `Unequipped ${item.itemName}.`,
                            )
                          }
                        >
                          Unequip
                        </button>
                        <button
                          disabled={
                            isSubmitting ||
                            item.repairCost <= 0 ||
                            activeCharacter.cash < item.repairCost ||
                            hasActionCooldown('equipment_change')
                          }
                          onClick={() =>
                            runAction(
                              '/api/equipment',
                              {
                                action: 'repair',
                                characterId: activeCharacter.id,
                                equipmentId: item.id,
                              },
                              `Repaired ${item.itemName}.`,
                            )
                          }
                        >
                          Repair ${item.repairCost}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No gear equipped yet.</span>
                )}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <strong>Effective stats</strong>
                <span style={{ color: '#a1a1aa' }}>
                  STR {equipmentProfile.effectiveStats.strength} · STA{' '}
                  {equipmentProfile.effectiveStats.stamina} · DEF{' '}
                  {equipmentProfile.effectiveStats.defense} · DEX{' '}
                  {equipmentProfile.effectiveStats.dexterity} · INT{' '}
                  {equipmentProfile.effectiveStats.intelligence}
                </span>
                <span style={{ color: '#a1a1aa' }}>
                  {formatModifiers(equipmentProfile.modifiers) || 'No gear bonuses active.'}
                </span>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <strong>Inventory gear</strong>
                {equipmentProfile.inventoryGear.length ? (
                  equipmentProfile.inventoryGear.slice(0, 8).map((item) => (
                    <div
                      key={item.inventoryItemId}
                      style={{
                        borderTop: '1px solid #27272a',
                        paddingTop: 8,
                        display: 'grid',
                        gap: 4,
                      }}
                    >
                      <span>
                        {item.itemName} · {item.slot} · owned {item.quantity}
                      </span>
                      <span style={{ color: '#a1a1aa' }}>
                        {formatModifiers(item.modifiers) || 'No modifiers'}
                      </span>
                      <button
                        disabled={
                          isSubmitting || !isAvailable || hasActionCooldown('equipment_change')
                        }
                        onClick={() =>
                          runAction(
                            '/api/equipment',
                            {
                              action: 'equip',
                              characterId: activeCharacter.id,
                              inventoryItemId: item.inventoryItemId,
                            },
                            `Equipped ${item.itemName}.`,
                          )
                        }
                      >
                        Equip
                      </button>
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>
                    Buy gear from the market or shops to equip it.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span style={{ color: '#a1a1aa' }}>Equipment profile unavailable.</span>
          )}
        </article>

        <article className="card" hidden={!isSectionActive('dashboard-crew')}>
          <h3 style={{ marginTop: 0 }}>PvP / Bounties / Wars</h3>
          {pvpProfile ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Local targets</strong>
                {pvpProfile.possibleTargets.length ? (
                  pvpProfile.possibleTargets.slice(0, 6).map((target) => (
                    <div
                      key={target.id}
                      style={{
                        borderTop: '1px solid #27272a',
                        paddingTop: 8,
                        display: 'grid',
                        gap: 4,
                      }}
                    >
                      <span>
                        {target.name} · level {target.level} · health {target.health} · cash $
                        {target.cash}
                      </span>
                      <ProgressBar
                        label={`${target.name} health`}
                        value={target.health}
                        max={100}
                        meta={`${target.health}/100 health`}
                      />
                      <button
                        disabled={isSubmitting || !isAvailable || hasActionCooldown('pvp_attack')}
                        onClick={() =>
                          runAction(
                            '/api/pvp/attack',
                            {
                              attackerCharacterId: activeCharacter.id,
                              defenderCharacterId: target.id,
                            },
                            `Attacked ${target.name}.`,
                          )
                        }
                      >
                        Attack
                      </button>
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No available local targets.</span>
                )}
              </div>

              <form
                onSubmit={handleCreateBounty}
                style={{ borderTop: '1px solid #27272a', paddingTop: 12, display: 'grid', gap: 8 }}
              >
                <strong>Post bounty</strong>
                <select name="targetCharacterId" required defaultValue="">
                  <option value="" disabled>
                    Select local target
                  </option>
                  {pvpProfile.possibleTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
                <input
                  name="reward"
                  type="number"
                  min={100}
                  max={1000000}
                  placeholder="Reward"
                  required
                />
                <input name="reason" maxLength={500} placeholder="Reason / message" />
                <button
                  disabled={isSubmitting || !isAvailable || hasActionCooldown('bounty_create')}
                  type="submit"
                >
                  Post bounty
                </button>
              </form>

              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Open bounties</strong>
                {pvpProfile.activeBounties.length ? (
                  pvpProfile.activeBounties.slice(0, 6).map((bounty) => (
                    <div key={bounty.id} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
                      <span>
                        ${bounty.reward} reward · target {bounty.targetCharacterId.slice(0, 8)} ·
                        expires {bounty.expiresAt ? formatDateTime(bounty.expiresAt) : 'unknown'}
                      </span>
                      {bounty.createdByCharacterId === activeCharacter.id ? (
                        <button
                          disabled={isSubmitting}
                          onClick={() =>
                            runAction(
                              `/api/bounties/${bounty.id}/cancel`,
                              { characterId: activeCharacter.id },
                              'Cancelled bounty.',
                            )
                          }
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No open bounties.</span>
                )}
              </div>

              {ownFaction?.faction ? (
                <form
                  onSubmit={handleDeclareWar}
                  style={{
                    borderTop: '1px solid #27272a',
                    paddingTop: 12,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <strong>Declare faction war</strong>
                  <select name="defenderFactionId" required defaultValue="">
                    <option value="" disabled>
                      Select rival faction
                    </option>
                    {factions
                      .filter((faction) => faction.id !== ownFaction.faction?.id)
                      .map((faction) => (
                        <option key={faction.id} value={faction.id}>
                          {faction.name} [{faction.tag}]
                        </option>
                      ))}
                  </select>
                  <select name="territoryKey" defaultValue="">
                    <option value="">No specific territory</option>
                    {territories.map((territory) => (
                      <option key={territory.key} value={territory.key}>
                        {territory.name}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={isSubmitting || !isAvailable || hasActionCooldown('faction_action')}
                    type="submit"
                  >
                    Declare war
                  </button>
                </form>
              ) : null}

              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Active wars</strong>
                {pvpProfile.activeWars.length ? (
                  pvpProfile.activeWars.slice(0, 6).map((war) => (
                    <span key={war.id} style={{ color: '#a1a1aa' }}>
                      {war.status} · {war.attackerScore} / {war.defenderScore} · territory{' '}
                      {war.territoryKey ?? 'none'} · ends{' '}
                      {war.endsAt ? formatDateTime(war.endsAt) : 'unknown'}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa' }}>No active wars.</span>
                )}
              </div>
            </div>
          ) : (
            <span style={{ color: '#a1a1aa' }}>PvP profile unavailable.</span>
          )}
        </article>

        <ActionCard
          hidden={!isSectionActive('dashboard-economy')}
          title="Market"
          items={market}
          empty="No market prices available."
          render={(entry) => {
            const owned = inventoryByKey.get(entry.item.key) ?? 0;
            return (
              <div style={{ display: 'grid', gap: 6 }}>
                <strong>{entry.item.name}</strong>
                <span>
                  ${entry.price} · supply {entry.supply} · owned {owned}
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    disabled={isSubmitting || !isAvailable || hasActionCooldown('market_buy')}
                    onClick={() =>
                      runAction(
                        '/api/market',
                        {
                          action: 'buy',
                          characterId: activeCharacter.id,
                          itemKey: entry.item.key,
                          quantity: 1,
                        },
                        `Bought ${entry.item.name}.`,
                      )
                    }
                  >
                    Buy 1
                  </button>
                  <button
                    disabled={
                      isSubmitting || !isAvailable || owned < 1 || hasActionCooldown('market_sell')
                    }
                    onClick={() =>
                      runAction(
                        '/api/market',
                        {
                          action: 'sell',
                          characterId: activeCharacter.id,
                          itemKey: entry.item.key,
                          quantity: 1,
                        },
                        `Sold ${entry.item.name}.`,
                      )
                    }
                  >
                    Sell 1
                  </button>
                </div>
              </div>
            );
          }}
        />
      </div>
    </section>
  );
}

function ProgressBar({
  label,
  value,
  max,
  meta,
}: {
  label: string;
  value: number;
  max: number;
  meta?: string;
}) {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((safeValue / safeMax) * 100);

  return (
    <div className="progress-meter">
      <div className="progress-meter__header">
        <span>{label}</span>
        <strong>{meta ?? `${percent}%`}</strong>
      </div>
      <progress value={safeValue} max={safeMax} aria-label={`${label}: ${meta ?? `${percent}%`}`} />
    </div>
  );
}

function formatModifiers(modifiers: Record<string, number>) {
  return Object.entries(modifiers)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`)
    .join(' · ');
}

function ActionCard<T>({
  title,
  items,
  empty,
  render,
  hidden = false,
}: {
  title: string;
  items: T[];
  empty: string;
  render: (item: T) => ReactNode;
  hidden?: boolean;
}) {
  if (hidden) {
    return null;
  }

  return (
    <article className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.length ? (
          items.map((item, index) => <div key={index}>{render(item)}</div>)
        ) : (
          <p>{empty}</p>
        )}
      </div>
    </article>
  );
}
