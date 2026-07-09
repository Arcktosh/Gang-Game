import { and, desc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import {
  adminActionLogs,
  characters,
  characterEnforcements,
  characterFlags,
  enforcementAppeals,
  financialTransactions,
  gameConfigEntries,
  messageReports,
  messages,
  moderationNotes,
  notifications,
  newspaperArticleReports,
  newspaperArticles,
  playerEvents,
  systemAnnouncements,
} from '../schema';
import { db } from '../client';
import {
  calculateBankAdjustment,
  calculateCashAdjustment,
  calculateLoanLifecycle,
  calculateLoanOutstanding,
  clampAdminSeverity,
  normalizeConfigValue,
  summarizeBankAdjustment,
  summarizeCashAdjustment,
  summarizeConfigChange,
  validateModerationReason,
} from '@drugdeal/game';
import {
  adjustCharacterBank as adjustCharacterBankSafely,
  adjustCharacterCash as adjustCharacterCashSafely,
  decrementCharacterCash,
} from './transaction-safety';

export type ModerationReportKind = 'message' | 'article';
export type ModerationReportStatus = 'reviewed' | 'dismissed' | 'actioned';

export type AdminActionType =
  | 'config_upsert'
  | 'character_flag'
  | 'character_unflag'
  | 'cash_adjustment'
  | 'bank_adjustment'
  | 'stat_adjustment'
  | 'status_clear'
  | 'announcement_publish'
  | 'announcement_archive'
  | 'moderation_note'
  | 'enforcement_action'
  | 'enforcement_lift'
  | 'appeal_review';

export type CharacterFlagType =
  | 'watchlist'
  | 'suspected_alt'
  | 'market_abuse'
  | 'chat_abuse'
  | 'botting'
  | 'exploit_review'
  | 'suspended';

export type AdminLoanExposureStatus = 'all' | 'active' | 'overdue' | 'defaulted' | 'repaid';

function rowsFromExecuteResult(result: unknown) {
  return Array.isArray(result) ? result : ((result as any)?.rows ?? []);
}

function normalizeAdminLoanStatus(status?: string): AdminLoanExposureStatus {
  return ['all', 'active', 'overdue', 'defaulted', 'repaid'].includes(status ?? '')
    ? (status as AdminLoanExposureStatus)
    : 'all';
}

export async function listAdminLoanExposure(
  input: {
    status?: AdminLoanExposureStatus;
    query?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const status = normalizeAdminLoanStatus(input.status);
  const query = input.query?.trim().toLowerCase() ?? '';
  const likeQuery = `%${query}%`;
  const safeLimit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 25)));
  const safeOffset = Math.max(0, Math.min(10_000, Math.floor(input.offset ?? 0)));

  const [loanRowsResult, summaryRowsResult] = await Promise.all([
    db.execute(sql`
      select
        cl.id,
        cl.character_id as "characterId",
        cl.offer_key as "offerKey",
        cl.principal,
        cl.fee,
        cl.repaid_amount as "repaidAmount",
        cl.status,
        cl.due_at as "dueAt",
        cl.repaid_at as "repaidAt",
        cl.created_at as "createdAt",
        cl.updated_at as "updatedAt",
        c.name as "characterName",
        c.user_id as "userId",
        c.status as "characterStatus",
        c.cash,
        c.bank,
        c.level,
        c.heat,
        u.email as "userEmail",
        u.display_name as "userDisplayName"
      from character_loans cl
      join characters c on c.id = cl.character_id
      join users u on u.id = c.user_id
      where (
        ${status} = 'all'
        or (${status} = 'active' and cl.status = 'active' and cl.due_at >= now())
        or (${status} = 'overdue' and cl.status = 'active' and cl.due_at < now())
        or (${status} = 'defaulted' and cl.status = 'defaulted')
        or (${status} = 'repaid' and cl.status = 'repaid')
      )
        and (
          ${query} = ''
          or lower(c.name) like ${likeQuery}
          or lower(u.email) like ${likeQuery}
          or lower(coalesce(u.display_name, '')) like ${likeQuery}
          or c.id::text like ${likeQuery}
          or cl.id::text like ${likeQuery}
        )
      order by
        case
          when cl.status = 'defaulted' then 0
          when cl.status = 'active' and cl.due_at < now() then 1
          when cl.status = 'active' then 2
          else 3
        end,
        cl.due_at asc,
        cl.updated_at desc
      limit ${safeLimit}
      offset ${safeOffset}
    `),
    db.execute(sql`
      select
        count(*) filter (where cl.status = 'active' and cl.due_at >= now()) as "activeCount",
        count(*) filter (where cl.status = 'active' and cl.due_at < now()) as "overdueCount",
        count(*) filter (where cl.status = 'defaulted') as "defaultedCount",
        count(*) filter (where cl.status = 'repaid') as "repaidCount",
        coalesce(sum(greatest((cl.principal + cl.fee) - cl.repaid_amount, 0)) filter (where cl.status in ('active', 'defaulted')), 0) as "unresolvedOutstanding",
        coalesce(sum(cl.principal + cl.fee), 0) as "lifetimeDue",
        coalesce(sum(cl.repaid_amount), 0) as "lifetimeRepaid"
      from character_loans cl
      join characters c on c.id = cl.character_id
      join users u on u.id = c.user_id
      where (
        ${query} = ''
        or lower(c.name) like ${likeQuery}
        or lower(u.email) like ${likeQuery}
        or lower(coalesce(u.display_name, '')) like ${likeQuery}
        or c.id::text like ${likeQuery}
        or cl.id::text like ${likeQuery}
      )
    `),
  ]);

  const loans = rowsFromExecuteResult(loanRowsResult).map((row: any) => {
    const outstanding = calculateLoanOutstanding({
      principal: Number(row.principal),
      fee: Number(row.fee),
      repaidAmount: Number(row.repaidAmount),
    });
    const lifecycle = calculateLoanLifecycle({ status: String(row.status), dueAt: row.dueAt });

    return {
      ...row,
      principal: outstanding.principal,
      fee: outstanding.fee,
      totalDue: outstanding.totalDue,
      repaidAmount: outstanding.repaidAmount,
      outstanding: outstanding.outstanding,
      lifecycleStatus: lifecycle.lifecycleStatus,
      isOverdue: lifecycle.isOverdue,
      isDefaulted: lifecycle.isDefaulted,
      hoursPastDue: lifecycle.hoursPastDue,
      defaultAt: lifecycle.defaultAt,
      cash: Number(row.cash),
      bank: Number(row.bank),
      level: Number(row.level),
      heat: Number(row.heat),
    };
  });

  const summaryRow = rowsFromExecuteResult(summaryRowsResult)[0] ?? {};
  const summary = {
    activeCount: Number(summaryRow.activeCount ?? 0),
    overdueCount: Number(summaryRow.overdueCount ?? 0),
    defaultedCount: Number(summaryRow.defaultedCount ?? 0),
    repaidCount: Number(summaryRow.repaidCount ?? 0),
    unresolvedOutstanding: Number(summaryRow.unresolvedOutstanding ?? 0),
    lifetimeDue: Number(summaryRow.lifetimeDue ?? 0),
    lifetimeRepaid: Number(summaryRow.lifetimeRepaid ?? 0),
  };

  return {
    status,
    query,
    summary,
    loans,
    pagination: {
      limit: safeLimit,
      offset: safeOffset,
      count: loans.length,
      nextOffset: loans.length === safeLimit ? safeOffset + safeLimit : null,
      previousOffset: safeOffset > 0 ? Math.max(0, safeOffset - safeLimit) : null,
    },
  };
}

