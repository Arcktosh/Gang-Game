import { z } from 'zod';

export const uuidSchema = z.string().uuid();




export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).max(10_000).optional().default(0),
});

export const publicPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(25),
  offset: z.coerce.number().int().min(0).max(5_000).optional().default(0),
});

const originSchema = z.string().trim().url().optional();

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().trim().url().or(z.string().trim().startsWith('postgres://')).or(z.string().trim().startsWith('postgresql://')),
  AUTH_SECRET: z.string().trim().min(16, 'AUTH_SECRET must be at least 16 characters.'),
  REDIS_URL: z.string().trim().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).optional().default('DrugDeal Game'),
  NEXT_PUBLIC_APP_URL: originSchema,
  APP_ORIGIN: originSchema,
  TRUSTED_ORIGINS: z.string().trim().optional(),
});

export const rateLimitOptionsSchema = z.object({
  windowSeconds: z.coerce.number().int().min(1).max(86_400),
  maxRequests: z.coerce.number().int().min(1).max(10_000),
});

export const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(40).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: passwordSchema,
});

export const requestEmailVerificationSchema = z.object({
  email: emailSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(32).max(256),
});


export const characterNameSchema = z
  .string()
  .trim()
  .min(3, 'Character name must be at least 3 characters.')
  .max(24, 'Character name must be 24 characters or fewer.')
  .regex(/^[a-zA-Z0-9_ -]+$/, 'Character name contains unsupported characters.');

export const createCharacterSchema = z.object({
  name: characterNameSchema,
});

export const startJobSchema = z.object({
  characterId: uuidSchema,
  jobKey: z.string().min(1).max(64),
  action: z.enum(['apply', 'work', 'resign']).optional().default('work'),
});

export const commitCrimeSchema = z.object({
  characterId: uuidSchema,
  crimeKey: z.string().min(1).max(64),
});

export const startTravelSchema = z.object({
  characterId: uuidSchema,
  routeId: uuidSchema,
  cargoItemKey: z.string().trim().min(1).max(64).optional(),
  cargoQuantity: z.coerce.number().int().min(0).max(100).optional().default(0),
});

export const createFactionSchema = z.object({
  characterId: uuidSchema,
  name: z.string().trim().min(3).max(32),
  tag: z.string().trim().min(2).max(6).regex(/^[A-Z0-9]+$/),
  description: z.string().trim().max(500).optional().default(''),
});

export const messageCenterQuerySchema = z.object({
  characterId: uuidSchema,
});

export const messageActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('send'),
    threadId: uuidSchema.optional(),
    senderCharacterId: uuidSchema,
    recipientCharacterId: uuidSchema.optional(),
    body: z.string().trim().min(1).max(2000),
  }),
  z.object({
    action: z.literal('mark_thread_read'),
    characterId: uuidSchema,
    threadId: uuidSchema,
  }),
  z.object({
    action: z.literal('leave_thread'),
    characterId: uuidSchema,
    threadId: uuidSchema,
  }),
  z.object({
    action: z.literal('mute_thread'),
    characterId: uuidSchema,
    threadId: uuidSchema,
    muted: z.boolean(),
  }),
  z.object({
    action: z.literal('block'),
    characterId: uuidSchema,
    blockedCharacterId: uuidSchema,
    reason: z.string().trim().max(500).optional().default(''),
  }),
  z.object({
    action: z.literal('unblock'),
    characterId: uuidSchema,
    blockedCharacterId: uuidSchema,
  }),
  z.object({
    action: z.literal('report'),
    characterId: uuidSchema,
    messageId: uuidSchema,
    reason: z.string().trim().min(3).max(500).optional().default('Needs moderation review.'),
  }),
]);

export const sendMessageSchema = z.object({
  threadId: uuidSchema.optional(),
  senderCharacterId: uuidSchema,
  recipientCharacterId: uuidSchema.optional(),
  body: z.string().trim().min(1).max(2000),
});


export const completeTrainingSchema = z.object({
  characterId: uuidSchema,
  activityKey: z.string().min(1).max(64),
});

export const completeCourseSchema = z.object({
  characterId: uuidSchema,
  courseKey: z.string().min(1).max(64),
});

export const characterIdQuerySchema = z.object({
  characterId: uuidSchema,
});


