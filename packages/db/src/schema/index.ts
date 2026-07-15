import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const adminRole = pgEnum('admin_role', ['none', 'support', 'moderator', 'economy_manager', 'game_master', 'owner']);
export const characterStatus = pgEnum('character_status', ['free', 'traveling', 'jailed', 'hospitalized']);
export const eventVisibility = pgEnum('event_visibility', ['private', 'faction', 'public', 'admin']);
export const itemCategory = pgEnum('item_category', ['drug', 'gear', 'weapon', 'armor', 'vehicle', 'tool', 'medical', 'collectible']);
export const itemRarity = pgEnum('item_rarity', ['common', 'uncommon', 'rare', 'epic', 'legendary']);
export const transactionType = pgEnum('transaction_type', ['cash', 'bank', 'stock', 'crypto', 'shop', 'system']);
export const travelStatus = pgEnum('travel_status', ['scheduled', 'completed', 'cancelled', 'intercepted']);
export const messageThreadType = pgEnum('message_thread_type', ['direct', 'group', 'faction']);
export const factionRole = pgEnum('faction_role', ['recruit', 'runner', 'soldier', 'lieutenant', 'captain', 'underboss', 'boss']);
export const membershipStatus = pgEnum('membership_status', ['active', 'invited', 'left', 'kicked']);
export const listingStatus = pgEnum('listing_status', ['active', 'sold', 'cancelled', 'expired']);
export const actionOutcome = pgEnum('action_outcome', ['pending', 'success', 'failure', 'critical_failure']);
export const trainingStat = pgEnum('training_stat', ['strength', 'stamina', 'defense', 'dexterity', 'endurance']);
export const courseStat = pgEnum('course_stat', ['intelligence', 'labour', 'endurance']);
export const progressionStatus = pgEnum('progression_status', ['scheduled', 'completed', 'cancelled']);
export const jobStatus = pgEnum('job_status', ['active', 'resigned', 'terminated']);
export const contractType = pgEnum('contract_type', ['delivery', 'protection', 'collection', 'bounty', 'faction_task']);
export const contractStatus = pgEnum('contract_status', ['open', 'accepted', 'completed', 'cancelled', 'expired', 'failed']);
export const adminActionType = pgEnum('admin_action_type', [
  'config_upsert',
  'character_flag',
  'character_unflag',
  'cash_adjustment',
  'bank_adjustment',
  'stat_adjustment',
  'status_clear',
  'announcement_publish',
  'announcement_archive',
  'moderation_note',
  'enforcement_action',
  'enforcement_lift',
  'appeal_review',
  'rollback_review',
  'rollback_apply',
]);
export const characterFlagType = pgEnum('character_flag_type', [
  'watchlist',
  'suspected_alt',
  'market_abuse',
  'chat_abuse',
  'botting',
  'exploit_review',
  'suspended',
]);
export const announcementStatus = pgEnum('announcement_status', ['draft', 'published', 'archived']);
export const combatOutcome = pgEnum('combat_outcome', ['attacker_win', 'defender_win', 'draw', 'fled']);
export const bountyStatus = pgEnum('bounty_status', ['open', 'claimed', 'cancelled', 'expired']);
export const factionWarStatus = pgEnum('faction_war_status', ['declared', 'active', 'resolved', 'cancelled']);
export const equipmentSlot = pgEnum('equipment_slot', ['weapon', 'armor', 'vehicle', 'tool', 'phone', 'accessory']);
export const vehicleUpgradeType = pgEnum('vehicle_upgrade_type', ['engine', 'armor', 'storage', 'stealth', 'documents']);
export const travelCargoStatus = pgEnum('travel_cargo_status', ['loaded', 'delivered', 'seized', 'lost']);
export const craftingRecipeType = pgEnum('crafting_recipe_type', ['craft', 'modify', 'repair', 'dismantle']);
export const craftingJobStatus = pgEnum('crafting_job_status', ['queued', 'completed', 'cancelled', 'failed']);
export const workshopType = pgEnum('workshop_type', ['garage', 'lab', 'electronics', 'clinic', 'forge', 'tailor']);
export const contactSpecialty = pgEnum('contact_specialty', ['muscle', 'driver', 'dealer', 'lawyer', 'medic', 'hacker', 'broker', 'scout']);
export const contactStatus = pgEnum('contact_status', ['idle', 'assigned', 'injured', 'inactive']);
export const contactAssignmentType = pgEnum('contact_assignment_type', ['job_assist', 'crime_setup', 'shop_shift', 'territory_scout', 'market_tip', 'recovery_support']);
export const contactAssignmentStatus = pgEnum('contact_assignment_status', ['queued', 'completed', 'failed', 'cancelled']);
export const notificationCategory = pgEnum('notification_category', ['system', 'combat', 'economy', 'contract', 'faction', 'travel', 'crew', 'crafting', 'market', 'season', 'admin']);
export const notificationPriority = pgEnum('notification_priority', ['low', 'normal', 'high', 'urgent']);
export const activityFeedScope = pgEnum('activity_feed_scope', ['private', 'faction', 'public', 'admin']);
export const messageReportStatus = pgEnum('message_report_status', ['open', 'reviewed', 'dismissed', 'actioned']);
export const enforcementActionType = pgEnum('enforcement_action_type', ['warning', 'social_mute', 'shop_restriction', 'temporary_suspension', 'cash_penalty']);
export const enforcementAppealStatus = pgEnum('enforcement_appeal_status', ['open', 'accepted', 'rejected', 'withdrawn']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  isAdmin: boolean('is_admin').notNull().default(false),
  adminRole: adminRole('admin_role').notNull().default('none'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});



export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    requestedIp: text('requested_ip'),
    requestedUserAgent: text('requested_user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex('password_reset_tokens_hash_unique').on(table.tokenHash),
    userCreatedAtIdx: index('password_reset_tokens_user_created_idx').on(table.userId, table.createdAt),
    expiresAtIdx: index('password_reset_tokens_expires_idx').on(table.expiresAt, table.usedAt),
  }),
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    requestedIp: text('requested_ip'),
    requestedUserAgent: text('requested_user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex('email_verification_tokens_hash_unique').on(table.tokenHash),
    userCreatedAtIdx: index('email_verification_tokens_user_created_idx').on(table.userId, table.createdAt),
    expiresAtIdx: index('email_verification_tokens_expires_idx').on(table.expiresAt, table.usedAt),
  }),
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionTokenHash: text('session_token_hash').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex('user_sessions_token_hash_unique').on(table.sessionTokenHash),
    userExpiresAtIdx: index('user_sessions_user_expires_at_idx').on(table.userId, table.expiresAt),
  }),
);

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: characterStatus('status').notNull().default('free'),
    location: text('location').notNull().default('starter-city'),
    cash: integer('cash').notNull().default(500),
    bank: integer('bank').notNull().default(0),
    level: integer('level').notNull().default(1),
    experience: integer('experience').notNull().default(0),
    intelligence: integer('intelligence').notNull().default(1),
    labour: integer('labour').notNull().default(1),
    endurance: integer('endurance').notNull().default(1),
    strength: integer('strength').notNull().default(1),
    stamina: integer('stamina').notNull().default(1),
    defense: integer('defense').notNull().default(1),
    dexterity: integer('dexterity').notNull().default(1),
    health: integer('health').notNull().default(100),
    energy: integer('energy').notNull().default(100),
    maxEnergy: integer('max_energy').notNull().default(100),
    nerve: integer('nerve').notNull().default(20),
    maxNerve: integer('max_nerve').notNull().default(20),
    heat: integer('heat').notNull().default(0),
    legalReputation: integer('legal_reputation').notNull().default(0),
    gamblingReputation: integer('gambling_reputation').notNull().default(0),
    prestigeLevel: integer('prestige_level').notNull().default(0),
    legacyPoints: integer('legacy_points').notNull().default(0),
    seasonPoints: integer('season_points').notNull().default(0),
    statusUntil: timestamp('status_until', { withTimezone: true }),
    statusReason: text('status_reason'),
    lastResourceTickAt: timestamp('last_resource_tick_at', { withTimezone: true }).notNull().defaultNow(),
    lastHeatTickAt: timestamp('last_heat_tick_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('characters_user_idx').on(table.userId),
    nameUnique: uniqueIndex('characters_name_unique').on(sql`lower(${table.name})`),
  }),
);

export const locations = pgTable('locations', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  policePressure: integer('police_pressure').notNull().default(1),
  marketVolatility: integer('market_volatility').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const playerEvents = pgTable(
  'player_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    visibility: eventVisibility('visibility').notNull().default('private'),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterCreatedAtIdx: index('player_events_character_created_at_idx').on(table.characterId, table.createdAt),
    typeIdx: index('player_events_type_idx').on(table.type),
  }),
);

export const itemDefinitions = pgTable('item_definitions', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  category: itemCategory('category').notNull(),
  description: text('description').notNull().default(''),
  basePrice: integer('base_price').notNull(),
  baseRisk: integer('base_risk').notNull().default(0),
  isIllegal: boolean('is_illegal').notNull().default(false),
  rarity: itemRarity('rarity').notNull().default('common'),
  equipSlot: equipmentSlot('equip_slot'),
  maxDurability: integer('max_durability').notNull().default(0),
  statModifiers: jsonb('stat_modifiers').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const itemImages = pgTable(
  'item_images',
  {
    itemKey: text('item_key')
      .primaryKey()
      .references(() => itemDefinitions.key, { onDelete: 'cascade' }),
    contentType: text('content_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    altText: text('alt_text').notNull().default(''),
    imageData: bytea('image_data').notNull(),
    sha256: text('sha256').notNull(),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    updatedAtIdx: index('item_images_updated_at_idx').on(table.updatedAt),
  }),
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key),
    quantity: integer('quantity').notNull().default(0),
    durability: integer('durability'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterItemUnique: uniqueIndex('inventory_character_item_unique').on(table.characterId, table.itemKey),
  }),
);