export async function listAdminAudit(limit = 100, offset = 0) {
  const safeLimit = Math.max(1, Math.min(200, limit));
  const safeOffset = Math.max(0, Math.min(10_000, offset));
  const [
    events,
    notes,
    adminLogs,
    activeFlags,
    enforcementRows,
    appealRows,
    sessionRows,
    inventoryRows,
  ] = await Promise.all([
    db.query.playerEvents.findMany({
      orderBy: desc(playerEvents.createdAt),
      limit: safeLimit,
      offset: safeOffset,
    }),
    db.query.moderationNotes.findMany({
      orderBy: desc(moderationNotes.createdAt),
      limit: safeLimit,
      offset: safeOffset,
    }),
    db.query.adminActionLogs.findMany({
      orderBy: desc(adminActionLogs.createdAt),
      limit: safeLimit,
      offset: safeOffset,
    }),
    db.query.characterFlags.findMany({
      where: eq(characterFlags.isActive, true),
      orderBy: desc(characterFlags.createdAt),
      limit: safeLimit,
      offset: safeOffset,
    }),
    db.execute(sql`
      select
        ce.id,
        ce.character_id as "characterId",
        ce.action_type as "actionType",
        ce.reason,
        ce.severity,
        ce.ends_at as "endsAt",
        ce.created_at as "createdAt",
        c.name as "characterName"
      from character_enforcements ce
      join characters c on c.id = ce.character_id
      where ce.is_active = true
        and (ce.ends_at is null or ce.ends_at > now())
      order by ce.created_at desc
      limit ${safeLimit}
      offset ${safeOffset}
    `),
    db.execute(sql`
      select
        ea.id,
        ea.enforcement_id as "enforcementId",
        ea.character_id as "characterId",
        ea.body,
        ea.status,
        ea.created_at as "createdAt",
        ce.action_type as "actionType",
        c.name as "characterName"
      from enforcement_appeals ea
      join character_enforcements ce on ce.id = ea.enforcement_id
      join characters c on c.id = ea.character_id
      where ea.status = 'open'
      order by ea.created_at desc
      limit ${safeLimit}
      offset ${safeOffset}
    `),
    db.execute(sql`
      select
        us.id,
        us.user_id as "userId",
        u.email,
        u.display_name as "displayName",
        us.ip_address as "ipAddress",
        us.user_agent as "userAgent",
        us.last_seen_at as "lastSeenAt",
        us.expires_at as "expiresAt",
        us.created_at as "createdAt"
      from user_sessions us
      join users u on u.id = us.user_id
      order by us.last_seen_at desc
      limit ${Math.min(safeLimit, 50)}
      offset ${safeOffset}
    `),
    db.execute(sql`
      select
        ii.id,
        ii.character_id as "characterId",
        c.name as "characterName",
        ii.item_key as "itemKey",
        ii.quantity,
        ii.updated_at as "updatedAt"
      from inventory_items ii
      join characters c on c.id = ii.character_id
      where ii.quantity > 0
      order by ii.quantity desc, ii.updated_at desc
      limit ${Math.min(safeLimit, 50)}
      offset ${safeOffset}
    `),
  ]);

  const activeEnforcements = Array.isArray(enforcementRows)
    ? enforcementRows
    : ((enforcementRows as any).rows ?? []);
  const openAppeals = Array.isArray(appealRows) ? appealRows : ((appealRows as any).rows ?? []);
  const recentSessions = Array.isArray(sessionRows)
    ? sessionRows
    : ((sessionRows as any).rows ?? []);
  const inventoryHighlights = Array.isArray(inventoryRows)
    ? inventoryRows
    : ((inventoryRows as any).rows ?? []);

  return {
    events,
    notes,
    adminLogs,
    activeFlags,
    activeEnforcements,
    openAppeals,
    recentSessions,
    inventoryHighlights,
  };
}

