export type MarketPriceInput = {
  basePrice: number;
  supply: number;
  demand: number;
  volatility: number;
};

export function calculateMarketPrice(input: MarketPriceInput): number {
  return calculateMarketPressure(input).price;
}

export type MarketPressureSnapshot = {
  basePrice: number;
  supply: number;
  demand: number;
  volatility: number;
  pressure: number;
  volatilityMultiplier: number;
  price: number;
};

function normalizePositiveInteger(value: number, fallback = 1) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

function normalizeMultiplier(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0.1, Math.min(5, value));
}

export function calculateMarketPressure(input: MarketPriceInput): MarketPressureSnapshot {
  const basePrice = normalizePositiveInteger(input.basePrice);
  const supply = normalizePositiveInteger(input.supply);
  const demand = normalizePositiveInteger(input.demand);
  const volatility = Number.isFinite(input.volatility) ? input.volatility : 0;
  const pressure = demand / supply;
  const volatilityMultiplier = Math.max(0.1, 1 + volatility * 0.03);

  return {
    basePrice,
    supply,
    demand,
    volatility,
    pressure,
    volatilityMultiplier,
    price: Math.max(1, Math.floor(basePrice * pressure * volatilityMultiplier)),
  };
}

export type MarketEventKind =
  'shortage' | 'surplus' | 'demand_spike' | 'crackdown' | 'route_disruption';

export type MarketEventDefinition = {
  key: string;
  name: string;
  kind: MarketEventKind;
  description: string;
  durationHours: number;
  supplyMultiplier: number;
  demandMultiplier: number;
  volatilityDelta: number;
  riskDelta: number;
  priceFloorMultiplier?: number;
  priceCeilingMultiplier?: number;
};

export const MARKET_EVENTS: MarketEventDefinition[] = [
  {
    key: 'port_congestion',
    name: 'Port congestion',
    kind: 'shortage',
    description: 'Import delays reduce available market stock and make prices less predictable.',
    durationHours: 12,
    supplyMultiplier: 0.65,
    demandMultiplier: 1.05,
    volatilityDelta: 2,
    riskDelta: 1,
    priceFloorMultiplier: 1.1,
  },
  {
    key: 'warehouse_surplus',
    name: 'Warehouse surplus',
    kind: 'surplus',
    description: 'A temporary stock overhang improves supply and cools prices.',
    durationHours: 8,
    supplyMultiplier: 1.45,
    demandMultiplier: 0.95,
    volatilityDelta: -1,
    riskDelta: 0,
    priceCeilingMultiplier: 0.9,
  },
  {
    key: 'street_festival',
    name: 'Street festival',
    kind: 'demand_spike',
    description: 'Crowds lift short-term demand for legal and grey-market goods.',
    durationHours: 6,
    supplyMultiplier: 1,
    demandMultiplier: 1.35,
    volatilityDelta: 1,
    riskDelta: 0,
  },
  {
    key: 'district_crackdown',
    name: 'District crackdown',
    kind: 'crackdown',
    description: 'Police pressure disrupts supply, increases risk, and makes pricing unstable.',
    durationHours: 10,
    supplyMultiplier: 0.8,
    demandMultiplier: 0.9,
    volatilityDelta: 3,
    riskDelta: 3,
    priceFloorMultiplier: 1,
  },
  {
    key: 'route_disruption',
    name: 'Route disruption',
    kind: 'route_disruption',
    description: 'Transport delays make availability uneven until routes normalize.',
    durationHours: 4,
    supplyMultiplier: 0.75,
    demandMultiplier: 1,
    volatilityDelta: 2,
    riskDelta: 1,
  },
];

export type MarketEventImpactInput = MarketPriceInput & {
  eventKey?: string | null;
  risk?: number | null;
};

export function listMarketEventDefinitions() {
  return MARKET_EVENTS.map((event) => ({ ...event }));
}

export function getMarketEventDefinition(eventKey: string) {
  return MARKET_EVENTS.find((event) => event.key === eventKey) ?? null;
}

