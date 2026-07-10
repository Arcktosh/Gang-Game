import { and, desc, eq, sql } from 'drizzle-orm';
import {
  DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS,
  buildOperationalAnomalySignalKey,
  calculateOperationalAnomalySeverity,
  normalizeOperationalAnomalyThresholds,
  summarizeOperationalAnomaly,
  type OperationalAnomalyCategory,
  type OperationalAnomalyThresholds,
} from '@drugdeal/game';
import { db } from '../client';
import { adminActionLogs, operationalAnomalies } from '../schema';

export type OperationalAnomalyStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type OperationalAnomalyListStatus = OperationalAnomalyStatus | 'all';

export type OperationalAnomalyScanInput = {
  thresholds?: Partial<OperationalAnomalyThresholds>;
  bucket?: string;
};

export type OperationalAnomalyCandidate = {
  characterId?: string | null;
  userId?: string | null;
  category: OperationalAnomalyCategory;
  signal: string;
  severity: number;
  summary: string;
  evidence: Record<string, unknown>;
};

function rowsFromExecuteResult(result: unknown) {
  return Array.isArray(result) ? result : ((result as any)?.rows ?? []);
}

function normalizeLimit(value?: number) {
  return Math.max(1, Math.min(200, Math.floor(value ?? 50)));
}

function normalizeOffset(value?: number) {
  return Math.max(0, Math.min(10_000, Math.floor(value ?? 0)));
}

function normalizeStatus(status?: string): OperationalAnomalyListStatus {
  return ['open', 'reviewing', 'resolved', 'dismissed', 'all'].includes(status ?? '') ? (status as OperationalAnomalyListStatus) : 'open';
}