export const characterEquipment = pgTable(
  'character_equipment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    inventoryItemId: uuid('inventory_item_id').references(() => inventoryItems.id, { onDelete: 'set null' }),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key),
    slot: equipmentSlot('slot').notNull(),
    durability: integer('durability').notNull().default(100),
    isEquipped: boolean('is_equipped').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterEquippedIdx: index('character_equipment_character_equipped_idx').on(table.characterId, table.isEquipped),
    characterSlotIdx: index('character_equipment_slot_idx').on(table.characterId, table.slot),
    itemIdx: index('character_equipment_item_idx').on(table.itemKey),
  }),
);

export const marketPrices = pgTable(
  'market_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    location: text('location').notNull(),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key),
    price: integer('price').notNull(),
    supply: integer('supply').notNull().default(100),
    demand: integer('demand').notNull().default(100),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    locationItemCreatedAtIdx: index('market_prices_location_item_created_at_idx').on(table.location, table.itemKey, table.createdAt),
  }),
);

export const marketEvents = pgTable(
  'market_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventKey: text('event_key').notNull(),
    location: text('location').notNull(),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key, { onDelete: 'cascade' }),
    status: text('status').notNull().default('scheduled'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    publishedArticleId: uuid('published_article_id').references(() => newspaperArticles.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventLocationItemStartsUnique: uniqueIndex('market_events_event_location_item_starts_unique').on(table.eventKey, table.location, table.itemKey, table.startsAt),
    locationWindowIdx: index('market_events_location_window_idx').on(table.location, table.startsAt, table.endsAt),
    statusWindowIdx: index('market_events_status_window_idx').on(table.status, table.startsAt, table.endsAt),
    publishedArticleIdx: index('market_events_published_article_idx').on(table.publishedArticleId),
  }),
);

export const playerTradeOffers = pgTable(
  'player_trade_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerCharacterId: uuid('seller_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    buyerCharacterId: uuid('buyer_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    priceEach: integer('price_each').notNull(),
    status: text('status').notNull().default('open'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sellerStatusCreatedIdx: index('player_trade_offers_seller_status_created_idx').on(table.sellerCharacterId, table.status, table.createdAt),
    buyerStatusCreatedIdx: index('player_trade_offers_buyer_status_created_idx').on(table.buyerCharacterId, table.status, table.createdAt),
    statusExpiresIdx: index('player_trade_offers_status_expires_idx').on(table.status, table.expiresAt),
    itemStatusIdx: index('player_trade_offers_item_status_idx').on(table.itemKey, table.status),
  }),
);

export const jobDefinitions = pgTable('job_definitions', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  requiredLabour: integer('required_labour').notNull().default(1),
  requiredIntelligence: integer('required_intelligence').notNull().default(1),
  energyCost: integer('energy_cost').notNull().default(10),
  baseWage: integer('base_wage').notNull(),
  durationSeconds: integer('duration_seconds').notNull().default(3600),
});

export const jobRuns = pgTable(
  'job_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    jobKey: text('job_key')
      .notNull()
      .references(() => jobDefinitions.key),
    payout: integer('payout').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    characterStartedAtIdx: index('job_runs_character_started_at_idx').on(table.characterId, table.startedAt),
  }),
);


export const characterJobs = pgTable(
  'character_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    jobKey: text('job_key')
      .notNull()
      .references(() => jobDefinitions.key),
    status: jobStatus('status').notNull().default('active'),
    rank: integer('rank').notNull().default(1),
    shiftsCompleted: integer('shifts_completed').notNull().default(0),
    totalEarned: integer('total_earned').notNull().default(0),
    hiredAt: timestamp('hired_at', { withTimezone: true }).notNull().defaultNow(),
    promotedAt: timestamp('promoted_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterStatusIdx: index('character_jobs_character_status_idx').on(table.characterId, table.status),
    jobStatusIdx: index('character_jobs_job_status_idx').on(table.jobKey, table.status),
  }),
);

export const crimeDefinitions = pgTable('crime_definitions', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  requiredLevel: integer('required_level').notNull().default(1),
  requiredNerve: integer('required_nerve').notNull().default(1),
  difficulty: integer('difficulty').notNull().default(1),
  minReward: integer('min_reward').notNull(),
  maxReward: integer('max_reward').notNull(),
  heatGain: integer('heat_gain').notNull().default(1),
  jailRisk: integer('jail_risk').notNull().default(1),
  cooldownSeconds: integer('cooldown_seconds').notNull().default(300),
});

export const crimeAttempts = pgTable(
  'crime_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    crimeKey: text('crime_key')
      .notNull()
      .references(() => crimeDefinitions.key),
    outcome: actionOutcome('outcome').notNull(),
    reward: integer('reward').notNull().default(0),
    heatGained: integer('heat_gained').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterCreatedAtIdx: index('crime_attempts_character_created_at_idx').on(table.characterId, table.createdAt),
  }),
);

export const travelRoutes = pgTable(
  'travel_routes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromLocation: text('from_location').notNull(),
    toLocation: text('to_location').notNull(),
    cost: integer('cost').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    risk: integer('risk').notNull().default(1),
  },
  (table) => ({
    fromToUnique: uniqueIndex('travel_routes_from_to_unique').on(table.fromLocation, table.toLocation),
  }),
);

export const travelPlans = pgTable(
  'travel_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    routeId: uuid('route_id')
      .notNull()
      .references(() => travelRoutes.id),
    status: travelStatus('status').notNull().default('scheduled'),
    arrivesAt: timestamp('arrives_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    effectiveCost: integer('effective_cost').notNull().default(0),
    effectiveDurationSeconds: integer('effective_duration_seconds').notNull().default(0),
    riskScore: integer('risk_score').notNull().default(0),
    cargoValue: integer('cargo_value').notNull().default(0),
    vehicleEquipmentId: uuid('vehicle_equipment_id').references(() => characterEquipment.id, { onDelete: 'set null' }),
  },
  (table) => ({
    characterStatusIdx: index('travel_plans_character_status_idx').on(table.characterId, table.status),
    arrivesAtIdx: index('travel_plans_arrives_at_idx').on(table.arrivesAt),
  }),
);



export const vehicleUpgradeDefinitions = pgTable('vehicle_upgrade_definitions', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  upgradeType: vehicleUpgradeType('upgrade_type').notNull(),
  description: text('description').notNull().default(''),
  cashCost: integer('cash_cost').notNull().default(0),
  requiredLevel: integer('required_level').notNull().default(1),
  statModifiers: jsonb('stat_modifiers').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterVehicleUpgrades = pgTable(
  'character_vehicle_upgrades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    equipmentId: uuid('equipment_id')
      .notNull()
      .references(() => characterEquipment.id, { onDelete: 'cascade' }),
    upgradeKey: text('upgrade_key')
      .notNull()
      .references(() => vehicleUpgradeDefinitions.key),
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => ({
    equipmentUpgradeUnique: uniqueIndex('character_vehicle_upgrade_unique').on(table.equipmentId, table.upgradeKey),
    characterIdx: index('character_vehicle_upgrades_character_idx').on(table.characterId),
    equipmentIdx: index('character_vehicle_upgrades_equipment_idx').on(table.equipmentId),
  }),
);

export const travelCargo = pgTable(
  'travel_cargo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    travelPlanId: uuid('travel_plan_id')
      .notNull()
      .references(() => travelPlans.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key),
    quantity: integer('quantity').notNull().default(0),
    status: travelCargoStatus('status').notNull().default('loaded'),
    riskAdded: integer('risk_added').notNull().default(0),
    cargoValue: integer('cargo_value').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    characterStatusIdx: index('travel_cargo_character_status_idx').on(table.characterId, table.status),
    planIdx: index('travel_cargo_plan_idx').on(table.travelPlanId),
  }),
);


export const craftingRecipeDefinitions = pgTable('crafting_recipe_definitions', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  recipeType: craftingRecipeType('recipe_type').notNull().default('craft'),
  workshopType: workshopType('workshop_type').notNull().default('garage'),
  description: text('description').notNull().default(''),
  outputItemKey: text('output_item_key')
    .notNull()
    .references(() => itemDefinitions.key),
  outputQuantity: integer('output_quantity').notNull().default(1),
  requiredLevel: integer('required_level').notNull().default(1),
  requiredIntelligence: integer('required_intelligence').notNull().default(1),
  requiredLabour: integer('required_labour').notNull().default(1),
  energyCost: integer('energy_cost').notNull().default(5),
  cashCost: integer('cash_cost').notNull().default(0),
  durationSeconds: integer('duration_seconds').notNull().default(300),
  risk: integer('risk').notNull().default(0),
  inputs: jsonb('inputs').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterWorkshops = pgTable(
  'character_workshops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    workshopType: workshopType('workshop_type').notNull(),
    name: text('name').notNull(),
    level: integer('level').notNull().default(1),
    condition: integer('condition').notNull().default(100),
    storageCapacity: integer('storage_capacity').notNull().default(100),
    isHidden: boolean('is_hidden').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterIdx: index('character_workshops_character_idx').on(table.characterId),
    characterTypeUnique: uniqueIndex('character_workshops_character_type_unique').on(table.characterId, table.workshopType),
  }),
);

export const craftingJobs = pgTable(
  'crafting_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    recipeKey: text('recipe_key')
      .notNull()
      .references(() => craftingRecipeDefinitions.key),
    workshopId: uuid('workshop_id').references(() => characterWorkshops.id, { onDelete: 'set null' }),
    status: craftingJobStatus('status').notNull().default('queued'),
    outputItemKey: text('output_item_key')
      .notNull()
      .references(() => itemDefinitions.key),
    outputQuantity: integer('output_quantity').notNull().default(1),
    cashCost: integer('cash_cost').notNull().default(0),
    energyCost: integer('energy_cost').notNull().default(0),
    riskScore: integer('risk_score').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completesAt: timestamp('completes_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => ({
    characterStatusIdx: index('crafting_jobs_character_status_idx').on(table.characterId, table.status),
    completesAtIdx: index('crafting_jobs_completes_at_idx').on(table.completesAt),
  }),
);

export const craftingJobInputs = pgTable(
  'crafting_job_inputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    craftingJobId: uuid('crafting_job_id')
      .notNull()
      .references(() => craftingJobs.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key),
    quantity: integer('quantity').notNull().default(1),
    consumedAt: timestamp('consumed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    jobIdx: index('crafting_job_inputs_job_idx').on(table.craftingJobId),
    characterIdx: index('crafting_job_inputs_character_idx').on(table.characterId),
  }),
);