export function calculateMarketEventImpact(input: MarketEventImpactInput) {
  const baseline = calculateMarketPressure(input);
  const event = input.eventKey ? getMarketEventDefinition(input.eventKey) : null;
  const baseRisk = Math.max(0, Math.floor(input.risk ?? 0));

  if (input.eventKey && !event) {
    return {
      ok: false as const,
      code: 'not_found' as const,
      message: 'Market event not found.',
      event: null,
      baseline,
      adjusted: baseline,
      riskBefore: baseRisk,
      riskAfter: baseRisk,
      priceDelta: 0,
      priceDeltaPercent: 0,
    };
  }

  if (!event) {
    return {
      ok: true as const,
      code: 'ok' as const,
      message: 'No market event applied.',
      event: null,
      baseline,
      adjusted: baseline,
      riskBefore: baseRisk,
      riskAfter: baseRisk,
      priceDelta: 0,
      priceDeltaPercent: 0,
    };
  }

  const adjustedSupply = Math.max(
    1,
    Math.floor(baseline.supply * normalizeMultiplier(event.supplyMultiplier)),
  );
  const adjustedDemand = Math.max(
    1,
    Math.floor(baseline.demand * normalizeMultiplier(event.demandMultiplier)),
  );
  const adjustedVolatility = baseline.volatility + event.volatilityDelta;
  const adjustedPressure = calculateMarketPressure({
    basePrice: baseline.basePrice,
    supply: adjustedSupply,
    demand: adjustedDemand,
    volatility: adjustedVolatility,
  });
  const floorPrice = event.priceFloorMultiplier
    ? Math.floor(baseline.basePrice * normalizeMultiplier(event.priceFloorMultiplier))
    : 1;
  const ceilingPrice = event.priceCeilingMultiplier
    ? Math.floor(baseline.basePrice * normalizeMultiplier(event.priceCeilingMultiplier))
    : Number.POSITIVE_INFINITY;
  const boundedPrice = Math.min(Math.max(adjustedPressure.price, floorPrice), ceilingPrice);
  const adjusted = { ...adjustedPressure, price: Math.max(1, boundedPrice) };
  const priceDelta = adjusted.price - baseline.price;

  return {
    ok: true as const,
    code: 'ok' as const,
    message: 'Market event applied.',
    event,
    baseline,
    adjusted,
    riskBefore: baseRisk,
    riskAfter: Math.max(0, baseRisk + event.riskDelta),
    priceDelta,
    priceDeltaPercent:
      baseline.price > 0 ? Math.round((priceDelta / baseline.price) * 10_000) / 100 : 0,
  };
}

export type MarketEventScheduleStatus = 'upcoming' | 'active' | 'expired';

export type MarketEventOccurrence = {
  eventKey: string;
  location: string;
  itemKey: string | null;
  startsAt: Date;
  endsAt: Date;
  status: MarketEventScheduleStatus;
  event: MarketEventDefinition;
};

export type MarketEventScheduleInput = {
  location: string;
  itemKey?: string | null;
  now?: Date | string | number;
  seed?: string | number | null;
  cadenceHours?: number;
  allowedEventKeys?: string[] | null;
};

export type MarketEventLifecycleInput = {
  startsAt: Date | string | number;
  endsAt: Date | string | number;
  now?: Date | string | number;
};

export type PersistedMarketEventOccurrenceInput = {
  eventKey: string;
  location: string;
  itemKey?: string | null;
  startsAt: Date | string | number;
  endsAt: Date | string | number;
  now?: Date | string | number;
};

export type MarketEventNewsArticle = {
  category: 'market';
  title: string;
  excerpt: string;
  body: string;
  metadata: {
    source: 'market_event';
    eventKey: string;
    eventKind: MarketEventKind;
    location: string;
    itemKey: string | null;
    startsAt: string;
    endsAt: string;
    status: MarketEventScheduleStatus;
  };
};

const DEFAULT_MARKET_EVENT_CADENCE_HOURS = 6;

function normalizeDateInput(value: Date | string | number | undefined, fallback = new Date()) {
  const date = value === undefined ? fallback : new Date(value);
  return Number.isFinite(date.getTime()) ? date : fallback;
}