export async function listModerationQueue({
  status = 'open',
  limit = 50,
}: { status?: 'open' | 'reviewed' | 'dismissed' | 'actioned'; limit?: number } = {}) {
  const safeLimit = Math.max(1, Math.min(100, limit));

  const [messageRows, articleRows] = await Promise.all([
    db.execute(sql`
      select
        mr.id,
        mr.message_id as "messageId",
        mr.reporter_character_id as "reporterCharacterId",
        mr.reason,
        mr.status,
        mr.created_at as "createdAt",
        mr.reviewed_at as "reviewedAt",
        mr.resolution_note as "resolutionNote",
        m.thread_id as "threadId",
        m.sender_character_id as "senderCharacterId",
        left(m.body, 280) as "messagePreview",
        reporter.name as "reporterName",
        sender.name as "senderName"
      from message_reports mr
      join messages m on m.id = mr.message_id
      join characters reporter on reporter.id = mr.reporter_character_id
      join characters sender on sender.id = m.sender_character_id
      where mr.status = ${status}
      order by mr.created_at desc
      limit ${safeLimit}
    `),
    db.execute(sql`
      select
        nar.id,
        nar.article_id as "articleId",
        nar.reporter_character_id as "reporterCharacterId",
        nar.reason,
        nar.status,
        nar.created_at as "createdAt",
        nar.reviewed_at as "reviewedAt",
        nar.resolution_note as "resolutionNote",
        na.author_character_id as "authorCharacterId",
        na.title as "articleTitle",
        na.slug as "articleSlug",
        na.is_published as "isPublished",
        reporter.name as "reporterName",
        author.name as "authorName"
      from newspaper_article_reports nar
      join newspaper_articles na on na.id = nar.article_id
      join characters reporter on reporter.id = nar.reporter_character_id
      left join characters author on author.id = na.author_character_id
      where nar.status = ${status}
      order by nar.created_at desc
      limit ${safeLimit}
    `),
  ]);

  const messageResultRows = Array.isArray(messageRows)
    ? messageRows
    : ((messageRows as any).rows ?? []);
  const articleResultRows = Array.isArray(articleRows)
    ? articleRows
    : ((articleRows as any).rows ?? []);
  const messages = Array.from(messageResultRows as any[]).map((row) => ({
    kind: 'message' as const,
    ...row,
  }));
  const articles = Array.from(articleResultRows as any[]).map((row) => ({
    kind: 'article' as const,
    ...row,
  }));

  return {
    status,
    messages,
    articles,
    totalOpen: status === 'open' ? messages.length + articles.length : undefined,
  };
}

export async function resolveModerationReport(input: {
  adminUserId: string;
  kind: ModerationReportKind;
  reportId: string;
  status: ModerationReportStatus;
  note?: string;
  hideArticle?: boolean;
}) {
  const note = input.note?.trim() || `${input.kind} report marked ${input.status}.`;

  if (note.length < 5 || note.length > 500) {
    throw new Error('Resolution note must be 5-500 characters.');
  }

  return db.transaction(async (tx) => {
    if (input.kind === 'message') {
      const existing = await tx.query.messageReports.findFirst({
        where: eq(messageReports.id, input.reportId),
      });

      if (!existing) {
        throw new Error('Message report not found.');
      }

      const message = await tx.query.messages.findFirst({
        where: eq(messages.id, existing.messageId),
      });
      const [report] = await tx
        .update(messageReports)
        .set({
          status: input.status,
          reviewedAt: sql`now()`,
          reviewedByUserId: input.adminUserId,
          resolutionNote: note,
        })
        .where(eq(messageReports.id, input.reportId))
        .returning();

      await tx.insert(moderationNotes).values({
        characterId: message?.senderCharacterId ?? existing.reporterCharacterId,
        note: `[message report ${input.status}] ${note}`,
        severity: input.status === 'actioned' ? 'warning' : 'info',
        metadata: {
          reportId: input.reportId,
          messageId: existing.messageId,
          reporterCharacterId: existing.reporterCharacterId,
        },
      });

      await tx.insert(adminActionLogs).values({
        adminUserId: input.adminUserId,
        targetCharacterId: message?.senderCharacterId ?? null,
        actionType: 'moderation_note',
        summary: `Marked message report ${input.status}.`,
        beforeValue: existing,
        afterValue: report,
        metadata: { kind: input.kind, note },
      });

      return { report };
    }

    const existing = await tx.query.newspaperArticleReports.findFirst({
      where: eq(newspaperArticleReports.id, input.reportId),
    });

    if (!existing) {
      throw new Error('Article report not found.');
    }

    const article = await tx.query.newspaperArticles.findFirst({
      where: eq(newspaperArticles.id, existing.articleId),
    });
    const [report] = await tx
      .update(newspaperArticleReports)
      .set({
        status: input.status,
        reviewedAt: sql`now()`,
        reviewedByUserId: input.adminUserId,
        resolutionNote: note,
      })
      .where(eq(newspaperArticleReports.id, input.reportId))
      .returning();

    if (input.hideArticle) {
      await tx
        .update(newspaperArticles)
        .set({ isPublished: false, updatedAt: sql`now()` })
        .where(eq(newspaperArticles.id, existing.articleId));
    }

    await tx.insert(moderationNotes).values({
      characterId: article?.authorCharacterId ?? existing.reporterCharacterId,
      note: `[article report ${input.status}] ${note}`,
      severity: input.status === 'actioned' ? 'warning' : 'info',
      metadata: {
        reportId: input.reportId,
        articleId: existing.articleId,
        reporterCharacterId: existing.reporterCharacterId,
        hideArticle: !!input.hideArticle,
      },
    });

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetCharacterId: article?.authorCharacterId ?? null,
      actionType: 'moderation_note',
      summary: `Marked article report ${input.status}${input.hideArticle ? ' and unpublished the article' : ''}.`,
      beforeValue: existing,
      afterValue: report,
      metadata: { kind: input.kind, note, hideArticle: !!input.hideArticle },
    });

    return { report };
  });
}