export const messageThreads = pgTable('message_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: messageThreadType('type').notNull(),
  title: text('title'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messageThreadMembers = pgTable(
  'message_thread_members',
  {
    threadId: uuid('thread_id')
      .notNull()
      .references(() => messageThreads.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    mutedAt: timestamp('muted_at', { withTimezone: true }),
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.threadId, table.characterId] }),
    characterIdx: index('message_thread_members_character_idx').on(table.characterId),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => messageThreads.id, { onDelete: 'cascade' }),
    senderCharacterId: uuid('sender_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenByUserId: uuid('hidden_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    hiddenReason: text('hidden_reason'),
    retentionExpiresAt: timestamp('retention_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    threadCreatedAtIdx: index('messages_thread_created_at_idx').on(table.threadId, table.createdAt),
    threadVisibleCreatedAtIdx: index('messages_thread_visible_created_idx').on(table.threadId, table.createdAt),
    hiddenCreatedAtIdx: index('messages_hidden_created_idx').on(table.hiddenAt, table.createdAt),
    retentionExpiresAtIdx: index('messages_retention_expires_idx').on(table.retentionExpiresAt),
  }),
);


export const messageReports = pgTable(
  'message_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    reporterCharacterId: uuid('reporter_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull().default(''),
    status: messageReportStatus('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolutionNote: text('resolution_note'),
  },
  (table) => ({
    messageIdx: index('message_reports_message_idx').on(table.messageId),
    reporterCreatedAtIdx: index('message_reports_reporter_created_at_idx').on(table.reporterCharacterId, table.createdAt),
    statusCreatedAtIdx: index('message_reports_status_created_at_idx').on(table.status, table.createdAt),
  }),
);

export const characterBlocks = pgTable(
  'character_blocks',
  {
    blockerCharacterId: uuid('blocker_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    blockedCharacterId: uuid('blocked_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.blockerCharacterId, table.blockedCharacterId] }),
    blockedIdx: index('character_blocks_blocked_idx').on(table.blockedCharacterId),
  }),
);

export const factions = pgTable(
  'factions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    tag: text('tag').notNull(),
    description: text('description').notNull().default(''),
    bank: integer('bank').notNull().default(0),
    reputation: integer('reputation').notNull().default(0),
    power: integer('power').notNull().default(0),
    createdByCharacterId: uuid('created_by_character_id').references(() => characters.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameUnique: uniqueIndex('factions_name_unique').on(sql`lower(${table.name})`),
    tagUnique: uniqueIndex('factions_tag_unique').on(sql`lower(${table.tag})`),
  }),
);

export const factionMembers = pgTable(
  'faction_members',
  {
    factionId: uuid('faction_id')
      .notNull()
      .references(() => factions.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    role: factionRole('role').notNull().default('recruit'),
    status: membershipStatus('status').notNull().default('active'),
    contributionPoints: integer('contribution_points').notNull().default(0),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.factionId, table.characterId] }),
    characterIdx: index('faction_members_character_idx').on(table.characterId),
  }),
);


export const factionInventoryItems = pgTable(
  'faction_inventory_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => factions.id, { onDelete: 'cascade' }),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(0),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    factionItemUnique: uniqueIndex('faction_inventory_items_faction_item_unique').on(table.factionId, table.itemKey),
    factionUpdatedIdx: index('faction_inventory_items_faction_updated_idx').on(table.factionId, table.updatedAt),
    itemIdx: index('faction_inventory_items_item_idx').on(table.itemKey),
  }),
);


export const factionLedgerEntries = pgTable(
  'faction_ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => factions.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    entryType: text('entry_type').notNull(),
    amount: integer('amount').notNull().default(0),
    balanceAfter: integer('balance_after').notNull().default(0),
    description: text('description').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    factionCreatedAtIdx: index('faction_ledger_entries_faction_created_at_idx').on(table.factionId, table.createdAt),
    characterCreatedAtIdx: index('faction_ledger_entries_character_created_at_idx').on(table.characterId, table.createdAt),
  }),
);

export const territories = pgTable(
  'territories',
  {
    key: text('key').primaryKey(),
    name: text('name').notNull(),
    location: text('location').notNull(),
    description: text('description').notNull().default(''),
    incomePerTick: integer('income_per_tick').notNull().default(0),
    defenseRating: integer('defense_rating').notNull().default(1),
    heatModifier: integer('heat_modifier').notNull().default(0),
    controlledByFactionId: uuid('controlled_by_faction_id').references(() => factions.id, { onDelete: 'set null' }),
    controlScore: integer('control_score').notNull().default(0),
    contestedUntil: timestamp('contested_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    locationIdx: index('territories_location_idx').on(table.location),
    controlledByIdx: index('territories_controlled_by_idx').on(table.controlledByFactionId),
  }),
);

export const territoryActions = pgTable(
  'territory_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    territoryKey: text('territory_key')
      .notNull()
      .references(() => territories.key, { onDelete: 'cascade' }),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => factions.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    actionType: text('action_type').notNull(),
    power: integer('power').notNull().default(0),
    cashCost: integer('cash_cost').notNull().default(0),
    outcome: text('outcome').notNull().default('completed'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    territoryCreatedAtIdx: index('territory_actions_territory_created_at_idx').on(table.territoryKey, table.createdAt),
    factionCreatedAtIdx: index('territory_actions_faction_created_at_idx').on(table.factionId, table.createdAt),
  }),
);

export const shops = pgTable(
  'shops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerCharacterId: uuid('owner_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    location: text('location').notNull(),
    reputation: integer('reputation').notNull().default(0),
    isOpen: boolean('is_open').notNull().default(true),
    advertisingUntil: timestamp('advertising_until', { withTimezone: true }),
    ratingTotal: integer('rating_total').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('shops_owner_idx').on(table.ownerCharacterId),
    locationOpenAdIdx: index('shops_location_open_ad_idx').on(table.location, table.isOpen, table.advertisingUntil),
  }),
);

export const shopReviews = pgTable(
  'shop_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    reviewerCharacterId: uuid('reviewer_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    body: text('body').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shopReviewerUnique: uniqueIndex('shop_reviews_shop_reviewer_unique').on(table.shopId, table.reviewerCharacterId),
    shopCreatedAtIdx: index('shop_reviews_shop_created_at_idx').on(table.shopId, table.createdAt),
  }),
);

export const shopAdCampaigns = pgTable(
  'shop_ad_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    spend: integer('spend').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shopEndsAtIdx: index('shop_ad_campaigns_shop_ends_at_idx').on(table.shopId, table.endsAt),
  }),
);

export const shopListings = pgTable(
  'shop_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    itemKey: text('item_key')
      .notNull()
      .references(() => itemDefinitions.key),
    quantity: integer('quantity').notNull(),
    soldQuantity: integer('sold_quantity').notNull().default(0),
    priceEach: integer('price_each').notNull(),
    status: listingStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shopStatusIdx: index('shop_listings_shop_status_idx').on(table.shopId, table.status),
  }),
);


export const shopLedgerEntries = pgTable(
  'shop_ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    sellerCharacterId: uuid('seller_character_id').references(() => characters.id, { onDelete: 'set null' }),
    buyerCharacterId: uuid('buyer_character_id').references(() => characters.id, { onDelete: 'set null' }),
    listingId: uuid('listing_id').references(() => shopListings.id, { onDelete: 'set null' }),
    entryType: text('entry_type').notNull(),
    itemKey: text('item_key').references(() => itemDefinitions.key),
    quantity: integer('quantity').notNull().default(0),
    amount: integer('amount').notNull().default(0),
    balanceAfter: integer('balance_after').notNull().default(0),
    description: text('description').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shopCreatedAtIdx: index('shop_ledger_entries_shop_created_at_idx').on(table.shopId, table.createdAt),
    buyerCreatedAtIdx: index('shop_ledger_entries_buyer_created_at_idx').on(table.buyerCharacterId, table.createdAt),
    sellerCreatedAtIdx: index('shop_ledger_entries_seller_created_at_idx').on(table.sellerCharacterId, table.createdAt),
  }),
);

export const newspaperArticles = pgTable(
  'newspaper_articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorCharacterId: uuid('author_character_id').references(() => characters.id, { onDelete: 'set null' }),
    location: text('location'),
    category: text('category').notNull().default('news'),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    excerpt: text('excerpt').notNull().default(''),
    body: text('body').notNull(),
    visibility: eventVisibility('visibility').notNull().default('public'),
    isPublished: boolean('is_published').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index('newspaper_articles_created_at_idx').on(table.createdAt),
    categoryCreatedAtIdx: index('newspaper_articles_category_created_at_idx').on(table.category, table.createdAt),
    locationCreatedAtIdx: index('newspaper_articles_location_created_at_idx').on(table.location, table.createdAt),
  }),
);

export const newspaperArticleComments = pgTable(
  'newspaper_article_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => newspaperArticles.id, { onDelete: 'cascade' }),
    authorCharacterId: uuid('author_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    visibility: eventVisibility('visibility').notNull().default('public'),
    isHidden: boolean('is_hidden').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleCreatedAtIdx: index('newspaper_article_comments_article_created_at_idx').on(table.articleId, table.createdAt),
    authorCreatedAtIdx: index('newspaper_article_comments_author_created_at_idx').on(table.authorCharacterId, table.createdAt),
  }),
);

export const newspaperArticleReactions = pgTable(
  'newspaper_article_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => newspaperArticles.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    reactionType: text('reaction_type').notNull().default('like'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleCharacterReactionUnique: uniqueIndex('newspaper_article_reactions_article_character_reaction_unique').on(table.articleId, table.characterId, table.reactionType),
    articleReactionIdx: index('newspaper_article_reactions_article_reaction_idx').on(table.articleId, table.reactionType),
  }),
);