function normalizeScheduleLocation(location: string) {
  const normalized = location.trim().toLowerCase();
  return normalized || 'starter-city';
}

function deterministicHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function calculateMarketEventLifecycle(input: MarketEventLifecycleInput) {
  const now = normalizeDateInput(input.now);
  const startsAt = normalizeDateInput(input.startsAt, now);
  const endsAt = normalizeDateInput(input.endsAt, startsAt);
  const startsInSeconds = Math.max(0, Math.floor((startsAt.getTime() - now.getTime()) / 1000));
  const expiresInSeconds = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));
  const status: MarketEventScheduleStatus =
    now < startsAt ? 'upcoming' : now >= endsAt ? 'expired' : 'active';

  return {
    status,
    startsAt,
    endsAt,
    startsInSeconds,
    expiresInSeconds,
    isActive: status === 'active',
  };
}

export function scheduleMarketEventOccurrence(
  input: MarketEventScheduleInput,
): MarketEventOccurrence | null {
  const location = normalizeScheduleLocation(input.location);
  const itemKey = input.itemKey?.trim() || null;
  const now = normalizeDateInput(input.now);
  const cadenceHours = Math.max(
    1,
    Math.min(72, Math.floor(input.cadenceHours ?? DEFAULT_MARKET_EVENT_CADENCE_HOURS)),
  );
  const cadenceMs = cadenceHours * 60 * 60 * 1000;
  const bucketStartMs = Math.floor(now.getTime() / cadenceMs) * cadenceMs;
  const bucket = Math.floor(bucketStartMs / cadenceMs);
  const allowedKeys = new Set(
    input.allowedEventKeys?.filter((key) => getMarketEventDefinition(key)) ??
      MARKET_EVENTS.map((event) => event.key),
  );
  const candidates = MARKET_EVENTS.filter((event) => allowedKeys.has(event.key));

  if (candidates.length === 0) {
    return null;
  }

  const seed = String(input.seed ?? 'default');
  const selector = deterministicHash([seed, location, itemKey ?? 'all-items', bucket].join('|'));
  const event = candidates[selector % candidates.length];
  const startsAt = new Date(bucketStartMs);
  const endsAt = new Date(startsAt.getTime() + Math.max(1, event.durationHours) * 60 * 60 * 1000);
  const lifecycle = calculateMarketEventLifecycle({ startsAt, endsAt, now });

  return {
    eventKey: event.key,
    location,
    itemKey,
    startsAt,
    endsAt,
    status: lifecycle.status,
    event: { ...event },
  };
}

export function hydrateMarketEventOccurrence(
  input: PersistedMarketEventOccurrenceInput,
): MarketEventOccurrence | null {
  const event = getMarketEventDefinition(input.eventKey);

  if (!event) {
    return null;
  }

  const now = normalizeDateInput(input.now);
  const startsAt = normalizeDateInput(input.startsAt, now);
  const endsAt = normalizeDateInput(input.endsAt, startsAt);
  const lifecycle = calculateMarketEventLifecycle({ startsAt, endsAt, now });

  return {
    eventKey: event.key,
    location: normalizeScheduleLocation(input.location),
    itemKey: input.itemKey?.trim() || null,
    startsAt,
    endsAt,
    status: lifecycle.status,
    event: { ...event },
  };
}