export async function listGameConfig({
  includePrivate = false,
}: { includePrivate?: boolean } = {}) {
  return db.query.gameConfigEntries.findMany({
    where: includePrivate ? undefined : eq(gameConfigEntries.isPublic, true),
    orderBy: (table, { asc }) => [asc(table.category), asc(table.key)],
  });
}

export async function upsertGameConfig(input: {
  adminUserId: string;
  key: string;
  label: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  value: unknown;
}) {
  const value = normalizeConfigValue(input.value);
  const key = input.key.trim().toLowerCase();

  if (!/^[a-z0-9._-]{3,80}$/.test(key)) {
    throw new Error(
      'Config key must be 3-80 lowercase letters, numbers, dots, dashes, or underscores.',
    );
  }

  return db.transaction(async (tx) => {
    const existing = await tx.query.gameConfigEntries.findFirst({
      where: eq(gameConfigEntries.key, key),
    });
    const [entry] = await tx
      .insert(gameConfigEntries)
      .values({
        key,
        label: input.label.trim(),
        description: input.description?.trim() ?? '',
        category: input.category?.trim() || 'general',
        isPublic: input.isPublic ?? false,
        value,
        updatedByUserId: input.adminUserId,
      })
      .onConflictDoUpdate({
        target: gameConfigEntries.key,
        set: {
          label: input.label.trim(),
          description: input.description?.trim() ?? '',
          category: input.category?.trim() || 'general',
          isPublic: input.isPublic ?? false,
          value,
          updatedByUserId: input.adminUserId,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      actionType: 'config_upsert',
      summary: summarizeConfigChange(key),
      beforeValue: existing?.value ?? {},
      afterValue: entry.value,
      metadata: { key, category: entry.category },
    });

    return entry;
  });
}

export async function addCharacterFlag(input: {
  adminUserId: string;
  characterId: string;
  flagType: CharacterFlagType;
  reason: string;
  severity: number;
}) {
  const reason = validateModerationReason(input.reason);
  const severity = clampAdminSeverity(input.severity);

  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, input.characterId),
    });

    if (!character) {
      throw new Error('Character not found.');
    }

    const [flag] = await tx
      .insert(characterFlags)
      .values({
        characterId: input.characterId,
        flagType: input.flagType,
        reason,
        severity,
        createdByUserId: input.adminUserId,
      })
      .returning();

    if (input.flagType === 'suspended') {
      await tx
        .update(characters)
        .set({
          status: 'jailed',
          statusReason: `Admin suspension: ${reason}`,
          updatedAt: sql`now()`,
        })
        .where(eq(characters.id, input.characterId));
    }

    await tx.insert(moderationNotes).values({
      characterId: input.characterId,
      note: `[${input.flagType}] ${reason}`,
      createdByUserId: input.adminUserId,
    });

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetUserId: character.userId,
      targetCharacterId: input.characterId,
      actionType: 'character_flag',
      summary: `Flagged ${character.name} as ${input.flagType}.`,
      afterValue: { flagType: input.flagType, severity, reason },
    });

    return flag;
  });
}

export async function resolveCharacterFlag(input: {
  adminUserId: string;
  flagId: string;
  reason?: string;
}) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.characterFlags.findFirst({
      where: eq(characterFlags.id, input.flagId),
    });

    if (!existing) {
      throw new Error('Flag not found.');
    }

    const [flag] = await tx
      .update(characterFlags)
      .set({
        isActive: false,
        resolvedByUserId: input.adminUserId,
        resolvedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(characterFlags.id, input.flagId))
      .returning();

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetCharacterId: existing.characterId,
      actionType: 'character_unflag',
      summary: `Resolved character flag ${existing.flagType}.`,
      beforeValue: existing,
      afterValue: flag,
      metadata: { reason: input.reason ?? null },
    });

    return flag;
  });
}

export async function adjustCharacterCash(input: {
  adminUserId: string;
  characterId: string;
  amount: number;
  reason: string;
}) {
  const reason = validateModerationReason(input.reason);

  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, input.characterId),
    });

    if (!character) {
      throw new Error('Character not found.');
    }

    const adjustment = calculateCashAdjustment({
      currentCash: character.cash,
      amount: input.amount,
    });
    const safeAdjustment = await adjustCharacterCashSafely(
      tx,
      input.characterId,
      adjustment.deltaApplied,
    );

    if (!safeAdjustment.ok) {
      throw new Error('Could not apply cash adjustment safely. Refresh and try again.');
    }

    const updated = safeAdjustment.character;
    const actualAfter = updated.cash;

    await tx.insert(financialTransactions).values({
      characterId: input.characterId,
      type: 'system',
      amount: String(adjustment.deltaApplied),
      description: `Admin cash adjustment: ${reason}`,
      metadata: { before: adjustment.before, after: actualAfter, requestedAmount: input.amount },
    });

    await tx.insert(playerEvents).values({
      userId: character.userId,
      characterId: input.characterId,
      visibility: 'admin',
      type: 'admin_cash_adjustment',
      payload: {
        before: adjustment.before,
        after: actualAfter,
        amount: adjustment.deltaApplied,
        reason,
      },
    });

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetUserId: character.userId,
      targetCharacterId: input.characterId,
      actionType: 'cash_adjustment',
      summary: summarizeCashAdjustment(character.name, adjustment.deltaApplied),
      beforeValue: { cash: adjustment.before },
      afterValue: { cash: actualAfter },
      metadata: { reason, requestedAmount: input.amount },
    });

    return updated;
  });
}