export const newspaperArticleReports = pgTable(
  'newspaper_article_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => newspaperArticles.id, { onDelete: 'cascade' }),
    reporterCharacterId: uuid('reporter_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull().default('Needs moderation review.'),
    status: messageReportStatus('status').notNull().default('open'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolutionNote: text('resolution_note'),
  },
  (table) => ({
    articleCreatedAtIdx: index('newspaper_article_reports_article_created_at_idx').on(table.articleId, table.createdAt),
    reporterCreatedAtIdx: index('newspaper_article_reports_reporter_created_at_idx').on(table.reporterCharacterId, table.createdAt),
    statusCreatedAtIdx: index('newspaper_article_reports_status_created_at_idx').on(table.status, table.createdAt),
  }),
);


export const financialAssets = pgTable('financial_assets', {
  key: text('key').primaryKey(),
  assetType: text('asset_type').notNull(),
  symbol: text('symbol').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  sector: text('sector').notNull().default('general'),
  basePrice: integer('base_price').notNull(),
  volatility: integer('volatility').notNull().default(3),
  drift: integer('drift').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assetPrices = pgTable(
  'asset_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetKey: text('asset_key')
      .notNull()
      .references(() => financialAssets.key, { onDelete: 'cascade' }),
    price: integer('price').notNull(),
    volume: integer('volume').notNull().default(0),
    sentiment: integer('sentiment').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assetCreatedAtIdx: index('asset_prices_asset_created_at_idx').on(table.assetKey, table.createdAt),
  }),
);

export const characterAssetPositions = pgTable(
  'character_asset_positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    assetKey: text('asset_key')
      .notNull()
      .references(() => financialAssets.key, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(0),
    averageCost: integer('average_cost').notNull().default(0),
    realizedProfit: integer('realized_profit').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterAssetUnique: uniqueIndex('character_asset_positions_character_asset_unique').on(table.characterId, table.assetKey),
    characterIdx: index('character_asset_positions_character_idx').on(table.characterId),
  }),
);

export const assetOrders = pgTable(
  'asset_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    assetKey: text('asset_key')
      .notNull()
      .references(() => financialAssets.key, { onDelete: 'cascade' }),
    side: text('side').notNull(),
    quantity: integer('quantity').notNull(),
    priceEach: integer('price_each').notNull(),
    grossAmount: integer('gross_amount').notNull(),
    fee: integer('fee').notNull().default(0),
    netAmount: integer('net_amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterCreatedAtIdx: index('asset_orders_character_created_at_idx').on(table.characterId, table.createdAt),
    assetCreatedAtIdx: index('asset_orders_asset_created_at_idx').on(table.assetKey, table.createdAt),
  }),
);



export const gamblingGames = pgTable('gambling_games', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  minWager: integer('min_wager').notNull().default(1),
  maxWager: integer('max_wager').notNull().default(100),
  houseEdgeBasisPoints: integer('house_edge_basis_points').notNull().default(500),
  variance: integer('variance').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gamblingWagers = pgTable(
  'gambling_wagers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    gameKey: text('game_key')
      .notNull()
      .references(() => gamblingGames.key),
    wager: integer('wager').notNull(),
    outcome: text('outcome').notNull(),
    payout: integer('payout').notNull().default(0),
    profit: integer('profit').notNull().default(0),
    roll: integer('roll').notNull().default(0),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterCreatedAtIdx: index('gambling_wagers_character_created_at_idx').on(table.characterId, table.createdAt),
    gameCreatedAtIdx: index('gambling_wagers_game_created_at_idx').on(table.gameKey, table.createdAt),
  }),
);

export const trainingActivities = pgTable('training_activities', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  stat: trainingStat('stat').notNull(),
  energyCost: integer('energy_cost').notNull().default(10),
  cashCost: integer('cash_cost').notNull().default(0),
  statGain: integer('stat_gain').notNull().default(1),
  experienceGain: integer('experience_gain').notNull().default(2),
  durationSeconds: integer('duration_seconds').notNull().default(1800),
});

export const trainingSessions = pgTable(
  'training_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    activityKey: text('activity_key')
      .notNull()
      .references(() => trainingActivities.key),
    status: progressionStatus('status').notNull().default('completed'),
    stat: trainingStat('stat').notNull(),
    statGain: integer('stat_gain').notNull().default(1),
    energyCost: integer('energy_cost').notNull().default(0),
    cashCost: integer('cash_cost').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    characterStartedAtIdx: index('training_sessions_character_started_at_idx').on(table.characterId, table.startedAt),
    statusDueAtIdx: index('training_sessions_status_due_at_idx').on(table.status, table.dueAt),
  }),
);

export const courseDefinitions = pgTable('course_definitions', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  stat: courseStat('stat').notNull(),
  cashCost: integer('cash_cost').notNull().default(0),
  energyCost: integer('energy_cost').notNull().default(5),
  statGain: integer('stat_gain').notNull().default(1),
  experienceGain: integer('experience_gain').notNull().default(5),
  durationSeconds: integer('duration_seconds').notNull().default(7200),
  requiredLevel: integer('required_level').notNull().default(1),
  prerequisiteCourseKey: text('prerequisite_course_key'),
});

export const courseEnrollments = pgTable(
  'course_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    courseKey: text('course_key')
      .notNull()
      .references(() => courseDefinitions.key),
    status: progressionStatus('status').notNull().default('completed'),
    stat: courseStat('stat').notNull(),
    statGain: integer('stat_gain').notNull().default(1),
    cashCost: integer('cash_cost').notNull().default(0),
    energyCost: integer('energy_cost').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    characterStartedAtIdx: index('course_enrollments_character_started_at_idx').on(table.characterId, table.startedAt),
    statusDueAtIdx: index('course_enrollments_status_due_at_idx').on(table.status, table.dueAt),
  }),
);


export const characterActionLocks = pgTable(
  'character_action_locks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    actionType: text('action_type').notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterActionUnique: uniqueIndex('character_action_locks_character_action_unique').on(table.characterId, table.actionType),
    lockedUntilIdx: index('character_action_locks_locked_until_idx').on(table.lockedUntil),
  }),
);


export const hospitalStays = pgTable(
  'hospital_stays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    severity: integer('severity').notNull().default(1),
    healthLost: integer('health_lost').notNull().default(0),
    bill: integer('bill').notNull().default(0),
    status: text('status').notNull().default('active'),
    admittedAt: timestamp('admitted_at', { withTimezone: true }).notNull().defaultNow(),
    releasedAt: timestamp('released_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    characterStatusIdx: index('hospital_stays_character_status_idx').on(table.characterId, table.status),
    releaseIdx: index('hospital_stays_release_idx').on(table.status, table.releasedAt),
  }),
);

export const jailSentences = pgTable(
  'jail_sentences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    severity: integer('severity').notNull().default(1),
    fine: integer('fine').notNull().default(0),
    status: text('status').notNull().default('active'),
    arrestedAt: timestamp('arrested_at', { withTimezone: true }).notNull().defaultNow(),
    releaseAt: timestamp('release_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    characterStatusIdx: index('jail_sentences_character_status_idx').on(table.characterId, table.status),
    releaseIdx: index('jail_sentences_release_idx').on(table.status, table.releaseAt),
  }),
);


export const legalServiceLogs = pgTable(
  'legal_service_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    serviceType: text('service_type').notNull(),
    serviceTier: text('service_tier').notNull(),
    cost: integer('cost').notNull().default(0),
    heatBefore: integer('heat_before').notNull().default(0),
    heatAfter: integer('heat_after').notNull().default(0),
    success: boolean('success').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterCreatedAtIdx: index('legal_service_logs_character_created_at_idx').on(table.characterId, table.createdAt),
  }),
);

export const moderationNotes = pgTable(
  'moderation_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    note: text('note').notNull(),
    severity: text('severity').notNull().default('info'),
    metadata: jsonb('metadata').notNull().default({}),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterCreatedAtIdx: index('moderation_notes_character_created_at_idx').on(table.characterId, table.createdAt),
  }),
);

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdByCharacterId: uuid('created_by_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    assignedToCharacterId: uuid('assigned_to_character_id').references(() => characters.id, { onDelete: 'set null' }),
    factionId: uuid('faction_id').references(() => factions.id, { onDelete: 'set null' }),
    contractType: contractType('contract_type').notNull(),
    status: contractStatus('status').notNull().default('open'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    originLocation: text('origin_location'),
    targetLocation: text('target_location'),
    itemKey: text('item_key').references(() => itemDefinitions.key),
    quantity: integer('quantity').notNull().default(0),
    reward: integer('reward').notNull().default(0),
    escrowAmount: integer('escrow_amount').notNull().default(0),
    risk: integer('risk').notNull().default(1),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusCreatedAtIdx: index('contracts_status_created_at_idx').on(table.status, table.createdAt),
    creatorIdx: index('contracts_creator_idx').on(table.createdByCharacterId, table.createdAt),
    assigneeIdx: index('contracts_assignee_idx').on(table.assignedToCharacterId, table.createdAt),
    factionIdx: index('contracts_faction_idx').on(table.factionId, table.createdAt),
    targetLocationIdx: index('contracts_target_location_idx').on(table.targetLocation, table.status),
  }),
);

export const contractEvents = pgTable(
  'contract_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    actorCharacterId: uuid('actor_character_id').references(() => characters.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    amount: integer('amount').notNull().default(0),
    description: text('description').notNull().default(''),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contractCreatedAtIdx: index('contract_events_contract_created_at_idx').on(table.contractId, table.createdAt),
    actorCreatedAtIdx: index('contract_events_actor_created_at_idx').on(table.actorCharacterId, table.createdAt),
  }),
);

export const combatLogs = pgTable(
  'combat_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attackerCharacterId: uuid('attacker_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    defenderCharacterId: uuid('defender_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    attackerFactionId: uuid('attacker_faction_id').references(() => factions.id, { onDelete: 'set null' }),
    defenderFactionId: uuid('defender_faction_id').references(() => factions.id, { onDelete: 'set null' }),
    territoryKey: text('territory_key').references(() => territories.key, { onDelete: 'set null' }),
    outcome: combatOutcome('outcome').notNull(),
    attackerPower: integer('attacker_power').notNull().default(0),
    defenderPower: integer('defender_power').notNull().default(0),
    damageToAttacker: integer('damage_to_attacker').notNull().default(0),
    damageToDefender: integer('damage_to_defender').notNull().default(0),
    cashStolen: integer('cash_stolen').notNull().default(0),
    experienceAwarded: integer('experience_awarded').notNull().default(0),
    heatGain: integer('heat_gain').notNull().default(0),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    attackerCreatedAtIdx: index('combat_logs_attacker_created_at_idx').on(table.attackerCharacterId, table.createdAt),
    defenderCreatedAtIdx: index('combat_logs_defender_created_at_idx').on(table.defenderCharacterId, table.createdAt),
    territoryCreatedAtIdx: index('combat_logs_territory_created_at_idx').on(table.territoryKey, table.createdAt),
  }),
);