export function buildMarketEventNewsArticle(input: {
  occurrence: MarketEventOccurrence;
  itemName?: string | null;
}): MarketEventNewsArticle {
  const { occurrence } = input;
  const itemLabel = input.itemName?.trim() || occurrence.itemKey || 'local goods';
  const locationLabel =
    occurrence.location
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Starter City';
  const direction =
    occurrence.event.supplyMultiplier < 1
      ? 'tightens supply'
      : occurrence.event.demandMultiplier > 1
        ? 'lifts demand'
        : 'cools prices';
  const title = `${occurrence.event.name} ${direction} in ${locationLabel}`;
  const excerpt = `${itemLabel} traders are reacting to ${occurrence.event.description.toLowerCase()}`;
  const body = [
    `${occurrence.event.name} is affecting ${itemLabel} around ${locationLabel}.`,
    occurrence.event.description,
    `Market impact: supply x${occurrence.event.supplyMultiplier}, demand x${occurrence.event.demandMultiplier}, volatility ${occurrence.event.volatilityDelta >= 0 ? '+' : ''}${occurrence.event.volatilityDelta}, risk ${occurrence.event.riskDelta >= 0 ? '+' : ''}${occurrence.event.riskDelta}.`,
    `Window: ${occurrence.startsAt.toISOString()} to ${occurrence.endsAt.toISOString()}.`,
  ].join('\n\n');

  return {
    category: 'market',
    title,
    excerpt,
    body,
    metadata: {
      source: 'market_event',
      eventKey: occurrence.eventKey,
      eventKind: occurrence.event.kind,
      location: occurrence.location,
      itemKey: occurrence.itemKey,
      startsAt: occurrence.startsAt.toISOString(),
      endsAt: occurrence.endsAt.toISOString(),
      status: occurrence.status,
    },
  };
}

export type PlayerTradeQuoteInput = {
  quantity: number;
  priceEach: number;
  sellerFeeBasisPoints?: number;
};

export type PlayerTradeQuote = {
  quantity: number;
  priceEach: number;
  gross: number;
  sellerFee: number;
  sellerPayout: number;
  buyerCost: number;
};

export function calculatePlayerTradeQuote(input: PlayerTradeQuoteInput): PlayerTradeQuote {
  const quantity = Math.max(1, Math.min(1000, Math.floor(input.quantity)));
  const priceEach = Math.max(1, Math.min(1_000_000, Math.floor(input.priceEach)));
  const sellerFeeBasisPoints = Math.max(
    0,
    Math.min(2500, Math.floor(input.sellerFeeBasisPoints ?? 250)),
  );
  const gross = quantity * priceEach;
  const sellerFee =
    sellerFeeBasisPoints > 0 ? Math.max(1, Math.floor((gross * sellerFeeBasisPoints) / 10_000)) : 0;
  const sellerPayout = Math.max(0, gross - sellerFee);

  return {
    quantity,
    priceEach,
    gross,
    sellerFee,
    sellerPayout,
    buyerCost: gross,
  };
}

export function calculatePlayerTradeExpiry(input: {
  now?: Date | string | number;
  expiresInHours?: number;
}) {
  const now = normalizeDateInput(input.now);
  const expiresInHours = Math.max(1, Math.min(168, Math.floor(input.expiresInHours ?? 24)));
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

  return { now, expiresInHours, expiresAt };
}

export type PlayerTradeSummaryOffer = {
  status: string;
  isExpired?: boolean;
  gross: number;
  sellerFee: number;
  sellerPayout: number;
  buyerCost: number;
};

export type PlayerTradeCenterSummary = {
  sentCount: number;
  receivedCount: number;
  openSentCount: number;
  openReceivedCount: number;
  completedCount: number;
  cancelledCount: number;
  expiredCount: number;
  reservedInventoryValue: number;
  pendingBuyerCost: number;
  completedGrossVolume: number;
  completedSellerPayout: number;
  completedSellerFees: number;
};

function isOpenPlayerTradeOffer(offer: PlayerTradeSummaryOffer) {
  return offer.status === 'open' && !offer.isExpired;
}

function isAcceptedPlayerTradeOffer(offer: PlayerTradeSummaryOffer) {
  return offer.status === 'accepted';
}

function isCancelledPlayerTradeOffer(offer: PlayerTradeSummaryOffer) {
  return offer.status === 'cancelled';
}

function isExpiredPlayerTradeOffer(offer: PlayerTradeSummaryOffer) {
  return offer.status === 'expired' || (offer.status === 'open' && offer.isExpired === true);
}

function sumPlayerTradeMetric(
  offers: readonly PlayerTradeSummaryOffer[],
  pick: (offer: PlayerTradeSummaryOffer) => number,
) {
  return offers.reduce((total, offer) => total + Math.max(0, Math.floor(pick(offer))), 0);
}