export const marketTradeSchema = z.object({
  characterId: uuidSchema,
  itemKey: z.string().min(1).max(64),
  quantity: z.coerce.number().int().min(1).max(100),
});

export const marketActionSchema = marketTradeSchema.extend({
  action: z.enum(['buy', 'sell']),
});



export const checkoutIntentSchema = z.object({
  productKey: z.string().trim().min(2).max(64),
  characterId: uuidSchema.optional(),
});

export const cosmeticEquipSchema = z.object({
  characterId: uuidSchema,
  cosmeticKey: z.string().trim().min(2).max(64),
  slot: z.string().trim().min(2).max(64),
});

export const legalStatusSchema = z.object({
  characterId: uuidSchema,
});

export const hireLawyerSchema = z.object({
  characterId: uuidSchema,
  tier: z.enum(['public', 'street', 'firm']),
});

export const bribeSchema = z.object({
  characterId: uuidSchema,
});

export const hospitalCareSchema = z.object({
  characterId: uuidSchema,
  service: z.enum(['basic', 'private', 'specialist']),
});

export const factionBankActionSchema = z.object({
  characterId: uuidSchema,
  action: z.enum(['deposit', 'withdraw']),
  amount: z.coerce.number().int().min(1).max(1_000_000),
});

export const factionMemberRoleSchema = z.object({
  characterId: uuidSchema,
  memberCharacterId: uuidSchema,
  role: z.enum(['recruit', 'runner', 'soldier', 'lieutenant', 'captain', 'underboss']),
});

export const factionLeaveSchema = z.object({
  characterId: uuidSchema,
});

export const territoryActionSchema = z.object({
  characterId: uuidSchema,
  territoryKey: z.string().trim().min(2).max(64),
  action: z.enum(['scout', 'claim', 'reinforce', 'attack']),
});


export const createShopSchema = z.object({
  characterId: uuidSchema,
  name: z.string().trim().min(3).max(48),
  description: z.string().trim().max(500).optional().default(''),
});

export const createShopListingSchema = z.object({
  characterId: uuidSchema,
  shopId: uuidSchema,
  itemKey: z.string().min(1).max(64),
  quantity: z.coerce.number().int().min(1).max(1000),
  priceEach: z.coerce.number().int().min(1).max(1_000_000),
});

export const purchaseShopListingSchema = z.object({
  characterId: uuidSchema,
  listingId: uuidSchema,
  quantity: z.coerce.number().int().min(1).max(1000),
});


export const shopActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_status'),
    characterId: uuidSchema,
    shopId: uuidSchema,
    isOpen: z.boolean(),
  }),
  z.object({
    action: z.literal('cancel_listing'),
    characterId: uuidSchema,
    listingId: uuidSchema,
  }),
  z.object({
    action: z.literal('advertise'),
    characterId: uuidSchema,
    shopId: uuidSchema,
    spend: z.coerce.number().int().min(25).max(25_000),
  }),
  z.object({
    action: z.literal('review'),
    characterId: uuidSchema,
    shopId: uuidSchema,
    rating: z.coerce.number().int().min(1).max(5),
    body: z.string().trim().max(500).optional().default(''),
  }),
]);

export const submitNewspaperArticleSchema = z.object({
  characterId: uuidSchema,
  title: z.string().trim().min(5).max(120),
  excerpt: z.string().trim().max(240).optional(),
  body: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(2).max(32).optional().default('player_blog'),
});

export const newspaperActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('submit_article'),
    characterId: uuidSchema,
    title: z.string().trim().min(5).max(120),
    excerpt: z.string().trim().max(240).optional(),
    body: z.string().trim().min(20).max(5000),
    category: z.string().trim().min(2).max(32).optional().default('player_blog'),
  }),
  z.object({
    action: z.literal('comment'),
    characterId: uuidSchema,
    articleId: uuidSchema,
    body: z.string().trim().min(2).max(1000),
  }),
  z.object({
    action: z.literal('react'),
    characterId: uuidSchema,
    articleId: uuidSchema,
    reactionType: z.enum(['like', 'insightful', 'funny', 'boost']).default('like'),
  }),
  z.object({
    action: z.literal('report'),
    characterId: uuidSchema,
    articleId: uuidSchema,
    reason: z.string().trim().min(3).max(500).optional().default('Needs moderation review.'),
  }),
]);