export const bounties = pgTable(
  'bounties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdByCharacterId: uuid('created_by_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    targetCharacterId: uuid('target_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    claimedByCharacterId: uuid('claimed_by_character_id').references(() => characters.id, { onDelete: 'set null' }),
    status: bountyStatus('status').notNull().default('open'),
    reward: integer('reward').notNull().default(0),
    postingFee: integer('posting_fee').notNull().default(0),
    reason: text('reason').notNull().default(''),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusRewardIdx: index('bounties_status_reward_idx').on(table.status, table.reward),
    targetStatusIdx: index('bounties_target_status_idx').on(table.targetCharacterId, table.status),
    creatorCreatedAtIdx: index('bounties_creator_created_at_idx').on(table.createdByCharacterId, table.createdAt),
  }),
);

export const factionWars = pgTable(
  'faction_wars',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attackerFactionId: uuid('attacker_faction_id')
      .notNull()
      .references(() => factions.id, { onDelete: 'cascade' }),
    defenderFactionId: uuid('defender_faction_id')
      .notNull()
      .references(() => factions.id, { onDelete: 'cascade' }),
    declaredByCharacterId: uuid('declared_by_character_id').references(() => characters.id, { onDelete: 'set null' }),
    territoryKey: text('territory_key').references(() => territories.key, { onDelete: 'set null' }),
    status: factionWarStatus('status').notNull().default('declared'),
    attackerScore: integer('attacker_score').notNull().default(0),
    defenderScore: integer('defender_score').notNull().default(0),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    winnerFactionId: uuid('winner_faction_id').references(() => factions.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusEndsAtIdx: index('faction_wars_status_ends_at_idx').on(table.status, table.endsAt),
    attackerStatusIdx: index('faction_wars_attacker_status_idx').on(table.attackerFactionId, table.status),
    defenderStatusIdx: index('faction_wars_defender_status_idx').on(table.defenderFactionId, table.status),
  }),
);


export const achievementDefinitions = pgTable('achievement_definitions', {
  key: text('key').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('general'),
  metricKey: text('metric_key').notNull(),
  target: integer('target').notNull().default(1),
  points: integer('points').notNull().default(0),
  cashReward: integer('cash_reward').notNull().default(0),
  experienceReward: integer('experience_reward').notNull().default(0),
  titleRewardKey: text('title_reward_key'),
  titleRewardName: text('title_reward_name'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterAchievements = pgTable(
  'character_achievements',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    achievementKey: text('achievement_key')
      .notNull()
      .references(() => achievementDefinitions.key, { onDelete: 'cascade' }),
    progress: integer('progress').notNull().default(0),
    target: integer('target').notNull().default(1),
    isCompleted: boolean('is_completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.achievementKey] }),
    characterCompletedIdx: index('character_achievements_character_completed_idx').on(table.characterId, table.isCompleted, table.completedAt),
  }),
);

export const characterTitles = pgTable(
  'character_titles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    titleKey: text('title_key').notNull(),
    title: text('title').notNull(),
    source: text('source').notNull().default('achievement'),
    isActive: boolean('is_active').notNull().default(false),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterTitleUnique: uniqueIndex('character_titles_character_title_unique').on(table.characterId, table.titleKey),
    characterActiveIdx: index('character_titles_character_active_idx').on(table.characterId, table.isActive),
  }),
);

export const objectiveDefinitions = pgTable('objective_definitions', {
  key: text('key').primaryKey(),
  cadence: text('cadence').notNull().default('daily'),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  metricKey: text('metric_key').notNull(),
  target: integer('target').notNull().default(1),
  rewardCash: integer('reward_cash').notNull().default(0),
  rewardExperience: integer('reward_experience').notNull().default(0),
  rewardPoints: integer('reward_points').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterObjectives = pgTable(
  'character_objectives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    objectiveKey: text('objective_key')
      .notNull()
      .references(() => objectiveDefinitions.key, { onDelete: 'cascade' }),
    cadence: text('cadence').notNull().default('daily'),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    progress: integer('progress').notNull().default(0),
    target: integer('target').notNull().default(1),
    status: text('status').notNull().default('active'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterObjectiveUnique: uniqueIndex('character_objectives_character_objective_unique').on(table.characterId, table.objectiveKey, table.periodStart),
    characterPeriodIdx: index('character_objectives_character_period_idx').on(table.characterId, table.cadence, table.periodStart, table.status),
  }),
);


export const seasons = pgTable(
  'seasons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('active'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusDatesIdx: index('seasons_status_dates_idx').on(table.status, table.startsAt, table.endsAt),
  }),
);

export const seasonRewardTiers = pgTable(
  'season_reward_tiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seasonId: uuid('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'cascade' }),
    tier: integer('tier').notNull(),
    pointsRequired: integer('points_required').notNull().default(0),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    rewardCash: integer('reward_cash').notNull().default(0),
    rewardExperience: integer('reward_experience').notNull().default(0),
    rewardLegacyPoints: integer('reward_legacy_points').notNull().default(0),
    titleRewardKey: text('title_reward_key'),
    titleRewardName: text('title_reward_name'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    seasonTierUnique: uniqueIndex('season_reward_tiers_season_tier_unique').on(table.seasonId, table.tier),
    seasonPointsIdx: index('season_reward_tiers_season_points_idx').on(table.seasonId, table.pointsRequired),
  }),
);

export const characterSeasonProgress = pgTable(
  'character_season_progress',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    seasonId: uuid('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'cascade' }),
    seasonPoints: integer('season_points').notNull().default(0),
    highestClaimedTier: integer('highest_claimed_tier').notNull().default(0),
    bestRank: integer('best_rank'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.seasonId] }),
    seasonPointsIdx: index('character_season_progress_season_points_idx').on(table.seasonId, table.seasonPoints),
  }),
);

export const legacyRecords = pgTable(
  'legacy_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    prestigeLevel: integer('prestige_level').notNull(),
    legacyPointsAwarded: integer('legacy_points_awarded').notNull().default(0),
    retiredLevel: integer('retired_level').notNull().default(1),
    retiredExperience: integer('retired_experience').notNull().default(0),
    retiredCash: integer('retired_cash').notNull().default(0),
    retiredBank: integer('retired_bank').notNull().default(0),
    profileScore: integer('profile_score').notNull().default(0),
    snapshot: jsonb('snapshot').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterCreatedIdx: index('legacy_records_character_created_idx').on(table.characterId, table.createdAt),
    userCreatedIdx: index('legacy_records_user_created_idx').on(table.userId, table.createdAt),
  }),
);

export const legacyPerks = pgTable(
  'legacy_perks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    perkKey: text('perk_key').notNull(),
    tier: integer('tier').notNull().default(1),
    source: text('source').notNull().default('prestige'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterPerkUnique: uniqueIndex('legacy_perks_character_perk_unique').on(table.characterId, table.perkKey),
  }),
);



export const productCatalog = pgTable(
  'product_catalog',
  {
    key: text('key').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    productType: text('product_type').notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeTypeIdx: index('product_catalog_active_type_idx').on(table.isActive, table.productType),
  }),
);

export const userEntitlements = pgTable(
  'user_entitlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productKey: text('product_key').references(() => productCatalog.key, { onDelete: 'set null' }),
    entitlementKey: text('entitlement_key').notNull(),
    source: text('source').notNull().default('system'),
    status: text('status').notNull().default('active'),
    grantedByUserId: uuid('granted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index('user_entitlements_user_status_idx').on(table.userId, table.status, table.startsAt, table.endsAt),
    userKeyActiveUnique: uniqueIndex('user_entitlements_user_key_active_unique')
      .on(table.userId, table.entitlementKey)
      .where(sql`${table.status} = 'active' AND ${table.endsAt} IS NULL`),
  }),
);

export const characterCosmetics = pgTable(
  'character_cosmetics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    cosmeticKey: text('cosmetic_key').notNull(),
    slot: text('slot').notNull(),
    sourceEntitlementId: uuid('source_entitlement_id').references(() => userEntitlements.id, { onDelete: 'set null' }),
    isEquipped: boolean('is_equipped').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterSlotIdx: index('character_cosmetics_character_slot_idx').on(table.characterId, table.slot, table.isEquipped),
    characterCosmeticUnique: uniqueIndex('character_cosmetics_unique').on(table.characterId, table.cosmeticKey),
    oneEquippedPerSlotIdx: uniqueIndex('character_cosmetics_one_equipped_per_slot_idx')
      .on(table.characterId, table.slot)
      .where(sql`${table.isEquipped} = true`),
  }),
);


export const productCatalogRelations = relations(productCatalog, ({ many }) => ({
  entitlements: many(userEntitlements),
}));

export const userEntitlementsRelations = relations(userEntitlements, ({ one, many }) => ({
  user: one(users, { fields: [userEntitlements.userId], references: [users.id] }),
  product: one(productCatalog, { fields: [userEntitlements.productKey], references: [productCatalog.key] }),
  grantedBy: one(users, { fields: [userEntitlements.grantedByUserId], references: [users.id], relationName: 'entitlementGrantedBy' }),
  cosmetics: many(characterCosmetics),
}));

export const characterCosmeticsRelations = relations(characterCosmetics, ({ one }) => ({
  character: one(characters, { fields: [characterCosmetics.characterId], references: [characters.id] }),
  entitlement: one(userEntitlements, { fields: [characterCosmetics.sourceEntitlementId], references: [userEntitlements.id] }),
}));

export const seasonsRelations = relations(seasons, ({ many }) => ({
  rewardTiers: many(seasonRewardTiers),
  characterProgress: many(characterSeasonProgress),
}));

export const seasonRewardTiersRelations = relations(seasonRewardTiers, ({ one }) => ({
  season: one(seasons, { fields: [seasonRewardTiers.seasonId], references: [seasons.id] }),
}));