export function summarizePlayerTradeOffers(input: {
  sentOffers?: readonly PlayerTradeSummaryOffer[];
  receivedOffers?: readonly PlayerTradeSummaryOffer[];
}): PlayerTradeCenterSummary {
  const sentOffers = input.sentOffers ?? [];
  const receivedOffers = input.receivedOffers ?? [];
  const allOffers = [...sentOffers, ...receivedOffers];
  const openSent = sentOffers.filter(isOpenPlayerTradeOffer);
  const openReceived = receivedOffers.filter(isOpenPlayerTradeOffer);
  const accepted = allOffers.filter(isAcceptedPlayerTradeOffer);

  return {
    sentCount: sentOffers.length,
    receivedCount: receivedOffers.length,
    openSentCount: openSent.length,
    openReceivedCount: openReceived.length,
    completedCount: accepted.length,
    cancelledCount: allOffers.filter(isCancelledPlayerTradeOffer).length,
    expiredCount: allOffers.filter(isExpiredPlayerTradeOffer).length,
    reservedInventoryValue: sumPlayerTradeMetric(openSent, (offer) => offer.gross),
    pendingBuyerCost: sumPlayerTradeMetric(openReceived, (offer) => offer.buyerCost),
    completedGrossVolume: sumPlayerTradeMetric(accepted, (offer) => offer.gross),
    completedSellerPayout: sumPlayerTradeMetric(accepted, (offer) => offer.sellerPayout),
    completedSellerFees: sumPlayerTradeMetric(accepted, (offer) => offer.sellerFee),
  };
}

export type MoneySinkPaymentSource = 'cash' | 'bank';

export type MoneySinkDefinition = {
  key: string;
  name: string;
  category: 'lifestyle' | 'security' | 'services' | 'maintenance';
  description: string;
  cost: number;
  durationHours: number;
  benefit: string;
};

export const MONEY_SINKS: MoneySinkDefinition[] = [
  {
    key: 'safehouse_upkeep',
    name: 'Safehouse upkeep',
    category: 'maintenance',
    description: 'Pay routine rent, repairs, and supplies for a private hideout.',
    cost: 75,
    durationHours: 24,
    benefit: 'Adds an audit/event trail for routine upkeep spending.',
  },
  {
    key: 'private_transport',
    name: 'Private transport retainer',
    category: 'services',
    description: 'Reserve fictional private transport capacity for the next day.',
    cost: 150,
    durationHours: 24,
    benefit: 'Creates a low-risk cash drain before future travel convenience hooks.',
  },
  {
    key: 'personal_security',
    name: 'Personal security detail',
    category: 'security',
    description: 'Hire a short-term protective presence around your public-facing assets.',
    cost: 250,
    durationHours: 24,
    benefit: 'Records protective spending without adding combat advantage yet.',
  },
  {
    key: 'luxury_lifestyle',
    name: 'Luxury lifestyle package',
    category: 'lifestyle',
    description: 'Spend heavily on status symbols, hospitality, and comfort.',
    cost: 500,
    durationHours: 48,
    benefit: 'Provides a larger optional money sink for high-cash characters.',
  },
];

export type MoneySinkPurchaseInput = {
  cash: number;
  bank: number;
  sinkKey: string;
  paymentSource: MoneySinkPaymentSource;
};

export function listMoneySinkDefinitions() {
  return MONEY_SINKS.map((sink) => ({ ...sink }));
}

export function getMoneySinkDefinition(sinkKey: string) {
  return MONEY_SINKS.find((sink) => sink.key === sinkKey) ?? null;
}