export async function adjustCharacterBank(input: {
  adminUserId: string;
  characterId: string;
  amount: number;
  reason: string;
}) {
  const reason = validateModerationReason(input.reason);

  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, input.characterId),
    });

    if (!character) {
      throw new Error('Character not found.');
    }

    const adjustment = calculateBankAdjustment({
      currentBank: character.bank,
      amount: input.amount,
    });
    const safeAdjustment = await adjustCharacterBankSafely(
      tx,
      input.characterId,
      adjustment.deltaApplied,
    );

    if (!safeAdjustment.ok) {
      throw new Error('Could not apply bank adjustment safely. Refresh and try again.');
    }

    const updated = safeAdjustment.character;
    const actualAfter = updated.bank;

    await tx.insert(financialTransactions).values({
      characterId: input.characterId,
      type: 'system',
      amount: String(adjustment.deltaApplied),
      description: `Admin bank adjustment: ${reason}`,
      metadata: { before: adjustment.before, after: actualAfter, requestedAmount: input.amount },
    });

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetUserId: character.userId,
      targetCharacterId: input.characterId,
      actionType: 'bank_adjustment',
      summary: summarizeBankAdjustment(character.name, adjustment.deltaApplied),
      beforeValue: { bank: adjustment.before },
      afterValue: { bank: actualAfter },
      metadata: { reason, requestedAmount: input.amount },
    });

    return updated;
  });
}

export async function clearCharacterStatus(input: {
  adminUserId: string;
  characterId: string;
  reason: string;
}) {
  const reason = validateModerationReason(input.reason);

  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, input.characterId),
    });

    if (!character) {
      throw new Error('Character not found.');
    }

    const [updated] = await tx
      .update(characters)
      .set({ status: 'free', statusUntil: null, statusReason: null, updatedAt: sql`now()` })
      .where(eq(characters.id, input.characterId))
      .returning();

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetUserId: character.userId,
      targetCharacterId: input.characterId,
      actionType: 'status_clear',
      summary: `Cleared status for ${character.name}.`,
      beforeValue: {
        status: character.status,
        statusUntil: character.statusUntil,
        statusReason: character.statusReason,
      },
      afterValue: { status: updated.status },
      metadata: { reason },
    });

    return updated;
  });
}

export async function listActiveAnnouncements(limit = 5) {
  return db.query.systemAnnouncements.findMany({
    where: and(
      eq(systemAnnouncements.status, 'published'),
      lte(systemAnnouncements.startsAt, sql`now()`),
      or(isNull(systemAnnouncements.endsAt), sql`${systemAnnouncements.endsAt} >= now()`),
    ),
    orderBy: desc(systemAnnouncements.createdAt),
    limit: Math.max(1, Math.min(20, limit)),
  });
}

export async function listAdminAnnouncements(limit = 50) {
  return db.query.systemAnnouncements.findMany({
    orderBy: desc(systemAnnouncements.createdAt),
    limit: Math.max(1, Math.min(100, limit)),
  });
}

export async function createAnnouncement(input: {
  adminUserId: string;
  title: string;
  body: string;
  severity?: string;
  status?: 'draft' | 'published' | 'archived';
  startsAt?: Date;
  endsAt?: Date | null;
}) {
  const title = input.title.trim();
  const body = input.body.trim();

  if (title.length < 3 || title.length > 120) {
    throw new Error('Announcement title must be 3-120 characters.');
  }

  if (body.length < 10 || body.length > 2000) {
    throw new Error('Announcement body must be 10-2000 characters.');
  }

  return db.transaction(async (tx) => {
    const [announcement] = await tx
      .insert(systemAnnouncements)
      .values({
        title,
        body,
        severity: input.severity ?? 'info',
        status: input.status ?? 'published',
        startsAt: input.startsAt ?? new Date(),
        endsAt: input.endsAt ?? null,
        createdByUserId: input.adminUserId,
      })
      .returning();

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      actionType: 'announcement_publish',
      summary: `Published announcement: ${title}`,
      afterValue: announcement,
    });

    return announcement;
  });
}

export type EnforcementActionType =
  'warning' | 'social_mute' | 'shop_restriction' | 'temporary_suspension' | 'cash_penalty';
export type EnforcementAppealStatus = 'open' | 'accepted' | 'rejected' | 'withdrawn';

function getRestrictionLabel(actionType: EnforcementActionType) {
  switch (actionType) {
    case 'social_mute':
      return 'Social mute';
    case 'shop_restriction':
      return 'Shop restriction';
    case 'temporary_suspension':
      return 'Temporary suspension';
    case 'cash_penalty':
      return 'Cash penalty';
    default:
      return 'Warning';
  }
}

function calculateEndsAt(durationHours?: number | null) {
  if (!durationHours || durationHours <= 0) {
    return null;
  }

  const safeHours = Math.max(1, Math.min(24 * 30, Math.trunc(durationHours)));
  return new Date(Date.now() + safeHours * 60 * 60 * 1000);
}

