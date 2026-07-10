import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { bodyForEvent, buildNotificationDigestSummary, categoryForEventType, priorityForEventType, shouldNotifyForEventType, titleForEventType } from '@drugdeal/game';
import { db } from '../client';
import { activityFeedEntries, characters, notificationDigests, notificationPreferences, notifications, playerEvents } from '../schema';

type Tx = any;

type NotificationAction =
  | { action: 'mark_read'; characterId?: string; notificationId: string }
  | { action: 'archive'; characterId?: string; notificationId: string }
  | { action: 'mark_all_read'; characterId?: string }
  | { action: 'archive_read'; characterId?: string }
  | { action: 'preferences'; mutedCategories: string[]; digestEnabled: boolean; digestFrequencyMinutes: number };

export async function createNotification(input: {
  tx?: Tx;
  userId?: string | null;
  characterId?: string | null;
  category?: string;
  priority?: string;
  title: string;
  body?: string;
  actionUrl?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const executor = input.tx ?? db;
  const [row] = await executor
    .insert(notifications)
    .values({
      userId: input.userId ?? null,
      characterId: input.characterId ?? null,
      category: (input.category ?? 'system') as any,
      priority: (input.priority ?? 'normal') as any,
      title: input.title,
      body: input.body ?? '',
      actionUrl: input.actionUrl ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      metadata: input.metadata ?? {},
    })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

export async function createActivityFeedEntry(input: {
  tx?: Tx;
  scope?: string;
  userId?: string | null;
  characterId?: string | null;
  factionId?: string | null;
  title: string;
  body?: string;
  category?: string;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const executor = input.tx ?? db;
  const [row] = await executor
    .insert(activityFeedEntries)
    .values({
      scope: (input.scope ?? 'private') as any,
      userId: input.userId ?? null,
      characterId: input.characterId ?? null,
      factionId: input.factionId ?? null,
      title: input.title,
      body: input.body ?? '',
      category: (input.category ?? 'system') as any,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      metadata: input.metadata ?? {},
    })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}


export type NotificationCenterFilters = {
  userId: string;
  characterId?: string | null;
  category?: string | null;
  priority?: string | null;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
};

export async function listNotificationStreamSnapshot(input: { userId: string; characterId?: string | null }) {
  const center = await listNotificationCenter(input);

  if (!center) {
    return null;
  }

  const latestNotification = center.recent[0] ?? null;
  const latestActivity = center.feed[0] ?? null;
  const latestUnread = center.unread[0] ?? null;

  return {
    characterId: input.characterId ?? null,
    unreadCount: center.unreadCount,
    highPriorityCount: center.highPriorityCount,
    latestNotification: latestNotification
      ? {
          id: latestNotification.id,
          category: latestNotification.category,
          priority: latestNotification.priority,
          title: latestNotification.title,
          body: latestNotification.body,
          createdAt: latestNotification.createdAt,
        }
      : null,
    latestUnread: latestUnread
      ? {
          id: latestUnread.id,
          category: latestUnread.category,
          priority: latestUnread.priority,
          title: latestUnread.title,
          body: latestUnread.body,
          createdAt: latestUnread.createdAt,
        }
      : null,
    latestActivity: latestActivity
      ? {
          id: latestActivity.id,
          scope: latestActivity.scope,
          category: latestActivity.category,
          title: latestActivity.title,
          body: latestActivity.body,
          createdAt: latestActivity.createdAt,
        }
      : null,
    checkedAt: new Date().toISOString(),
  };
}

export async function listNotificationCenter(input: NotificationCenterFilters) {
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  const offset = Math.min(Math.max(input.offset ?? 0, 0), 10_000);
  const character = input.characterId
    ? await db.query.characters.findFirst({ where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)) })
    : null;

  if (input.characterId && !character) {
    return null;
  }

  const notificationConditions = [eq(notifications.userId, input.userId), isNull(notifications.archivedAt)];

  if (input.characterId) {
    notificationConditions.push(eq(notifications.characterId, input.characterId));
  }

  if (input.category && input.category !== 'all') {
    notificationConditions.push(eq(notifications.category, input.category as any));
  }

  if (input.priority && input.priority !== 'all') {
    notificationConditions.push(eq(notifications.priority, input.priority as any));
  }

  if (input.unreadOnly) {
    notificationConditions.push(isNull(notifications.readAt));
  }

  const whereForCharacter = and(...notificationConditions);

  const [recent, unread, feed, preferences, digests] = await Promise.all([
    db.query.notifications.findMany({ where: whereForCharacter, orderBy: desc(notifications.createdAt), limit, offset }),
    db.query.notifications.findMany({ where: and(whereForCharacter, isNull(notifications.readAt)), orderBy: desc(notifications.createdAt), limit: 20 }),
    db.query.activityFeedEntries.findMany({
      where: input.characterId
        ? or(eq(activityFeedEntries.characterId, input.characterId), eq(activityFeedEntries.scope, 'public'))
        : or(eq(activityFeedEntries.userId, input.userId), eq(activityFeedEntries.scope, 'public')),
      orderBy: desc(activityFeedEntries.createdAt),
      limit,
      offset,
    }),
    db.query.notificationPreferences.findFirst({ where: eq(notificationPreferences.userId, input.userId) }),
    db.query.notificationDigests.findMany({ where: eq(notificationDigests.userId, input.userId), orderBy: desc(notificationDigests.createdAt), limit: 5 }),
  ]);

  return {
    character,
    unreadCount: unread.length,
    highPriorityCount: unread.filter((item: any) => item.priority === 'high' || item.priority === 'urgent').length,
    recent,
    unread,
    feed,
    preferences: preferences ?? { userId: input.userId, mutedCategories: [], digestEnabled: true, digestFrequencyMinutes: 1440 },
    filters: {
      category: input.category ?? 'all',
      priority: input.priority ?? 'all',
      unreadOnly: Boolean(input.unreadOnly),
      limit,
      offset,
    },
    digests,
  };
}

export async function runNotificationAction(input: { userId: string } & NotificationAction) {
  if (input.action === 'preferences') {
    const [preferences] = await db
      .insert(notificationPreferences)
      .values({
        userId: input.userId,
        mutedCategories: input.mutedCategories,
        digestEnabled: input.digestEnabled,
        digestFrequencyMinutes: input.digestFrequencyMinutes,
        updatedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          mutedCategories: input.mutedCategories,
          digestEnabled: input.digestEnabled,
          digestFrequencyMinutes: input.digestFrequencyMinutes,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return { ok: true as const, data: { preferences } };
  }

  const characterClause = input.characterId ? eq(notifications.characterId, input.characterId) : sql`true`;

  if (input.action === 'mark_read') {
    const [row] = await db.update(notifications).set({ readAt: sql`now()` }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, input.userId), characterClause)).returning();
    return row ? { ok: true as const, data: { notification: row } } : { ok: false as const, code: 'not_found', message: 'Notification not found.' };
  }

  if (input.action === 'archive') {
    const [row] = await db.update(notifications).set({ archivedAt: sql`now()`, readAt: sql`coalesce(${notifications.readAt}, now())` }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, input.userId), characterClause)).returning();
    return row ? { ok: true as const, data: { notification: row } } : { ok: false as const, code: 'not_found', message: 'Notification not found.' };
  }

  if (input.action === 'mark_all_read') {
    const rows = await db.update(notifications).set({ readAt: sql`now()` }).where(and(eq(notifications.userId, input.userId), characterClause, isNull(notifications.readAt), isNull(notifications.archivedAt))).returning();
    return { ok: true as const, data: { updated: rows.length } };
  }

  const rows = await db.update(notifications).set({ archivedAt: sql`now()` }).where(and(eq(notifications.userId, input.userId), characterClause, isNull(notifications.archivedAt), sql`${notifications.readAt} is not null`)).returning();
  return { ok: true as const, data: { updated: rows.length } };
}