function buildBucket(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

async function upsertOperationalAnomaly(candidate: OperationalAnomalyCandidate, bucket: string) {
  const entityId = candidate.characterId ?? candidate.userId ?? 'system';
  const signalKey = buildOperationalAnomalySignalKey({
    category: candidate.category,
    signal: candidate.signal,
    entityId,
    bucket,
  });

  const [anomaly] = await db
    .insert(operationalAnomalies)
    .values({
      characterId: candidate.characterId ?? null,
      userId: candidate.userId ?? null,
      signalKey,
      signalCategory: candidate.category,
      severity: candidate.severity,
      summary: candidate.summary,
      evidence: { ...candidate.evidence, bucket, signal: candidate.signal },
      status: 'open',
    })
    .onConflictDoUpdate({
      target: operationalAnomalies.signalKey,
      set: {
        characterId: candidate.characterId ?? null,
        userId: candidate.userId ?? null,
        signalCategory: candidate.category,
        severity: candidate.severity,
        summary: candidate.summary,
        evidence: { ...candidate.evidence, bucket, signal: candidate.signal },
        status: 'open',
        detectedAt: sql`now()`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return anomaly;
}

export async function listOperationalAnomalies(input: {
  status?: OperationalAnomalyListStatus;
  category?: OperationalAnomalyCategory | 'all';
  limit?: number;
  offset?: number;
} = {}) {
  const status = normalizeStatus(input.status);
  const category = input.category ?? 'all';
  const safeLimit = normalizeLimit(input.limit);
  const safeOffset = normalizeOffset(input.offset);

  const result = await db.execute(sql`
    select
      oa.id,
      oa.character_id as "characterId",
      oa.user_id as "userId",
      oa.signal_key as "signalKey",
      oa.signal_category as "signalCategory",
      oa.severity,
      oa.summary,
      oa.evidence,
      oa.status,
      oa.detected_at as "detectedAt",
      oa.resolved_at as "resolvedAt",
      oa.resolved_by_user_id as "resolvedByUserId",
      oa.resolution_note as "resolutionNote",
      oa.created_at as "createdAt",
      oa.updated_at as "updatedAt",
      c.name as "characterName",
      u.email as "userEmail",
      u.display_name as "userDisplayName"
    from operational_anomalies oa
    left join characters c on c.id = oa.character_id
    left join users u on u.id = coalesce(oa.user_id, c.user_id)
    where (${status} = 'all' or oa.status = ${status})
      and (${category} = 'all' or oa.signal_category = ${category})
    order by
      case when oa.status = 'open' then 0 when oa.status = 'reviewing' then 1 else 2 end,
      oa.severity desc,
      oa.detected_at desc
    limit ${safeLimit}
    offset ${safeOffset}
  `);

  const anomalies = rowsFromExecuteResult(result).map((row: any) => ({
    ...row,
    severity: Number(row.severity ?? 1),
  }));

  return {
    status,
    category,
    anomalies,
    pagination: {
      limit: safeLimit,
      offset: safeOffset,
      count: anomalies.length,
      nextOffset: anomalies.length === safeLimit ? safeOffset + safeLimit : null,
      previousOffset: safeOffset > 0 ? Math.max(0, safeOffset - safeLimit) : null,
    },
  };
}

export async function resolveOperationalAnomaly(input: {
  adminUserId: string;
  anomalyId: string;
  status: Exclude<OperationalAnomalyStatus, 'open'>;
  note?: string;
}) {
  const note = input.note?.trim() || `Marked anomaly ${input.status}.`;

  if (note.length < 5 || note.length > 500) {
    throw new Error('Resolution note must be 5-500 characters.');
  }

  return db.transaction(async (tx) => {
    const existing = await tx.query.operationalAnomalies.findFirst({ where: eq(operationalAnomalies.id, input.anomalyId) });

    if (!existing) {
      throw new Error('Operational anomaly not found.');
    }

    const [anomaly] = await tx
      .update(operationalAnomalies)
      .set({
        status: input.status,
        resolvedAt: sql`now()`,
        resolvedByUserId: input.adminUserId,
        resolutionNote: note,
        updatedAt: sql`now()`,
      })
      .where(and(eq(operationalAnomalies.id, input.anomalyId), eq(operationalAnomalies.status, existing.status)))
      .returning();

    if (!anomaly) {
      throw new Error('Operational anomaly changed while it was being reviewed. Refresh and try again.');
    }

    await tx.insert(adminActionLogs).values({
      adminUserId: input.adminUserId,
      targetUserId: existing.userId ?? null,
      targetCharacterId: existing.characterId ?? null,
      actionType: 'moderation_note',
      summary: `Marked operational anomaly ${input.status}: ${existing.summary}`.slice(0, 500),
      beforeValue: existing,
      afterValue: anomaly,
      metadata: { anomalyId: input.anomalyId, status: input.status, note },
    });

    return anomaly;
  });
}

export async function runOperationalAnomalyScan(input: OperationalAnomalyScanInput = {}) {
  const thresholds = normalizeOperationalAnomalyThresholds(input.thresholds ?? DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS);
  const bucket = input.bucket ?? buildBucket();
  const candidates: OperationalAnomalyCandidate[] = [];

  const [wealthRowsResult, transactionRowsResult, inventoryRowsResult, sessionRowsResult] = await Promise.all([
    db.execute(sql`
      select
        c.id as "characterId",
        c.user_id as "userId",
        c.name as "characterName",
        c.cash,
        c.bank,
        (c.cash + c.bank) as "netWorth",
        c.level,
        c.heat
      from characters c
      where (c.cash + c.bank) >= ${thresholds.highNetWorth}
      order by (c.cash + c.bank) desc
      limit 50
    `),
    db.execute(sql`
      select
        ft.character_id as "characterId",
        c.user_id as "userId",
        c.name as "characterName",
        count(*) as "transactionCount",
        coalesce(sum(abs(ft.amount::numeric)), 0) as "transactionVolume"
      from financial_transactions ft
      join characters c on c.id = ft.character_id
      where ft.created_at >= now() - (${thresholds.scanWindowHours}::text || ' hours')::interval
        and ft.character_id is not null
      group by ft.character_id, c.user_id, c.name
      having count(*) >= ${thresholds.transactionCount}
        or coalesce(sum(abs(ft.amount::numeric)), 0) >= ${thresholds.transactionVolume}
      order by coalesce(sum(abs(ft.amount::numeric)), 0) desc, count(*) desc
      limit 50
    `),
    db.execute(sql`
      select
        ii.character_id as "characterId",
        c.user_id as "userId",
        c.name as "characterName",
        ii.item_key as "itemKey",
        ii.quantity
      from inventory_items ii
      join characters c on c.id = ii.character_id
      where ii.quantity >= ${thresholds.inventoryQuantity}
      order by ii.quantity desc
      limit 50
    `),
    db.execute(sql`
      select
        u.id as "userId",
        u.email as "userEmail",
        u.display_name as "userDisplayName",
        count(*) as "sessionCount",
        count(distinct coalesce(us.ip_address, 'unknown')) as "distinctIpCount"
      from user_sessions us
      join users u on u.id = us.user_id
      where us.last_seen_at >= now() - (${thresholds.scanWindowHours}::text || ' hours')::interval
      group by u.id, u.email, u.display_name
      having count(distinct coalesce(us.ip_address, 'unknown')) >= ${thresholds.sessionIpCount}
      order by count(distinct coalesce(us.ip_address, 'unknown')) desc
      limit 50
    `),
  ]);

  for (const row of rowsFromExecuteResult(wealthRowsResult) as any[]) {
    const netWorth = normalizeNumber(row.netWorth);
    candidates.push({
      characterId: row.characterId,
      userId: row.userId,
      category: 'economy',
      signal: 'high_net_worth',
      severity: calculateOperationalAnomalySeverity({ ratio: netWorth / thresholds.highNetWorth }),
      summary: summarizeOperationalAnomaly({ characterName: row.characterName, signal: 'high net worth', value: netWorth, threshold: thresholds.highNetWorth }),
      evidence: {
        netWorth,
        cash: normalizeNumber(row.cash),
        bank: normalizeNumber(row.bank),
        level: normalizeNumber(row.level),
        heat: normalizeNumber(row.heat),
        threshold: thresholds.highNetWorth,
      },
    });
  }

  for (const row of rowsFromExecuteResult(transactionRowsResult) as any[]) {
    const transactionVolume = normalizeNumber(row.transactionVolume);
    const transactionCount = normalizeNumber(row.transactionCount);
    const volumeSeverity = calculateOperationalAnomalySeverity({ ratio: transactionVolume / thresholds.transactionVolume });
    const countSeverity = calculateOperationalAnomalySeverity({ ratio: transactionCount / thresholds.transactionCount });
    candidates.push({
      characterId: row.characterId,
      userId: row.userId,
      category: 'economy',
      signal: 'transaction_spike',
      severity: Math.max(volumeSeverity, countSeverity),
      summary: summarizeOperationalAnomaly({ characterName: row.characterName, signal: 'transaction spike', value: Math.max(transactionVolume, transactionCount), threshold: Math.max(thresholds.transactionVolume, thresholds.transactionCount) }),
      evidence: {
        transactionVolume,
        transactionCount,
        transactionVolumeThreshold: thresholds.transactionVolume,
        transactionCountThreshold: thresholds.transactionCount,
        scanWindowHours: thresholds.scanWindowHours,
      },
    });
  }

  for (const row of rowsFromExecuteResult(inventoryRowsResult) as any[]) {
    const quantity = normalizeNumber(row.quantity);
    candidates.push({
      characterId: row.characterId,
      userId: row.userId,
      category: 'inventory',
      signal: `inventory_quantity_${row.itemKey}`,
      severity: calculateOperationalAnomalySeverity({ ratio: quantity / thresholds.inventoryQuantity }),
      summary: summarizeOperationalAnomaly({ characterName: row.characterName, signal: `${row.itemKey} inventory quantity`, value: quantity, threshold: thresholds.inventoryQuantity }),
      evidence: {
        itemKey: row.itemKey,
        quantity,
        threshold: thresholds.inventoryQuantity,
      },
    });
  }

  for (const row of rowsFromExecuteResult(sessionRowsResult) as any[]) {
    const distinctIpCount = normalizeNumber(row.distinctIpCount);
    candidates.push({
      userId: row.userId,
      category: 'session',
      signal: 'many_recent_session_ips',
      severity: calculateOperationalAnomalySeverity({ ratio: distinctIpCount / thresholds.sessionIpCount }),
      summary: summarizeOperationalAnomaly({ characterName: row.userDisplayName || row.userEmail, signal: 'recent session IP spread', value: distinctIpCount, threshold: thresholds.sessionIpCount }),
      evidence: {
        userEmail: row.userEmail,
        sessionCount: normalizeNumber(row.sessionCount),
        distinctIpCount,
        threshold: thresholds.sessionIpCount,
        scanWindowHours: thresholds.scanWindowHours,
      },
    });
  }

  const anomalies = [];
  for (const candidate of candidates) {
    anomalies.push(await upsertOperationalAnomaly(candidate, bucket));
  }

  return {
    scannedAt: new Date().toISOString(),
    bucket,
    thresholds,
    candidates: candidates.length,
    anomalies,
  };
}