export const characterSeasonProgressRelations = relations(characterSeasonProgress, ({ one }) => ({
  character: one(characters, { fields: [characterSeasonProgress.characterId], references: [characters.id] }),
  season: one(seasons, { fields: [characterSeasonProgress.seasonId], references: [seasons.id] }),
}));

export const legacyRecordsRelations = relations(legacyRecords, ({ one }) => ({
  user: one(users, { fields: [legacyRecords.userId], references: [users.id] }),
  character: one(characters, { fields: [legacyRecords.characterId], references: [characters.id] }),
}));

export const legacyPerksRelations = relations(legacyPerks, ({ one }) => ({
  character: one(characters, { fields: [legacyPerks.characterId], references: [characters.id] }),
}));


export const npcContactDefinitions = pgTable('npc_contact_definitions', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  specialty: contactSpecialty('specialty').notNull(),
  description: text('description').notNull().default(''),
  minLevel: integer('min_level').notNull().default(1),
  baseLoyalty: integer('base_loyalty').notNull().default(35),
  recruitCost: integer('recruit_cost').notNull().default(250),
  upkeep: integer('upkeep').notNull().default(50),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterContacts = pgTable(
  'character_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    contactKey: text('contact_key')
      .notNull()
      .references(() => npcContactDefinitions.key),
    nickname: text('nickname'),
    specialty: contactSpecialty('specialty').notNull(),
    level: integer('level').notNull().default(1),
    experience: integer('experience').notNull().default(0),
    loyalty: integer('loyalty').notNull().default(35),
    upkeep: integer('upkeep').notNull().default(50),
    status: contactStatus('status').notNull().default('idle'),
    statusUntil: timestamp('status_until', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterContactUnique: uniqueIndex('character_contacts_character_contact_unique').on(table.characterId, table.contactKey),
    characterStatusIdx: index('character_contacts_character_status_idx').on(table.characterId, table.status),
  }),
);

export const contactAssignments = pgTable(
  'contact_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => characterContacts.id, { onDelete: 'cascade' }),
    assignmentType: contactAssignmentType('assignment_type').notNull(),
    status: contactAssignmentStatus('status').notNull().default('queued'),
    riskScore: integer('risk_score').notNull().default(0),
    rewardCash: integer('reward_cash').notNull().default(0),
    rewardExperience: integer('reward_experience').notNull().default(0),
    loyaltyDelta: integer('loyalty_delta').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completesAt: timestamp('completes_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => ({
    characterStatusIdx: index('contact_assignments_character_status_idx').on(table.characterId, table.status),
    readyIdx: index('contact_assignments_ready_idx').on(table.status, table.completesAt),
  }),
);


export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'cascade' }),
    category: notificationCategory('category').notNull().default('system'),
    priority: notificationPriority('priority').notNull().default('normal'),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    actionUrl: text('action_url'),
    sourceType: text('source_type'),
    sourceId: text('source_id'),
    metadata: jsonb('metadata').notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userUnreadIdx: index('notifications_user_unread_idx').on(table.userId, table.readAt, table.archivedAt, table.createdAt),
    characterCreatedIdx: index('notifications_character_created_idx').on(table.characterId, table.createdAt),
  }),
);

export const activityFeedEntries = pgTable(
  'activity_feed_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: activityFeedScope('scope').notNull().default('private'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    factionId: uuid('faction_id').references(() => factions.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    category: notificationCategory('category').notNull().default('system'),
    sourceType: text('source_type'),
    sourceId: text('source_id'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scopeCreatedIdx: index('activity_feed_scope_created_idx').on(table.scope, table.createdAt),
    characterCreatedIdx: index('activity_feed_character_created_idx').on(table.characterId, table.createdAt),
    factionCreatedIdx: index('activity_feed_faction_created_idx').on(table.factionId, table.createdAt),
  }),
);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  mutedCategories: text('muted_categories').array().notNull().default([]),
  digestEnabled: boolean('digest_enabled').notNull().default(true),
  digestFrequencyMinutes: integer('digest_frequency_minutes').notNull().default(1440),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notificationDigests = pgTable(
  'notification_digests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    notificationCount: integer('notification_count').notNull().default(0),
    unreadCount: integer('unread_count').notNull().default(0),
    summary: text('summary').notNull().default(''),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index('notification_digests_user_created_idx').on(table.userId, table.createdAt),
  }),
);

export const gameConfigEntries = pgTable(
  'game_config_entries',
  {
    key: text('key').primaryKey(),
    label: text('label').notNull(),
    description: text('description').notNull().default(''),
    value: jsonb('value').notNull().default({}),
    category: text('category').notNull().default('general'),
    isPublic: boolean('is_public').notNull().default(false),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index('game_config_entries_category_idx').on(table.category),
  }),
);

export const adminActionLogs = pgTable(
  'admin_action_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminUserId: uuid('admin_user_id').references(() => users.id, { onDelete: 'set null' }),
    targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'set null' }),
    targetCharacterId: uuid('target_character_id').references(() => characters.id, { onDelete: 'set null' }),
    actionType: adminActionType('action_type').notNull(),
    summary: text('summary').notNull(),
    beforeValue: jsonb('before_value').notNull().default({}),
    afterValue: jsonb('after_value').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    adminCreatedIdx: index('admin_action_logs_admin_created_idx').on(table.adminUserId, table.createdAt),
    targetCharacterCreatedIdx: index('admin_action_logs_target_character_created_idx').on(table.targetCharacterId, table.createdAt),
    typeCreatedIdx: index('admin_action_logs_type_created_idx').on(table.actionType, table.createdAt),
  }),
);

export const characterFlags = pgTable(
  'character_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    flagType: characterFlagType('flag_type').notNull(),
    reason: text('reason').notNull(),
    severity: integer('severity').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterActiveIdx: index('character_flags_character_active_idx').on(table.characterId, table.isActive),
    typeActiveIdx: index('character_flags_type_active_idx').on(table.flagType, table.isActive),
  }),
);

export const characterEnforcements = pgTable(
  'character_enforcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    actionType: enforcementActionType('action_type').notNull(),
    reason: text('reason').notNull(),
    severity: integer('severity').notNull().default(1),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    liftedByUserId: uuid('lifted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    liftedAt: timestamp('lifted_at', { withTimezone: true }),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
    expiryReason: text('expiry_reason'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterActiveIdx: index('character_enforcements_character_active_idx').on(table.characterId, table.isActive, table.endsAt),
    actionActiveIdx: index('character_enforcements_action_active_idx').on(table.actionType, table.isActive, table.endsAt),
  }),
);

export const enforcementAppeals = pgTable(
  'enforcement_appeals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enforcementId: uuid('enforcement_id')
      .notNull()
      .references(() => characterEnforcements.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    status: enforcementAppealStatus('status').notNull().default('open'),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    enforcementCharacterUnique: uniqueIndex('enforcement_appeals_enforcement_character_unique').on(table.enforcementId, table.characterId),
    statusCreatedIdx: index('enforcement_appeals_status_created_idx').on(table.status, table.createdAt),
    characterCreatedIdx: index('enforcement_appeals_character_created_idx').on(table.characterId, table.createdAt),
  }),
);


export const systemAnnouncements = pgTable(
  'system_announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: announcementStatus('status').notNull().default('draft'),
    severity: text('severity').notNull().default('info'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusWindowIdx: index('system_announcements_status_window_idx').on(table.status, table.startsAt, table.endsAt),
  }),
);

export const workerDeadLetters = pgTable(
  'worker_dead_letters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tickName: text('tick_name').notNull(),
    attempts: integer('attempts').notNull().default(1),
    errorName: text('error_name').notNull().default('Error'),
    errorMessage: text('error_message').notNull(),
    errorStack: text('error_stack'),
    payload: jsonb('payload').notNull().default({}),
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    statusCreatedIdx: index('worker_dead_letters_status_created_idx').on(table.status, table.createdAt),
    tickCreatedIdx: index('worker_dead_letters_tick_created_idx').on(table.tickName, table.createdAt),
  }),
);


export const operationalAnomalies = pgTable(
  'operational_anomalies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    signalKey: text('signal_key').notNull(),
    signalCategory: text('signal_category').notNull(),
    severity: integer('severity').notNull().default(1),
    summary: text('summary').notNull(),
    evidence: jsonb('evidence').notNull().default({}),
    status: text('status').notNull().default('open'),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    signalKeyUnique: uniqueIndex('operational_anomalies_signal_key_unique').on(table.signalKey),
    statusSeverityIdx: index('operational_anomalies_status_severity_idx').on(table.status, table.severity, table.detectedAt),
    characterStatusIdx: index('operational_anomalies_character_status_idx').on(table.characterId, table.status, table.detectedAt),
    userStatusIdx: index('operational_anomalies_user_status_idx').on(table.userId, table.status, table.detectedAt),
    categoryDetectedIdx: index('operational_anomalies_category_detected_idx').on(table.signalCategory, table.detectedAt),
  }),
);

export const gameConfigEntriesRelations = relations(gameConfigEntries, ({ one }) => ({
  updatedBy: one(users, { fields: [gameConfigEntries.updatedByUserId], references: [users.id] }),
}));

export const adminActionLogsRelations = relations(adminActionLogs, ({ one }) => ({
  admin: one(users, { fields: [adminActionLogs.adminUserId], references: [users.id], relationName: 'adminActionActor' }),
  targetUser: one(users, { fields: [adminActionLogs.targetUserId], references: [users.id], relationName: 'adminActionTargetUser' }),
  targetCharacter: one(characters, { fields: [adminActionLogs.targetCharacterId], references: [characters.id] }),
}));

export const characterFlagsRelations = relations(characterFlags, ({ one }) => ({
  character: one(characters, { fields: [characterFlags.characterId], references: [characters.id] }),
  createdBy: one(users, { fields: [characterFlags.createdByUserId], references: [users.id], relationName: 'flagCreatedBy' }),
  resolvedBy: one(users, { fields: [characterFlags.resolvedByUserId], references: [users.id], relationName: 'flagResolvedBy' }),
}));


export const characterEnforcementsRelations = relations(characterEnforcements, ({ one, many }) => ({
  character: one(characters, { fields: [characterEnforcements.characterId], references: [characters.id] }),
  createdBy: one(users, { fields: [characterEnforcements.createdByUserId], references: [users.id], relationName: 'enforcementCreatedBy' }),
  liftedBy: one(users, { fields: [characterEnforcements.liftedByUserId], references: [users.id], relationName: 'enforcementLiftedBy' }),
  appeals: many(enforcementAppeals),
}));