export const financeTradeSchema = z.object({
  characterId: uuidSchema,
  assetKey: z.string().trim().min(1).max(96),
  side: z.enum(['buy', 'sell']),
  quantity: z.coerce.number().int().min(1).max(10_000),
});

export const bankTransferSchema = z.object({
  characterId: uuidSchema,
  action: z.enum(['deposit', 'withdraw']),
  amount: z.coerce.number().int().min(1).max(1_000_000),
});

export const bankStatementActionSchema = z.enum([
  'all',
  'deposit',
  'withdraw',
  'loan_request',
  'loan_repayment',
  'loan_partial_repayment',
]);

export const bankHistoryQuerySchema = z
  .object({
    characterId: uuidSchema,
    action: bankStatementActionSchema.optional().default('all'),
    format: z.enum(['json', 'csv']).optional().default('json'),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    offset: z.coerce.number().int().min(0).max(10_000).optional().default(0),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'from must be before to.',
    path: ['from'],
  });

export const financePriceHistoryQuerySchema = z.object({
  assetKey: z.string().trim().min(1).max(96),
  limit: z.coerce.number().int().min(1).max(250).optional().default(100),
});

export const moneySinkPurchaseSchema = z.object({
  characterId: uuidSchema,
  sinkKey: z.string().trim().min(2).max(96),
  paymentSource: z.enum(['cash', 'bank']).optional().default('cash'),
});

export const loanCenterQuerySchema = z.object({
  characterId: uuidSchema,
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const adminLoanExposureQuerySchema = z.object({
  status: z.enum(['all', 'active', 'overdue', 'defaulted', 'repaid']).optional().default('all'),
  q: z.string().trim().max(100).optional().default(''),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).max(10_000).optional().default(0),
});

export const loanActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('request'),
    characterId: uuidSchema,
    offerKey: z.string().trim().min(2).max(96),
  }),
  z.object({
    action: z.literal('repay'),
    characterId: uuidSchema,
    loanId: uuidSchema,
    amount: z.coerce.number().int().min(1).max(1_000_000).optional(),
  }),
]);


export const gamblingWagerSchema = z.object({
  characterId: uuidSchema,
  gameKey: z.string().trim().min(1).max(64),
  wager: z.coerce.number().int().min(1).max(25_000),
});

export const createContractSchema = z.object({
  characterId: uuidSchema,
  contractType: z.enum(['delivery', 'protection', 'collection', 'bounty', 'faction_task']),
  title: z.string().trim().min(4).max(80),
  description: z.string().trim().max(1000).optional().default(''),
  targetLocation: z.string().trim().min(2).max(64).optional(),
  itemKey: z.string().trim().min(1).max(64).optional(),
  quantity: z.coerce.number().int().min(0).max(1000).optional().default(0),
  reward: z.coerce.number().int().min(25).max(1_000_000),
  expiresInHours: z.coerce.number().int().min(1).max(168).optional().default(24),
});

export const contractCharacterActionSchema = z.object({
  characterId: uuidSchema,
});

export const contractQuerySchema = z.object({
  characterId: uuidSchema.optional(),
});

export const profileQuerySchema = z.object({
  characterId: uuidSchema,
});

export const claimAchievementSchema = z.object({
  characterId: uuidSchema,
});

export const claimObjectiveSchema = z.object({
  characterId: uuidSchema,
});

export const setActiveTitleSchema = z.object({
  characterId: uuidSchema,
  titleKey: z.string().trim().min(1).max(96).nullable(),
});

export const seasonProfileQuerySchema = z.object({
  characterId: uuidSchema,
});

export const claimSeasonRewardSchema = z.object({
  characterId: uuidSchema,
  tier: z.coerce.number().int().min(1).max(100),
});

export const prestigeCharacterSchema = z.object({
  characterId: uuidSchema,
});

export const pvpProfileQuerySchema = z.object({
  characterId: uuidSchema,
});

export const attackCharacterSchema = z.object({
  attackerCharacterId: uuidSchema,
  defenderCharacterId: uuidSchema,
});

export const createBountySchema = z.object({
  characterId: uuidSchema,
  targetCharacterId: uuidSchema,
  reward: z.coerce.number().int().min(100).max(1_000_000),
  reason: z.string().trim().max(500).optional().default(''),
  expiresInHours: z.coerce.number().int().min(1).max(168).optional().default(72),
});