export async function listCharacterSafetyProfile(input: { userId: string; characterId: string }) {
  const character = await db.query.characters.findFirst({
    where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
  });

  if (!character) {
    return null;
  }

  const [activeEnforcements, appeals, notes] = await Promise.all([
    db.query.characterEnforcements.findMany({
      where: and(
        eq(characterEnforcements.characterId, input.characterId),
        eq(characterEnforcements.isActive, true),
        or(isNull(characterEnforcements.endsAt), sql`${characterEnforcements.endsAt} > now()`),
      ),
      orderBy: desc(characterEnforcements.createdAt),
      limit: 20,
    }),
    db.query.enforcementAppeals.findMany({
      where: eq(enforcementAppeals.characterId, input.characterId),
      orderBy: desc(enforcementAppeals.createdAt),
      limit: 20,
    }),
    db.query.moderationNotes.findMany({
      where: eq(moderationNotes.characterId, input.characterId),
      orderBy: desc(moderationNotes.createdAt),
      limit: 10,
    }),
  ]);

  return { activeEnforcements, appeals, notes };
}

export async function hasActiveCharacterRestriction(input: {
  characterId: string;
  actionType: 'social_mute' | 'shop_restriction' | 'temporary_suspension';
}) {
  const enforcement = await db.query.characterEnforcements.findFirst({
    where: and(
      eq(characterEnforcements.characterId, input.characterId),
      eq(characterEnforcements.actionType, input.actionType),
      eq(characterEnforcements.isActive, true),
      or(isNull(characterEnforcements.endsAt), sql`${characterEnforcements.endsAt} > now()`),
    ),
  });

  return enforcement ?? null;
}

export async function applyCharacterEnforcement(input: {
  adminUserId: string;
  characterId: string;
  actionType: EnforcementActionType;
  reason: string;
  severity?: number;
  durationHours?: number | null;
  cashPenalty?: number | null;
}) {
  const reason = validateModerationReason(input.reason);
  const severity = clampAdminSeverity(input.severity ?? 1);
  const endsAt = calculateEndsAt(input.durationHours);
  const label = getRestrictionLabel(input.actionType);
  const cashPenalty =
    input.actionType === 'cash_penalty' ? Math.max(0, Math.trunc(input.cashPenalty ?? 0)) : 0;

  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, input.characterId),
    });

    if (!character) {
      throw new Error('Character not found.');
    }

    if (input.actionType === 'cash_penalty' && cashPenalty <= 0) {
      throw new Error('Cash penalty requires a positive amount.');
    }

    const [enforcement] = await tx
      .insert(characterEnforcements)
      .values({
        characterId: input.characterId,
        actionType: input.actionType,
        reason,
        severity,
        endsAt,
        createdByUserId: input.adminUserId,
        metadata: { durationHours: input.durationHours ?? null, cashPenalty },
      })
      .returning();

    let updatedCharacter = character;

    if (input.actionType === 'temporary_suspension') {
      const [updated] = await tx
        .update(characters)
        .set({
          status: 'jailed',
          statusUntil: endsAt,
          statusReason: `Admin enforcement: ${reason}`,
          updatedAt: sql`now()`,
        })
        .where(eq(characters.id, input.characterId))
        .returning();
      updatedCharacter = updated;
    }

    if (input.actionType === 'cash_penalty') {
      const appliedPenalty = Math.min(character.cash, cashPenalty);
      const debit = await decrementCharacterCash(tx, input.characterId, appliedPenalty);

      if (!debit.ok) {
        throw new Error('Could not apply cash penalty safely. Refresh and try again.');
      }

      updatedCharacter = debit.character;

      await tx.insert(financialTransactions).values({
        characterId: input.characterId,
        type: 'system',
        amount: String(updatedCharacter.cash - character.cash),
        description: `Admin cash penalty: ${reason}`,
        metadata: {
          enforcementId: enforcement.id,
          before: character.cash,
          after: updatedCharacter.cash,
          cashPenalty,
          appliedPenalty,
        },
      });
    }

    await tx.insert(moderationNotes).values({
      userId: character.userId,
      characterId: input.characterId,
      note: `[${input.actionType}] ${reason}`,
      severity: severity >= 4 ? 'critical' : severity >= 2 ? 'warning' : 'info',
      createdByUserId: input.adminUserId,
      metadata: { enforcementId: enforcement.id, endsAt, cashPenalty },
    });

    await tx.insert(notifications).values({
      userId: character.userId,
      characterId: input.characterId,
      category: 'admin',
      priority: severity >= 4 ? 'urgent' : 'high',
      title: label,
      body: endsAt ? `${reason} Ends ${endsAt.toISOString()}.` : reason,
      sourceType: 'character_enforcement',
      sourceId: enforcement.id,
      metadata: { actionType: input.actionType, severity, endsAt, cashPenalty },
    });

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetUserId: character.userId,
      targetCharacterId: input.characterId,
      actionType: 'enforcement_action',
      summary: `${label} applied to ${character.name}.`,
      beforeValue: { status: character.status, cash: character.cash },
      afterValue: { enforcement, status: updatedCharacter.status, cash: updatedCharacter.cash },
      metadata: { reason, severity, endsAt, cashPenalty },
    });

    return { enforcement, character: updatedCharacter };
  });
}