export function calculateMoneySinkPurchase(input: MoneySinkPurchaseInput) {
  const sink = getMoneySinkDefinition(input.sinkKey);
  const cash = Math.max(0, Math.floor(input.cash));
  const bank = Math.max(0, Math.floor(input.bank));

  if (!sink) {
    return {
      ok: false as const,
      code: 'not_found' as const,
      message: 'Money sink not found.',
      sink: null,
      paymentSource: input.paymentSource,
      cost: 0,
      cashBefore: cash,
      bankBefore: bank,
      cashAfter: cash,
      bankAfter: bank,
    };
  }

  const cost = Math.max(1, Math.floor(sink.cost));
  const hasFunds = input.paymentSource === 'cash' ? cash >= cost : bank >= cost;

  return {
    ok: hasFunds,
    code: hasFunds ? ('ok' as const) : ('insufficient_funds' as const),
    message: hasFunds ? 'Money sink purchased.' : `Not enough ${input.paymentSource} balance.`,
    sink,
    paymentSource: input.paymentSource,
    cost,
    cashBefore: cash,
    bankBefore: bank,
    cashAfter: input.paymentSource === 'cash' && hasFunds ? cash - cost : cash,
    bankAfter: input.paymentSource === 'bank' && hasFunds ? bank - cost : bank,
  };
}

export type LoanOfferDefinition = {
  key: string;
  name: string;
  description: string;
  principal: number;
  fee: number;
  dueHours: number;
  minimumLevel: number;
};

export const LOAN_OFFERS: LoanOfferDefinition[] = [
  {
    key: 'starter_float',
    name: 'Starter float',
    description: 'A small bank-backed cashflow boost for early-game purchases.',
    principal: 250,
    fee: 25,
    dueHours: 72,
    minimumLevel: 1,
  },
  {
    key: 'street_credit',
    name: 'Street credit line',
    description: 'A medium fictional credit line with a flat repayment fee.',
    principal: 750,
    fee: 120,
    dueHours: 96,
    minimumLevel: 2,
  },
  {
    key: 'business_bridge',
    name: 'Business bridge loan',
    description: 'A larger bridge loan intended for shop, vehicle, and market expansion.',
    principal: 2000,
    fee: 400,
    dueHours: 168,
    minimumLevel: 4,
  },
];

export type LoanRequestInput = {
  level: number;
  hasActiveLoan: boolean;
  offerKey: string;
};

export function listLoanOfferDefinitions() {
  return LOAN_OFFERS.map((offer) => ({ ...offer, totalDue: offer.principal + offer.fee }));
}

export function getLoanOfferDefinition(offerKey: string) {
  return LOAN_OFFERS.find((offer) => offer.key === offerKey) ?? null;
}

export function calculateLoanRequest(input: LoanRequestInput) {
  const offer = getLoanOfferDefinition(input.offerKey);
  const level = Math.max(1, Math.floor(input.level));

  if (!offer) {
    return {
      ok: false as const,
      code: 'not_found' as const,
      message: 'Loan offer not found.',
      offer: null,
      level,
      principal: 0,
      fee: 0,
      totalDue: 0,
    };
  }

  if (input.hasActiveLoan) {
    return {
      ok: false as const,
      code: 'conflict' as const,
      message: 'Repay the active loan before opening another one.',
      offer,
      level,
      principal: offer.principal,
      fee: offer.fee,
      totalDue: offer.principal + offer.fee,
    };
  }

  if (level < offer.minimumLevel) {
    return {
      ok: false as const,
      code: 'forbidden' as const,
      message: `Requires level ${offer.minimumLevel}.`,
      offer,
      level,
      principal: offer.principal,
      fee: offer.fee,
      totalDue: offer.principal + offer.fee,
    };
  }

  return {
    ok: true as const,
    code: 'ok' as const,
    message: 'Loan approved.',
    offer,
    level,
    principal: offer.principal,
    fee: offer.fee,
    totalDue: offer.principal + offer.fee,
  };
}

export const DEFAULT_LOAN_DEFAULT_GRACE_HOURS = 24;

export type LoanLifecycleStatus = 'active' | 'overdue' | 'defaulted' | 'repaid' | 'cancelled';