export const cancelBountySchema = z.object({
  characterId: uuidSchema,
});

export const declareFactionWarSchema = z.object({
  characterId: uuidSchema,
  defenderFactionId: uuidSchema,
  territoryKey: z.string().trim().min(2).max(64).optional(),
  durationHours: z.coerce.number().int().min(6).max(72).optional(),
});


export const equipmentSlotSchema = z.enum(['weapon', 'armor', 'vehicle', 'tool', 'phone', 'accessory']);

export const equipmentProfileQuerySchema = z.object({
  characterId: uuidSchema,
});

export const equipmentActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('equip'),
    characterId: uuidSchema,
    inventoryItemId: uuidSchema,
  }),
  z.object({
    action: z.literal('unequip'),
    characterId: uuidSchema,
    slot: equipmentSlotSchema,
  }),
  z.object({
    action: z.literal('repair'),
    characterId: uuidSchema,
    equipmentId: uuidSchema,
  }),
]);


export const vehicleProfileQuerySchema = z.object({
  characterId: uuidSchema,
});

export const vehicleActionSchema = z.object({
  action: z.literal('upgrade'),
  characterId: uuidSchema,
  equipmentId: uuidSchema,
  upgradeKey: z.string().trim().min(1).max(96),
});

export const craftingProfileQuerySchema = z.object({
  characterId: uuidSchema,
});

export const workshopTypeSchema = z.enum(['garage', 'lab', 'electronics', 'clinic', 'forge', 'tailor']);

export const craftingActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('build_workshop'),
    characterId: uuidSchema,
    workshopType: workshopTypeSchema,
    name: z.string().trim().min(3).max(48).optional(),
  }),
  z.object({
    action: z.literal('upgrade_workshop'),
    characterId: uuidSchema,
    workshopId: uuidSchema,
  }),
  z.object({
    action: z.literal('start_recipe'),
    characterId: uuidSchema,
    recipeKey: z.string().trim().min(1).max(96),
    workshopId: uuidSchema.optional(),
  }),
]);

export const contactsProfileQuerySchema = z.object({
  characterId: uuidSchema,
});

export const contactAssignmentTypeSchema = z.enum(['job_assist', 'crime_setup', 'shop_shift', 'territory_scout', 'market_tip', 'recovery_support']);

export const contactActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('recruit'),
    characterId: uuidSchema,
    contactKey: z.string().trim().min(1).max(96),
    nickname: z.string().trim().min(2).max(48).optional(),
  }),
  z.object({
    action: z.literal('assign'),
    characterId: uuidSchema,
    contactId: uuidSchema,
    assignmentType: contactAssignmentTypeSchema,
  }),
  z.object({
    action: z.literal('pay_upkeep'),
    characterId: uuidSchema,
    contactId: uuidSchema,
  }),
  z.object({
    action: z.literal('dismiss'),
    characterId: uuidSchema,
    contactId: uuidSchema,
  }),
]);

export const notificationCenterQuerySchema = z.object({
  characterId: uuidSchema.optional(),
  category: z.enum(['all', 'system', 'combat', 'economy', 'contract', 'faction', 'travel', 'crew', 'crafting', 'market', 'season', 'admin']).optional().default('all'),
  priority: z.enum(['all', 'low', 'normal', 'high', 'urgent']).optional().default('all'),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export const notificationActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('mark_read'),
    characterId: uuidSchema.optional(),
    notificationId: uuidSchema,
  }),
  z.object({
    action: z.literal('archive'),
    characterId: uuidSchema.optional(),
    notificationId: uuidSchema,
  }),
  z.object({
    action: z.literal('mark_all_read'),
    characterId: uuidSchema.optional(),
  }),
  z.object({
    action: z.literal('archive_read'),
    characterId: uuidSchema.optional(),
  }),
  z.object({
    action: z.literal('preferences'),
    mutedCategories: z.array(z.enum(['system', 'combat', 'economy', 'contract', 'faction', 'travel', 'crew', 'crafting', 'market', 'season', 'admin'])).max(11).default([]),
    digestEnabled: z.boolean().default(true),
    digestFrequencyMinutes: z.coerce.number().int().min(60).max(10080).default(1440),
  }),
]);