export const enforcementAppealsRelations = relations(enforcementAppeals, ({ one }) => ({
  enforcement: one(characterEnforcements, { fields: [enforcementAppeals.enforcementId], references: [characterEnforcements.id] }),
  character: one(characters, { fields: [enforcementAppeals.characterId], references: [characters.id] }),
  reviewedBy: one(users, { fields: [enforcementAppeals.reviewedByUserId], references: [users.id], relationName: 'appealReviewedBy' }),
}));

export const systemAnnouncementsRelations = relations(systemAnnouncements, ({ one }) => ({
  createdBy: one(users, { fields: [systemAnnouncements.createdByUserId], references: [users.id] }),
}));

export const operationalAnomaliesRelations = relations(operationalAnomalies, ({ one }) => ({
  character: one(characters, { fields: [operationalAnomalies.characterId], references: [characters.id] }),
  user: one(users, { fields: [operationalAnomalies.userId], references: [users.id], relationName: 'operationalAnomalyUser' }),
  resolvedBy: one(users, { fields: [operationalAnomalies.resolvedByUserId], references: [users.id], relationName: 'operationalAnomalyResolvedBy' }),
}));




export const characterEquipmentRelations = relations(characterEquipment, ({ one, many }) => ({
  character: one(characters, { fields: [characterEquipment.characterId], references: [characters.id] }),
  inventoryItem: one(inventoryItems, { fields: [characterEquipment.inventoryItemId], references: [inventoryItems.id] }),
  item: one(itemDefinitions, { fields: [characterEquipment.itemKey], references: [itemDefinitions.key] }),
  vehicleUpgrades: many(characterVehicleUpgrades),
}));

export const vehicleUpgradeDefinitionsRelations = relations(vehicleUpgradeDefinitions, ({ many }) => ({
  installedUpgrades: many(characterVehicleUpgrades),
}));

export const characterVehicleUpgradesRelations = relations(characterVehicleUpgrades, ({ one }) => ({
  character: one(characters, { fields: [characterVehicleUpgrades.characterId], references: [characters.id] }),
  equipment: one(characterEquipment, { fields: [characterVehicleUpgrades.equipmentId], references: [characterEquipment.id] }),
  upgrade: one(vehicleUpgradeDefinitions, { fields: [characterVehicleUpgrades.upgradeKey], references: [vehicleUpgradeDefinitions.key] }),
}));

export const travelCargoRelations = relations(travelCargo, ({ one }) => ({
  travelPlan: one(travelPlans, { fields: [travelCargo.travelPlanId], references: [travelPlans.id] }),
  character: one(characters, { fields: [travelCargo.characterId], references: [characters.id] }),
  item: one(itemDefinitions, { fields: [travelCargo.itemKey], references: [itemDefinitions.key] }),
}));

export const craftingRecipeDefinitionsRelations = relations(craftingRecipeDefinitions, ({ one, many }) => ({
  outputItem: one(itemDefinitions, { fields: [craftingRecipeDefinitions.outputItemKey], references: [itemDefinitions.key] }),
  jobs: many(craftingJobs),
}));

export const characterWorkshopsRelations = relations(characterWorkshops, ({ one, many }) => ({
  character: one(characters, { fields: [characterWorkshops.characterId], references: [characters.id] }),
  jobs: many(craftingJobs),
}));

export const craftingJobsRelations = relations(craftingJobs, ({ one, many }) => ({
  character: one(characters, { fields: [craftingJobs.characterId], references: [characters.id] }),
  recipe: one(craftingRecipeDefinitions, { fields: [craftingJobs.recipeKey], references: [craftingRecipeDefinitions.key] }),
  workshop: one(characterWorkshops, { fields: [craftingJobs.workshopId], references: [characterWorkshops.id] }),
  outputItem: one(itemDefinitions, { fields: [craftingJobs.outputItemKey], references: [itemDefinitions.key] }),
  inputs: many(craftingJobInputs),
}));

export const craftingJobInputsRelations = relations(craftingJobInputs, ({ one }) => ({
  job: one(craftingJobs, { fields: [craftingJobInputs.craftingJobId], references: [craftingJobs.id] }),
  character: one(characters, { fields: [craftingJobInputs.characterId], references: [characters.id] }),
  item: one(itemDefinitions, { fields: [craftingJobInputs.itemKey], references: [itemDefinitions.key] }),
}));


export const apiIdempotencyKeys = pgTable(
  'api_idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestKey: text('request_key').notNull(),
    routeScope: text('route_scope').notNull(),
    requestHash: text('request_hash').notNull(),
    status: text('status').notNull().default('processing'),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    userKeyScopeUnique: uniqueIndex('api_idempotency_user_key_scope_unique').on(table.userId, table.requestKey, table.routeScope),
    userCreatedAtIdx: index('api_idempotency_user_created_at_idx').on(table.userId, table.createdAt),
    expiresAtIdx: index('api_idempotency_expires_at_idx').on(table.expiresAt),
  }),
);

export const characterLoans = pgTable(
  'character_loans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    offerKey: text('offer_key').notNull(),
    principal: integer('principal').notNull(),
    fee: integer('fee').notNull(),
    repaidAmount: integer('repaid_amount').notNull().default(0),
    status: text('status').notNull().default('active'),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    repaidAt: timestamp('repaid_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterStatusIdx: index('character_loans_character_status_idx').on(table.characterId, table.status, table.dueAt),
    createdAtIdx: index('character_loans_created_at_idx').on(table.createdAt),
  }),
);

export const financialTransactions = pgTable(
  'financial_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    type: transactionType('type').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    description: text('description').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    characterCreatedAtIdx: index('financial_transactions_character_created_at_idx').on(table.characterId, table.createdAt),
  }),
);