export async function liftCharacterEnforcement(input: {
  adminUserId: string;
  enforcementId: string;
  reason: string;
}) {
  const reason = validateModerationReason(input.reason);

  return db.transaction(async (tx) => {
    const enforcement = await tx.query.characterEnforcements.findFirst({
      where: eq(characterEnforcements.id, input.enforcementId),
    });

    if (!enforcement) {
      throw new Error('Enforcement not found.');
    }

    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, enforcement.characterId),
    });

    if (!character) {
      throw new Error('Character not found.');
    }

    const [updated] = await tx
      .update(characterEnforcements)
      .set({
        isActive: false,
        liftedByUserId: input.adminUserId,
        liftedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(characterEnforcements.id, input.enforcementId))
      .returning();

    if (
      enforcement.actionType === 'temporary_suspension' &&
      character.statusReason?.startsWith('Admin enforcement:')
    ) {
      await tx
        .update(characters)
        .set({ status: 'free', statusUntil: null, statusReason: null, updatedAt: sql`now()` })
        .where(eq(characters.id, character.id));
    }

    await tx.insert(moderationNotes).values({
      userId: character.userId,
      characterId: character.id,
      note: `[enforcement lifted] ${reason}`,
      severity: 'info',
      createdByUserId: input.adminUserId,
      metadata: { enforcementId: input.enforcementId, actionType: enforcement.actionType },
    });

    await tx.insert(notifications).values({
      userId: character.userId,
      characterId: character.id,
      category: 'admin',
      priority: 'normal',
      title: 'Enforcement lifted',
      body: reason,
      sourceType: 'character_enforcement',
      sourceId: input.enforcementId,
      metadata: { actionType: enforcement.actionType },
    });

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetUserId: character.userId,
      targetCharacterId: character.id,
      actionType: 'enforcement_lift',
      summary: `Lifted ${enforcement.actionType} for ${character.name}.`,
      beforeValue: enforcement,
      afterValue: updated,
      metadata: { reason },
    });

    return { enforcement: updated };
  });
}

export async function submitEnforcementAppeal(input: {
  userId: string;
  characterId: string;
  enforcementId: string;
  body: string;
}) {
  const body = input.body.trim();

  if (body.length < 10 || body.length > 1000) {
    throw new Error('Appeal must be 10-1000 characters.');
  }

  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) {
      throw new Error('Character not found.');
    }

    const enforcement = await tx.query.characterEnforcements.findFirst({
      where: and(
        eq(characterEnforcements.id, input.enforcementId),
        eq(characterEnforcements.characterId, input.characterId),
      ),
    });

    if (!enforcement) {
      throw new Error('Enforcement not found.');
    }

    const [appeal] = await tx
      .insert(enforcementAppeals)
      .values({ enforcementId: input.enforcementId, characterId: input.characterId, body })
      .onConflictDoUpdate({
        target: [enforcementAppeals.enforcementId, enforcementAppeals.characterId],
        set: {
          body,
          status: 'open',
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionNote: null,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    await tx.insert(moderationNotes).values({
      userId: input.userId,
      characterId: input.characterId,
      note: `[appeal submitted] ${body}`,
      severity: 'info',
      metadata: { enforcementId: input.enforcementId, appealId: appeal.id },
    });

    return { appeal };
  });
}

export async function reviewEnforcementAppeal(input: {
  adminUserId: string;
  appealId: string;
  status: 'accepted' | 'rejected';
  note: string;
  liftEnforcement?: boolean;
}) {
  const note = validateModerationReason(input.note);

  return db.transaction(async (tx) => {
    const appeal = await tx.query.enforcementAppeals.findFirst({
      where: eq(enforcementAppeals.id, input.appealId),
    });

    if (!appeal) {
      throw new Error('Appeal not found.');
    }

    const enforcement = await tx.query.characterEnforcements.findFirst({
      where: eq(characterEnforcements.id, appeal.enforcementId),
    });
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, appeal.characterId),
    });

    if (!enforcement || !character) {
      throw new Error('Appeal target not found.');
    }

    const [updatedAppeal] = await tx
      .update(enforcementAppeals)
      .set({
        status: input.status,
        reviewedByUserId: input.adminUserId,
        reviewedAt: sql`now()`,
        resolutionNote: note,
        updatedAt: sql`now()`,
      })
      .where(eq(enforcementAppeals.id, input.appealId))
      .returning();

    let lifted = null;
    if (input.status === 'accepted' && input.liftEnforcement) {
      const [updatedEnforcement] = await tx
        .update(characterEnforcements)
        .set({
          isActive: false,
          liftedByUserId: input.adminUserId,
          liftedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(characterEnforcements.id, enforcement.id))
        .returning();
      lifted = updatedEnforcement;

      if (
        enforcement.actionType === 'temporary_suspension' &&
        character.statusReason?.startsWith('Admin enforcement:')
      ) {
        await tx
          .update(characters)
          .set({ status: 'free', statusUntil: null, statusReason: null, updatedAt: sql`now()` })
          .where(eq(characters.id, character.id));
      }
    }

    await tx.insert(notifications).values({
      userId: character.userId,
      characterId: character.id,
      category: 'admin',
      priority: 'normal',
      title: `Appeal ${input.status}`,
      body: note,
      sourceType: 'enforcement_appeal',
      sourceId: appeal.id,
      metadata: { enforcementId: enforcement.id, lifted: !!lifted },
    });

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetUserId: character.userId,
      targetCharacterId: character.id,
      actionType: 'appeal_review',
      summary: `Appeal ${input.status} for ${character.name}.`,
      beforeValue: appeal,
      afterValue: { appeal: updatedAppeal, lifted },
      metadata: { note },
    });

    return { appeal: updatedAppeal, lifted };
  });
}