export function calculateLoanLifecycle(input: {
  status: string;
  dueAt: Date | string | number;
  now?: Date | string | number;
  defaultGraceHours?: number;
}) {
  const dueAt = new Date(input.dueAt);
  const now = new Date(input.now ?? Date.now());
  const graceHours = Math.max(
    1,
    Math.floor(input.defaultGraceHours ?? DEFAULT_LOAN_DEFAULT_GRACE_HOURS),
  );
  const defaultAt = new Date(dueAt.getTime() + graceHours * 60 * 60 * 1000);
  const hoursPastDue = Math.max(
    0,
    Math.floor((now.getTime() - dueAt.getTime()) / (60 * 60 * 1000)),
  );

  if (input.status === 'repaid' || input.status === 'cancelled') {
    return {
      lifecycleStatus: input.status as LoanLifecycleStatus,
      isOverdue: false,
      isDefaulted: false,
      hoursPastDue: 0,
      defaultAt,
      graceHours,
    };
  }

  if (input.status === 'defaulted') {
    return {
      lifecycleStatus: 'defaulted' as const,
      isOverdue: true,
      isDefaulted: true,
      hoursPastDue,
      defaultAt,
      graceHours,
    };
  }

  if (now.getTime() >= defaultAt.getTime()) {
    return {
      lifecycleStatus: 'defaulted' as const,
      isOverdue: true,
      isDefaulted: true,
      hoursPastDue,
      defaultAt,
      graceHours,
    };
  }

  if (now.getTime() > dueAt.getTime()) {
    return {
      lifecycleStatus: 'overdue' as const,
      isOverdue: true,
      isDefaulted: false,
      hoursPastDue,
      defaultAt,
      graceHours,
    };
  }

  return {
    lifecycleStatus: 'active' as const,
    isOverdue: false,
    isDefaulted: false,
    hoursPastDue: 0,
    defaultAt,
    graceHours,
  };
}

export function calculateLoanOutstanding(input: {
  principal: number;
  fee: number;
  repaidAmount?: number | null;
}) {
  const principal = Math.max(0, Math.floor(input.principal));
  const fee = Math.max(0, Math.floor(input.fee));
  const repaidAmount = Math.max(0, Math.floor(input.repaidAmount ?? 0));
  const totalDue = principal + fee;

  return {
    principal,
    fee,
    totalDue,
    repaidAmount: Math.min(repaidAmount, totalDue),
    outstanding: Math.max(0, totalDue - repaidAmount),
  };
}

export type LoanRepaymentInput = {
  principal: number;
  fee: number;
  repaidAmount?: number | null;
  bank: number;
  requestedAmount?: number | null;
};

export function calculateLoanRepayment(input: LoanRepaymentInput) {
  const outstanding = calculateLoanOutstanding({
    principal: input.principal,
    fee: input.fee,
    repaidAmount: input.repaidAmount,
  });
  const bank = Math.max(0, Math.floor(input.bank));
  const normalizedRequest = Math.max(
    0,
    Math.floor(input.requestedAmount ?? outstanding.outstanding),
  );
  const requestedAmount = normalizedRequest > 0 ? normalizedRequest : outstanding.outstanding;
  const paymentAmount = Math.min(outstanding.outstanding, requestedAmount);
  const sufficientFunds = bank >= paymentAmount;
  const newRepaidAmount = outstanding.repaidAmount + (sufficientFunds ? paymentAmount : 0);
  const remainingOutstanding = Math.max(0, outstanding.totalDue - newRepaidAmount);

  return {
    ok: outstanding.outstanding > 0 && paymentAmount > 0 && sufficientFunds,
    code:
      outstanding.outstanding <= 0
        ? ('settled' as const)
        : paymentAmount <= 0
          ? ('invalid_amount' as const)
          : sufficientFunds
            ? ('ok' as const)
            : ('insufficient_funds' as const),
    message:
      outstanding.outstanding <= 0
        ? 'Loan has no outstanding balance.'
        : paymentAmount <= 0
          ? 'Repayment amount must be greater than zero.'
          : sufficientFunds
            ? 'Loan payment accepted.'
            : 'Not enough bank balance for this loan payment.',
    ...outstanding,
    bankBefore: bank,
    requestedAmount,
    paymentAmount,
    newRepaidAmount,
    remainingOutstanding,
    bankAfter: sufficientFunds ? bank - paymentAmount : bank,
    isFullRepayment: remainingOutstanding === 0 && sufficientFunds,
  };
}