export async function createNotificationsFromRecentEvents() {
  const events = await db.query.playerEvents.findMany({
    where: sql`${playerEvents.createdAt} > now() - interval '2 hours'`,
    orderBy: desc(playerEvents.createdAt),
    limit: 200,
  });

  let created = 0;

  for (const event of events as any[]) {
    if (!event.characterId || !shouldNotifyForEventType(event.type)) continue;
    const character = await db.query.characters.findFirst({ where: eq(characters.id, event.characterId) });
    if (!character) continue;

    const category = categoryForEventType(event.type);
    const preferences = await db.query.notificationPreferences.findFirst({ where: eq(notificationPreferences.userId, character.userId) });
    const categoryMuted = preferences?.mutedCategories?.includes(category) ?? false;
    const title = titleForEventType(event.type);
    const body = bodyForEvent(event.type, event.payload ?? {});

    const result = categoryMuted ? null : await createNotification({
      userId: character.userId,
      characterId: character.id,
      category,
      priority: priorityForEventType(event.type),
      title,
      body,
      actionUrl: '/dashboard',
      sourceType: 'player_event',
      sourceId: event.id,
      metadata: { eventType: event.type, payload: event.payload ?? {} },
    });

    await createActivityFeedEntry({
      scope: event.visibility === 'public' ? 'public' : 'private',
      userId: character.userId,
      characterId: character.id,
      title,
      body,
      category,
      sourceType: 'player_event',
      sourceId: event.id,
      metadata: { eventType: event.type },
    });

    if (result) created += 1;
  }

  return { scanned: events.length, created };
}

export async function createDailyNotificationDigests() {
  const usersWithNotifications = await db.execute(sql`
    select
      n.user_id,
      count(*)::int as notification_count,
      count(*) filter (where n.read_at is null)::int as unread_count,
      coalesce(np.digest_frequency_minutes, 1440)::int as digest_frequency_minutes
    from notifications n
    left join notification_preferences np on np.user_id = n.user_id
    where
      n.created_at > now() - make_interval(mins => coalesce(np.digest_frequency_minutes, 1440))
      and n.user_id is not null
      and coalesce(np.digest_enabled, true) = true
      and not exists (
        select 1
        from notification_digests nd
        where nd.user_id = n.user_id
          and nd.created_at > now() - make_interval(mins => coalesce(np.digest_frequency_minutes, 1440))
      )
    group by n.user_id, np.digest_frequency_minutes
    limit 250
  `);

  let created = 0;
  for (const row of usersWithNotifications as any[]) {
    const notificationCount = Number(row.notification_count ?? 0);
    const unreadCount = Number(row.unread_count ?? 0);
    const frequencyMinutes = Number(row.digest_frequency_minutes ?? 1440);
    await db.insert(notificationDigests).values({
      userId: row.user_id,
      notificationCount,
      unreadCount,
      summary: buildNotificationDigestSummary(unreadCount, notificationCount),
      periodStart: sql`now() - make_interval(mins => ${frequencyMinutes})` as any,
      periodEnd: sql`now()` as any,
    });
    created += 1;
  }

  return { created };
}