export async function searchAdminCharacters(input: { query: string; limit?: number }) {
  const rawQuery = input.query.trim();
  const safeLimit = Math.max(1, Math.min(25, input.limit ?? 10));

  if (rawQuery.length < 2) {
    return { query: rawQuery, results: [] };
  }

  const likeQuery = `%${rawQuery}%`;
  const rows = await db.execute(sql`
    select
      c.id,
      c.user_id as "userId",
      c.name,
      c.status,
      c.status_until as "statusUntil",
      c.status_reason as "statusReason",
      c.location,
      c.cash,
      c.bank,
      c.level,
      c.reputation,
      c.heat,
      u.email as "userEmail",
      u.display_name as "userDisplayName",
      coalesce(flag_counts.active_flags, 0)::int as "activeFlags",
      coalesce(enforcement_counts.active_enforcements, 0)::int as "activeEnforcements",
      c.created_at as "createdAt"
    from characters c
    join users u on u.id = c.user_id
    left join (
      select character_id, count(*) as active_flags
      from character_flags
      where is_active = true
      group by character_id
    ) flag_counts on flag_counts.character_id = c.id
    left join (
      select character_id, count(*) as active_enforcements
      from character_enforcements
      where is_active = true and (ends_at is null or ends_at > now())
      group by character_id
    ) enforcement_counts on enforcement_counts.character_id = c.id
    where c.name ilike ${likeQuery}
      or c.id::text = ${rawQuery}
      or u.email ilike ${likeQuery}
      or coalesce(u.display_name, '') ilike ${likeQuery}
    order by c.updated_at desc
    limit ${safeLimit}
  `);

  return { query: rawQuery, results: Array.isArray(rows) ? rows : ((rows as any).rows ?? []) };
}

export async function expireDueCharacterEnforcements({ limit = 100 } = {}) {
  const safeLimit = Math.max(1, Math.min(500, limit));

  return db.transaction(async (tx) => {
    const dueRows = await tx.execute(sql`
      select
        ce.id,
        ce.character_id as "characterId",
        ce.action_type as "actionType",
        ce.reason,
        ce.ends_at as "endsAt",
        c.user_id as "userId",
        c.name as "characterName",
        c.status,
        c.status_reason as "statusReason"
      from character_enforcements ce
      join characters c on c.id = ce.character_id
      where ce.is_active = true
        and ce.ends_at is not null
        and ce.ends_at <= now()
      order by ce.ends_at asc
      limit ${safeLimit}
      for update skip locked
    `);

    const due = Array.from(
      (Array.isArray(dueRows) ? dueRows : ((dueRows as any).rows ?? [])) as any[],
    );

    if (!due.length) {
      return { expired: 0, enforcements: [] };
    }

    const expired = [];

    for (const enforcement of due) {
      const [updated] = await tx
        .update(characterEnforcements)
        .set({
          isActive: false,
          expiredAt: sql`now()`,
          expiryReason: 'Expired automatically after the configured duration.',
          updatedAt: sql`now()`,
        })
        .where(eq(characterEnforcements.id, enforcement.id))
        .returning();

      if (
        enforcement.actionType === 'temporary_suspension' &&
        String(enforcement.statusReason ?? '').startsWith('Admin enforcement:')
      ) {
        await tx
          .update(characters)
          .set({ status: 'free', statusUntil: null, statusReason: null, updatedAt: sql`now()` })
          .where(eq(characters.id, enforcement.characterId));
      }

      await tx.insert(notifications).values({
        userId: enforcement.userId,
        characterId: enforcement.characterId,
        category: 'admin',
        priority: 'normal',
        title: 'Restriction expired',
        body: `Your ${enforcement.actionType} has expired.`,
        sourceType: 'character_enforcement',
        sourceId: enforcement.id,
        metadata: { actionType: enforcement.actionType, expiredAt: new Date().toISOString() },
      });

      await tx.insert(adminActionLogs).values({
        adminUserId: null,
        targetUserId: enforcement.userId,
        targetCharacterId: enforcement.characterId,
        actionType: 'enforcement_lift',
        summary: `Expired ${enforcement.actionType} for ${enforcement.characterName}.`,
        beforeValue: enforcement,
        afterValue: updated,
        metadata: { automatic: true, expiryReason: 'duration_elapsed' },
      });

      expired.push(updated);
    }

    return { expired: expired.length, enforcements: expired };
  });
}

export async function getModerationTransparencySummary({ days = 30 } = {}) {
  const safeDays = Math.max(1, Math.min(365, Math.trunc(days)));
  const [reportRows, enforcementRows, appealRows] = await Promise.all([
    db.execute(sql`
      select kind, status, count(*)::int as count
      from (
        select 'message' as kind, status::text as status, created_at from message_reports
        union all
        select 'article' as kind, status::text as status, created_at from newspaper_article_reports
      ) reports
      where created_at >= now() - (${safeDays}::text || ' days')::interval
      group by kind, status
      order by kind, status
    `),
    db.execute(sql`
      select action_type as "actionType", count(*)::int as count
      from character_enforcements
      where created_at >= now() - (${safeDays}::text || ' days')::interval
      group by action_type
      order by action_type
    `),
    db.execute(sql`
      select status, count(*)::int as count
      from enforcement_appeals
      where created_at >= now() - (${safeDays}::text || ' days')::interval
      group by status
      order by status
    `),
  ]);

  return {
    days: safeDays,
    reports: Array.isArray(reportRows) ? reportRows : ((reportRows as any).rows ?? []),
    enforcements: Array.isArray(enforcementRows)
      ? enforcementRows
      : ((enforcementRows as any).rows ?? []),
    appeals: Array.isArray(appealRows) ? appealRows : ((appealRows as any).rows ?? []),
  };
}