export const apiIdempotencyKeysRelations = relations(apiIdempotencyKeys, ({ one }) => ({
  user: one(users, { fields: [apiIdempotencyKeys.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  characters: many(characters),
  sessions: many(userSessions),
  passwordResetTokens: many(passwordResetTokens),
  emailVerificationTokens: many(emailVerificationTokens),
  updatedConfigEntries: many(gameConfigEntries),
  updatedItemImages: many(itemImages),
  adminActionLogs: many(adminActionLogs, { relationName: 'adminActionActor' }),
  targetedAdminActionLogs: many(adminActionLogs, { relationName: 'adminActionTargetUser' }),
  createdFlags: many(characterFlags, { relationName: 'flagCreatedBy' }),
  resolvedFlags: many(characterFlags, { relationName: 'flagResolvedBy' }),
  createdEnforcements: many(characterEnforcements, { relationName: 'enforcementCreatedBy' }),
  liftedEnforcements: many(characterEnforcements, { relationName: 'enforcementLiftedBy' }),
  reviewedEnforcementAppeals: many(enforcementAppeals, { relationName: 'appealReviewedBy' }),
  systemAnnouncements: many(systemAnnouncements),
  operationalAnomalies: many(operationalAnomalies, { relationName: 'operationalAnomalyUser' }),
  resolvedOperationalAnomalies: many(operationalAnomalies, { relationName: 'operationalAnomalyResolvedBy' }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, { fields: [emailVerificationTokens.userId], references: [users.id] }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
  events: many(playerEvents),
  inventoryItems: many(inventoryItems),
  equipment: many(characterEquipment),
  vehicleUpgrades: many(characterVehicleUpgrades),
  travelCargo: many(travelCargo),
  workshops: many(characterWorkshops),
  craftingJobs: many(craftingJobs),
  craftingJobInputs: many(craftingJobInputs),
  crimeAttempts: many(crimeAttempts),
  jobRuns: many(jobRuns),
  characterJobs: many(characterJobs),
  trainingSessions: many(trainingSessions),
  courseEnrollments: many(courseEnrollments),
  actionLocks: many(characterActionLocks),
  hospitalStays: many(hospitalStays),
  jailSentences: many(jailSentences),
  legalServiceLogs: many(legalServiceLogs),
  gamblingWagers: many(gamblingWagers),
  moderationNotes: many(moderationNotes),
  factionMemberships: many(factionMembers),
  factionLedgerEntries: many(factionLedgerEntries),
  territoryActions: many(territoryActions),
  shops: many(shops),
  shopReviews: many(shopReviews),
  shopAdCampaigns: many(shopAdCampaigns),
  shopLedgerSales: many(shopLedgerEntries, { relationName: 'seller' }),
  shopLedgerPurchases: many(shopLedgerEntries, { relationName: 'buyer' }),
  newspaperArticles: many(newspaperArticles),
  newspaperComments: many(newspaperArticleComments),
  newspaperReactions: many(newspaperArticleReactions),
  newspaperReports: many(newspaperArticleReports),
  createdContracts: many(contracts, { relationName: 'contractCreator' }),
  assignedContracts: many(contracts, { relationName: 'contractAssignee' }),
  contractEvents: many(contractEvents),
  achievements: many(characterAchievements),
  titles: many(characterTitles),
  objectives: many(characterObjectives),
  seasonProgress: many(characterSeasonProgress),
  legacyRecords: many(legacyRecords),
  legacyPerks: many(legacyPerks),
  adminActionLogs: many(adminActionLogs),
  characterFlags: many(characterFlags),
  enforcements: many(characterEnforcements),
  enforcementAppeals: many(enforcementAppeals),
  contacts: many(characterContacts),
  contactAssignments: many(contactAssignments),
  tradeOffersCreated: many(playerTradeOffers, { relationName: 'tradeSeller' }),
  tradeOffersReceived: many(playerTradeOffers, { relationName: 'tradeBuyer' }),
}));



export const itemDefinitionsRelations = relations(itemDefinitions, ({ many, one }) => ({
  image: one(itemImages),
  inventoryItems: many(inventoryItems),
  equipment: many(characterEquipment),
  travelCargo: many(travelCargo),
  craftingRecipes: many(craftingRecipeDefinitions),
  craftingJobs: many(craftingJobs),
  craftingJobInputs: many(craftingJobInputs),
  shopListings: many(shopListings),
  marketPrices: many(marketPrices),
  marketEvents: many(marketEvents),
  playerTradeOffers: many(playerTradeOffers),
  factionInventoryItems: many(factionInventoryItems),
}));


export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(itemDefinitions, { fields: [itemImages.itemKey], references: [itemDefinitions.key] }),
  updatedBy: one(users, { fields: [itemImages.updatedByUserId], references: [users.id] }),
}));

export const factionInventoryItemsRelations = relations(factionInventoryItems, ({ one }) => ({
  faction: one(factions, { fields: [factionInventoryItems.factionId], references: [factions.id] }),
  item: one(itemDefinitions, { fields: [factionInventoryItems.itemKey], references: [itemDefinitions.key] }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  character: one(characters, { fields: [inventoryItems.characterId], references: [characters.id] }),
  item: one(itemDefinitions, { fields: [inventoryItems.itemKey], references: [itemDefinitions.key] }),
  equipmentRecords: many(characterEquipment),
}));

export const shopsRelations = relations(shops, ({ one, many }) => ({
  owner: one(characters, { fields: [shops.ownerCharacterId], references: [characters.id] }),
  listings: many(shopListings),
  ledgerEntries: many(shopLedgerEntries),
  reviews: many(shopReviews),
  adCampaigns: many(shopAdCampaigns),
}));

export const shopReviewsRelations = relations(shopReviews, ({ one }) => ({
  shop: one(shops, { fields: [shopReviews.shopId], references: [shops.id] }),
  reviewer: one(characters, { fields: [shopReviews.reviewerCharacterId], references: [characters.id] }),
}));

export const shopAdCampaignsRelations = relations(shopAdCampaigns, ({ one }) => ({
  shop: one(shops, { fields: [shopAdCampaigns.shopId], references: [shops.id] }),
  character: one(characters, { fields: [shopAdCampaigns.characterId], references: [characters.id] }),
}));

export const shopListingsRelations = relations(shopListings, ({ one, many }) => ({
  shop: one(shops, { fields: [shopListings.shopId], references: [shops.id] }),
  item: one(itemDefinitions, { fields: [shopListings.itemKey], references: [itemDefinitions.key] }),
  ledgerEntries: many(shopLedgerEntries),
}));

export const shopLedgerEntriesRelations = relations(shopLedgerEntries, ({ one }) => ({
  shop: one(shops, { fields: [shopLedgerEntries.shopId], references: [shops.id] }),
  listing: one(shopListings, { fields: [shopLedgerEntries.listingId], references: [shopListings.id] }),
  seller: one(characters, { fields: [shopLedgerEntries.sellerCharacterId], references: [characters.id], relationName: 'seller' }),
  buyer: one(characters, { fields: [shopLedgerEntries.buyerCharacterId], references: [characters.id], relationName: 'buyer' }),
  item: one(itemDefinitions, { fields: [shopLedgerEntries.itemKey], references: [itemDefinitions.key] }),
}));


export const marketEventsRelations = relations(marketEvents, ({ one }) => ({
  item: one(itemDefinitions, { fields: [marketEvents.itemKey], references: [itemDefinitions.key] }),
  publishedArticle: one(newspaperArticles, { fields: [marketEvents.publishedArticleId], references: [newspaperArticles.id] }),
}));

export const playerTradeOffersRelations = relations(playerTradeOffers, ({ one }) => ({
  seller: one(characters, { fields: [playerTradeOffers.sellerCharacterId], references: [characters.id], relationName: 'tradeSeller' }),
  buyer: one(characters, { fields: [playerTradeOffers.buyerCharacterId], references: [characters.id], relationName: 'tradeBuyer' }),
  item: one(itemDefinitions, { fields: [playerTradeOffers.itemKey], references: [itemDefinitions.key] }),
}));

export const newspaperArticlesRelations = relations(newspaperArticles, ({ one, many }) => ({
  author: one(characters, { fields: [newspaperArticles.authorCharacterId], references: [characters.id] }),
  comments: many(newspaperArticleComments),
  reactions: many(newspaperArticleReactions),
  reports: many(newspaperArticleReports),
}));

export const newspaperArticleCommentsRelations = relations(newspaperArticleComments, ({ one }) => ({
  article: one(newspaperArticles, { fields: [newspaperArticleComments.articleId], references: [newspaperArticles.id] }),
  author: one(characters, { fields: [newspaperArticleComments.authorCharacterId], references: [characters.id] }),
}));

export const newspaperArticleReactionsRelations = relations(newspaperArticleReactions, ({ one }) => ({
  article: one(newspaperArticles, { fields: [newspaperArticleReactions.articleId], references: [newspaperArticles.id] }),
  character: one(characters, { fields: [newspaperArticleReactions.characterId], references: [characters.id] }),
}));

export const newspaperArticleReportsRelations = relations(newspaperArticleReports, ({ one }) => ({
  article: one(newspaperArticles, { fields: [newspaperArticleReports.articleId], references: [newspaperArticles.id] }),
  reporter: one(characters, { fields: [newspaperArticleReports.reporterCharacterId], references: [characters.id] }),
}));




export const contractsRelations = relations(contracts, ({ one, many }) => ({
  creator: one(characters, { fields: [contracts.createdByCharacterId], references: [characters.id], relationName: 'contractCreator' }),
  assignee: one(characters, { fields: [contracts.assignedToCharacterId], references: [characters.id], relationName: 'contractAssignee' }),
  faction: one(factions, { fields: [contracts.factionId], references: [factions.id] }),
  item: one(itemDefinitions, { fields: [contracts.itemKey], references: [itemDefinitions.key] }),
  events: many(contractEvents),
}));

export const contractEventsRelations = relations(contractEvents, ({ one }) => ({
  contract: one(contracts, { fields: [contractEvents.contractId], references: [contracts.id] }),
  actor: one(characters, { fields: [contractEvents.actorCharacterId], references: [characters.id] }),
}));

export const combatLogsRelations = relations(combatLogs, ({ one }) => ({
  attacker: one(characters, { fields: [combatLogs.attackerCharacterId], references: [characters.id], relationName: 'combatAttacker' }),
  defender: one(characters, { fields: [combatLogs.defenderCharacterId], references: [characters.id], relationName: 'combatDefender' }),
  attackerFaction: one(factions, { fields: [combatLogs.attackerFactionId], references: [factions.id], relationName: 'combatAttackerFaction' }),
  defenderFaction: one(factions, { fields: [combatLogs.defenderFactionId], references: [factions.id], relationName: 'combatDefenderFaction' }),
  territory: one(territories, { fields: [combatLogs.territoryKey], references: [territories.key] }),
}));

export const bountiesRelations = relations(bounties, ({ one }) => ({
  creator: one(characters, { fields: [bounties.createdByCharacterId], references: [characters.id], relationName: 'bountyCreator' }),
  target: one(characters, { fields: [bounties.targetCharacterId], references: [characters.id], relationName: 'bountyTarget' }),
  claimant: one(characters, { fields: [bounties.claimedByCharacterId], references: [characters.id], relationName: 'bountyClaimant' }),
}));

export const factionWarsRelations = relations(factionWars, ({ one }) => ({
  attackerFaction: one(factions, { fields: [factionWars.attackerFactionId], references: [factions.id], relationName: 'warAttackerFaction' }),
  defenderFaction: one(factions, { fields: [factionWars.defenderFactionId], references: [factions.id], relationName: 'warDefenderFaction' }),
  declaredBy: one(characters, { fields: [factionWars.declaredByCharacterId], references: [characters.id] }),
  territory: one(territories, { fields: [factionWars.territoryKey], references: [territories.key] }),
}));



export const npcContactDefinitionsRelations = relations(npcContactDefinitions, ({ many }) => ({
  contacts: many(characterContacts),
}));

export const characterContactsRelations = relations(characterContacts, ({ one, many }) => ({
  character: one(characters, { fields: [characterContacts.characterId], references: [characters.id] }),
  definition: one(npcContactDefinitions, { fields: [characterContacts.contactKey], references: [npcContactDefinitions.key] }),
  assignments: many(contactAssignments),
}));

export const contactAssignmentsRelations = relations(contactAssignments, ({ one }) => ({
  character: one(characters, { fields: [contactAssignments.characterId], references: [characters.id] }),
  contact: one(characterContacts, { fields: [contactAssignments.contactId], references: [characterContacts.id] }),
}));


export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  character: one(characters, { fields: [notifications.characterId], references: [characters.id] }),
}));

export const activityFeedEntriesRelations = relations(activityFeedEntries, ({ one }) => ({
  user: one(users, { fields: [activityFeedEntries.userId], references: [users.id] }),
  character: one(characters, { fields: [activityFeedEntries.characterId], references: [characters.id] }),
  faction: one(factions, { fields: [activityFeedEntries.factionId], references: [factions.id] }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));

export const notificationDigestsRelations = relations(notificationDigests, ({ one }) => ({
  user: one(users, { fields: [notificationDigests.userId], references: [users.id] }),
}));

export const achievementDefinitionsRelations = relations(achievementDefinitions, ({ many }) => ({
  characterAchievements: many(characterAchievements),
}));

export const characterAchievementsRelations = relations(characterAchievements, ({ one }) => ({
  character: one(characters, { fields: [characterAchievements.characterId], references: [characters.id] }),
  achievement: one(achievementDefinitions, { fields: [characterAchievements.achievementKey], references: [achievementDefinitions.key] }),
}));

export const characterTitlesRelations = relations(characterTitles, ({ one }) => ({
  character: one(characters, { fields: [characterTitles.characterId], references: [characters.id] }),
}));

export const objectiveDefinitionsRelations = relations(objectiveDefinitions, ({ many }) => ({
  characterObjectives: many(characterObjectives),
}));

export const characterObjectivesRelations = relations(characterObjectives, ({ one }) => ({
  character: one(characters, { fields: [characterObjectives.characterId], references: [characters.id] }),
  objective: one(objectiveDefinitions, { fields: [characterObjectives.objectiveKey], references: [objectiveDefinitions.key] }),
}));

export const gamblingWagersRelations = relations(gamblingWagers, ({ one }) => ({
  character: one(characters, { fields: [gamblingWagers.characterId], references: [characters.id] }),
  game: one(gamblingGames, { fields: [gamblingWagers.gameKey], references: [gamblingGames.key] }),
}));

