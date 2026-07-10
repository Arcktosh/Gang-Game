'use client';

import { FormEvent, useState } from 'react';
import type { AdminEconomyAuditTransaction, AdminInventoryAuditItem, AdminSessionAuditSession, AdminTransactionType } from '@drugdeal/db';
import { useRouter } from 'next/navigation';
import { useToast } from '@/features/ui/toast-provider';
import { formatDateTime } from '@/lib/format';

type ConfigEntry = {
  key: string;
  label: string;
  description: string;
  category: string;
  isPublic: boolean;
  value: unknown;
  updatedAt: string | Date;
};

type FeatureFlagState = {
  key: string;
  label: string;
  category: string;
  description: string;
  enabled: boolean;
  disabledMessage: string;
  reason: string;
  isConfigured: boolean;
  updatedAt?: string | Date | null;
};

type AuditEntry = {
  id: string;
  actionType: string;
  summary: string;
  createdAt: string | Date;
  targetCharacterId?: string | null;
};

type FlagEntry = {
  id: string;
  characterId: string;
  flagType: string;
  reason: string;
  severity: number;
  createdAt: string | Date;
};

type EnforcementEntry = {
  id: string;
  characterId: string;
  characterName: string;
  actionType: string;
  reason: string;
  severity: number;
  endsAt?: string | Date | null;
  createdAt: string | Date;
};

type AppealEntry = {
  id: string;
  enforcementId: string;
  characterId: string;
  characterName: string;
  actionType: string;
  body: string;
  status: string;
  createdAt: string | Date;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  status: string;
  severity: string;
  createdAt: string | Date;
};

type ModerationMessageReport = {
  kind: 'message';
  id: string;
  messageId: string;
  reporterCharacterId: string;
  reason: string;
  status: string;
  createdAt: string | Date;
  threadId: string;
  senderCharacterId: string;
  messagePreview: string;
  hiddenAt?: string | Date | null;
  hiddenReason?: string | null;
  retentionExpiresAt?: string | Date | null;
  reporterName: string;
  senderName: string;
};

type ModerationArticleReport = {
  kind: 'article';
  id: string;
  articleId: string;
  reporterCharacterId: string;
  reason: string;
  status: string;
  createdAt: string | Date;
  authorCharacterId?: string | null;
  articleTitle: string;
  articleSlug: string;
  isPublished: boolean;
  reporterName: string;
  authorName?: string | null;
};

type ModerationQueue = {
  status: string;
  messages: ModerationMessageReport[];
  articles: ModerationArticleReport[];
  totalOpen?: number;
};


type AdminCharacterSearchResult = {
  id: string;
  userId: string;
  name: string;
  status: string;
  statusUntil?: string | Date | null;
  statusReason?: string | null;
  location: string;
  cash: number;
  bank: number;
  level: number;
  reputation: number;
  heat: number;
  userEmail: string;
  userDisplayName?: string | null;
  activeFlags: number;
  activeEnforcements: number;
  createdAt: string | Date;
};

type ModerationTransparencySummary = {
  days: number;
  reports: { kind: string; status: string; count: number }[];
  enforcements: { actionType: string; count: number }[];
  appeals: { status: string; count: number }[];
};

type SessionAuditEntry = {
  id: string;
  userId: string;
  email: string;
  displayName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastSeenAt: string | Date;
  expiresAt: string | Date;
  createdAt: string | Date;
};

type InventoryAuditEntry = {
  id: string;
  characterId: string;
  characterName: string;
  itemKey: string;
  quantity: number;
  updatedAt: string | Date;
};

type AdminLoanExposureEntry = {
  id: string;
  characterId: string;
  characterName: string;
  characterStatus: string;
  userEmail: string;
  userDisplayName?: string | null;
  offerKey: string;
  status: string;
  lifecycleStatus: string;
  principal: number;
  fee: number;
  totalDue: number;
  repaidAmount: number;
  outstanding: number;
  dueAt: string | Date;
  repaidAt?: string | Date | null;
  defaultAt: string | Date;
  createdAt: string | Date;
  hoursPastDue: number;
  cash: number;
  bank: number;
  level: number;
  heat: number;
};

type AdminLoanExposure = {
  status: string;
  query: string;
  summary: {
    activeCount: number;
    overdueCount: number;
    defaultedCount: number;
    repaidCount: number;
    unresolvedOutstanding: number;
    lifetimeDue: number;
    lifetimeRepaid: number;
  };
  loans: AdminLoanExposureEntry[];
};


type OperationalAnomalyEntry = {
  id: string;
  characterId?: string | null;
  userId?: string | null;
  signalKey: string;
  signalCategory: string;
  severity: number;
  summary: string;
  evidence: Record<string, unknown>;
  status: string;
  detectedAt: string | Date;
  resolvedAt?: string | Date | null;
  characterName?: string | null;
  userEmail?: string | null;
  userDisplayName?: string | null;
};

type OperationalAnomalyList = {
  status: string;
  category: string;
  anomalies: OperationalAnomalyEntry[];
};



type AdminEconomyAudit = {
  q: string;
  type: AdminTransactionType;
  minAmount?: number | null;
  maxAmount?: number | null;
  days: number;
  summary: {
    transactionCount: number;
    uniqueCharacters: number;
    grossVolume: number;
    positiveTotal: number;
    negativeTotal: number;
    largestAbsoluteAmount: number;
    byType: { type: string; count: number; grossVolume: number }[];
  };
  transactions: AdminEconomyAuditTransaction[];
};

type AdminInventoryAudit = {
  q: string;
  itemKey: string;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  summary: {
    rowCount: number;
    uniqueCharacters: number;
    uniqueItems: number;
    totalQuantity: number;
    estimatedValue: number;
    largestStack: number;
    topItems: { itemKey: string; holderCount: number; totalQuantity: number }[];
  };
  items: AdminInventoryAuditItem[];
};

type AdminSessionAudit = {
  q: string;
  ipAddress: string;
  days: number;
  summary: {
    sessionCount: number;
    uniqueUsers: number;
    uniqueIps: number;
    activeSessions: number;
    topIps: { ipAddress: string; sessionCount: number; uniqueUsers: number }[];
  };
  sessions: AdminSessionAuditSession[];
};

type AdminAuditWorkbench = {
  economy: AdminEconomyAudit;
  inventory: AdminInventoryAudit;
  sessions: AdminSessionAudit;
};

type AdminRollbackCandidate = {
  id: string;
  actionType: string;
  summary: string;
  targetCharacterId?: string | null;
  characterName?: string | null;
  userEmail?: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  metadata: unknown;
  createdAt: string | Date;
  isRolledBack: boolean;
};

type AdminRollbackCandidates = {
  candidates: AdminRollbackCandidate[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    nextOffset?: number | null;
    previousOffset?: number | null;
  };
};

type AdminPanelProps = {
  config: ConfigEntry[];
  featureFlags: FeatureFlagState[];
  audit: {
    adminLogs: AuditEntry[];
    activeFlags: FlagEntry[];
    activeEnforcements?: EnforcementEntry[];
    openAppeals?: AppealEntry[];
    recentSessions?: SessionAuditEntry[];
    inventoryHighlights?: InventoryAuditEntry[];
  };
  announcements: Announcement[];
  moderation: ModerationQueue;
  moderationArchive: ModerationQueue[];
  transparency: ModerationTransparencySummary;
  loanExposure: AdminLoanExposure;
  anomalies: OperationalAnomalyList;
  auditWorkbench: AdminAuditWorkbench;
  rollbackCandidates: AdminRollbackCandidates;
};

async function sendJson(path: string, method: 'POST' | 'PATCH', body: unknown) {
  const response = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'Admin action failed.');
  }

  return result;
}

export function AdminPanel({ config, featureFlags, audit, announcements, moderation, moderationArchive, transparency, loanExposure, anomalies, auditWorkbench, rollbackCandidates }: AdminPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminCharacterSearchResult[]>([]);
  const [economyAudit, setEconomyAudit] = useState(auditWorkbench.economy);
  const [inventoryAudit, setInventoryAudit] = useState(auditWorkbench.inventory);
  const [sessionAudit, setSessionAudit] = useState(auditWorkbench.sessions);
  const [rollbackList, setRollbackList] = useState(rollbackCandidates);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get('query') ?? '').trim();

    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      toast.warning('Search needs at least 2 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}&limit=10`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Search failed.');
      }

      setSearchResults(result.data?.results ?? result.results ?? []);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Search failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function runAdminAction(path: string, method: 'POST' | 'PATCH', body: unknown, message: string) {
    setSubmitting(true);

    try {
      await sendJson(path, method, body);
      toast.success(message);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Admin action failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const key = String(formData.get('key') ?? '');
    const label = String(formData.get('label') ?? '');
    const category = String(formData.get('category') ?? 'general');
    const description = String(formData.get('description') ?? '');
    const isPublic = formData.get('isPublic') === 'on';
    const rawValue = String(formData.get('value') ?? '{}');

    let value: unknown;
    try {
      value = JSON.parse(rawValue);
    } catch {
      toast.error('Config value must be valid JSON.');
      return;
    }

    await runAdminAction('/api/admin/config', 'PATCH', { key, label, category, description, isPublic, value }, `Updated ${key}.`);
  }




  function buildAuditParams(formData: FormData) {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) {
        params.set(key, text);
      }
    }
    return params;
  }

  async function handleEconomyAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = buildAuditParams(new FormData(event.currentTarget));

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/audit/economy?${params.toString()}`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Economy audit failed.');
      }

      setEconomyAudit(result.data ?? result);
      toast.success('Economy audit refreshed.');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Economy audit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInventoryAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = buildAuditParams(new FormData(event.currentTarget));

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/audit/inventory?${params.toString()}`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Inventory audit failed.');
      }

      setInventoryAudit(result.data ?? result);
      toast.success('Inventory audit refreshed.');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Inventory audit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSessionAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = buildAuditParams(new FormData(event.currentTarget));

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/audit/sessions?${params.toString()}`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Session audit failed.');
      }

      setSessionAudit(result.data ?? result);
      toast.success('Session audit refreshed.');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Session audit failed.');
    } finally {
      setSubmitting(false);
    }
  }


  async function refreshRollbackCandidates() {
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/rollback?limit=25');
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Rollback candidate refresh failed.');
      }

      setRollbackList(result.data ?? result);
      toast.success('Rollback candidates refreshed.');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Rollback candidate refresh failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRollback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await runAdminAction(
      '/api/admin/rollback',
      'POST',
      {
        actionLogId: String(formData.get('actionLogId') ?? ''),
        reason: String(formData.get('reason') ?? 'Rolled back after admin review.'),
      },
      'Admin adjustment rolled back.',
    );
    await refreshRollbackCandidates();
  }

  async function handleRunAnomalyScan() {
    await runAdminAction('/api/admin/anomalies/scan', 'POST', {}, 'Operational anomaly scan completed.');
  }

  async function handleResolveAnomaly(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const anomalyId = String(formData.get('anomalyId') ?? '');
    await runAdminAction(
      `/api/admin/anomalies/${anomalyId}`,
      'POST',
      {
        status: String(formData.get('status') ?? 'resolved'),
        note: String(formData.get('note') ?? 'Reviewed by operations team.'),
      },
      'Operational anomaly updated.',
    );
  }

  async function handleFeatureFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const key = String(formData.get('key') ?? '');
    const label = String(formData.get('label') ?? key);
    const category = String(formData.get('category') ?? 'feature_flags');
    const description = String(formData.get('description') ?? '');
    const disabledMessage = String(formData.get('disabledMessage') ?? 'This feature is temporarily unavailable while the game team completes maintenance.');
    const reason = String(formData.get('reason') ?? '').trim();
    const enabled = formData.get('enabled') === 'on';

    await runAdminAction(
      '/api/admin/config',
      'PATCH',
      {
        key,
        label,
        category,
        description,
        isPublic: true,
        value: { enabled, disabledMessage, reason },
      },
      `${label} ${enabled ? 'enabled' : 'disabled'}.`,
    );
  }

  async function handleAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await runAdminAction(
      '/api/admin/announcements',
      'POST',
      {
        title: String(formData.get('title') ?? ''),
        body: String(formData.get('body') ?? ''),
        severity: String(formData.get('severity') ?? 'info'),
        status: String(formData.get('status') ?? 'published'),
      },
      'Announcement saved.',
    );
  }

  async function handleFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const characterId = String(formData.get('characterId') ?? '');
    await runAdminAction(
      `/api/admin/characters/${characterId}/flag`,
      'POST',
      {
        flagType: String(formData.get('flagType') ?? 'watchlist'),
        reason: String(formData.get('reason') ?? ''),
        severity: Number(formData.get('severity') ?? 1),
      },
      'Character flag added.',
    );
  }


  async function handleEnforcement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const characterId = String(formData.get('characterId') ?? '');
    await runAdminAction(
      `/api/admin/characters/${characterId}/enforce`,
      'POST',
      {
        actionType: String(formData.get('actionType') ?? 'warning'),
        reason: String(formData.get('reason') ?? ''),
        severity: Number(formData.get('severity') ?? 1),
        durationHours: Number(formData.get('durationHours') || 0) || undefined,
        cashPenalty: Number(formData.get('cashPenalty') || 0) || undefined,
      },
      'Character enforcement applied.',
    );
  }

  async function handleResolveFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const flagId = String(formData.get('flagId') ?? '');
    await runAdminAction(
      `/api/admin/flags/${flagId}/resolve`,
      'POST',
      { reason: String(formData.get('reason') ?? 'Resolved by moderation review.') },
      'Character flag resolved.',
    );
  }

  async function handleClearStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const characterId = String(formData.get('characterId') ?? '');
    await runAdminAction(
      `/api/admin/characters/${characterId}/clear-status`,
      'POST',
      { reason: String(formData.get('reason') ?? 'Cleared by admin review.') },
      'Character status cleared.',
    );
  }

  async function handleLiftEnforcement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const enforcementId = String(formData.get('enforcementId') ?? '');
    await runAdminAction(
      `/api/admin/enforcements/${enforcementId}/lift`,
      'POST',
      { reason: String(formData.get('reason') ?? 'Lifted by admin review.') },
      'Enforcement lifted.',
    );
  }

  async function handleAppealReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const appealId = String(formData.get('appealId') ?? '');
    const status = String(formData.get('status') ?? 'rejected');
    await runAdminAction(
      `/api/admin/appeals/${appealId}/review`,
      'POST',
      {
        status,
        note: String(formData.get('note') ?? ''),
        liftEnforcement: formData.get('liftEnforcement') === 'on',
      },
      'Appeal reviewed.',
    );
  }


  async function handleModeration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reportId = String(formData.get('reportId') ?? '');
    const kind = String(formData.get('kind') ?? 'message');
    const status = String(formData.get('status') ?? 'reviewed');
    const note = String(formData.get('note') ?? 'Reviewed by moderation team.');
    const hideArticle = formData.get('hideArticle') === 'on';
    const hideMessage = formData.get('hideMessage') === 'on';

    await runAdminAction(
      `/api/admin/moderation/reports/${reportId}`,
      'POST',
      { kind, status, note, hideArticle, hideMessage },
      'Moderation report updated.',
    );
  }

  async function handleAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const characterId = String(formData.get('characterId') ?? '');
    await runAdminAction(
      `/api/admin/characters/${characterId}/adjust`,
      'POST',
      {
        wallet: String(formData.get('wallet') ?? 'cash'),
        amount: Number(formData.get('amount') ?? 0),
        reason: String(formData.get('reason') ?? ''),
      },
      'Character balance adjusted.',
    );
  }

  return (
    <section style={{ display: 'grid', gap: 24 }}>

      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Rollback workbench</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>
          Reverse recent admin cash or bank adjustments from the audit trail. Rollbacks are idempotency-protected, logged as their own admin actions, and blocked once a source adjustment has already been reversed.
        </p>
        <button disabled={submitting} type="button" onClick={refreshRollbackCandidates}>Refresh rollback candidates</button>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {rollbackList.candidates.length ? rollbackList.candidates.map((candidate) => (
            <form key={candidate.id} onSubmit={handleRollback} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 12 }}>
              <input name="actionLogId" type="hidden" value={candidate.id} />
              <strong>{candidate.actionType} · {candidate.characterName ?? 'unknown character'}</strong>
              <p style={{ color: '#a1a1aa', margin: 0 }}>{candidate.summary} · {formatDateTime(candidate.createdAt)}</p>
              <p style={{ color: candidate.isRolledBack ? '#facc15' : '#86efac', margin: 0 }}>{candidate.isRolledBack ? 'Already rolled back' : 'Rollback available'} · {candidate.userEmail ?? 'no email'}</p>
              <details>
                <summary>Before / after snapshot</summary>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ before: candidate.beforeValue, after: candidate.afterValue, metadata: candidate.metadata }, null, 2)}</pre>
              </details>
              <textarea name="reason" rows={2} defaultValue="Rolled back after admin review." disabled={candidate.isRolledBack} />
              <button disabled={submitting || candidate.isRolledBack} type="submit">Apply rollback</button>
            </form>
          )) : <p>No recent rollback candidates.</p>}
        </div>
      </article>

      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Feature flags</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>Operational kill switches for high-risk gameplay surfaces. Disabling a flag blocks matching mutation APIs with a 503 response while keeping read-only pages available for support visibility.</p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {featureFlags.map((flag) => (
            <form key={flag.key} onSubmit={handleFeatureFlag} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 12 }}>
              <input name="key" type="hidden" value={flag.key} />
              <input name="label" type="hidden" value={flag.label} />
              <input name="category" type="hidden" value="feature_flags" />
              <input name="description" type="hidden" value={flag.description} />
              <strong>{flag.label}</strong>
              <p style={{ color: '#a1a1aa', margin: 0 }}>{flag.description}</p>
              <p style={{ color: flag.enabled ? '#86efac' : '#f87171', margin: 0 }}>{flag.enabled ? 'Enabled' : 'Disabled'} · {flag.isConfigured ? 'configured' : 'default'}</p>
              <label style={{ display: 'flex', gap: 8 }}><input name="enabled" type="checkbox" defaultChecked={flag.enabled} /> Enabled</label>
              <input name="disabledMessage" defaultValue={flag.disabledMessage} placeholder="Disabled message shown to players" />
              <input name="reason" defaultValue={flag.reason} placeholder="Internal reason, incident, or change ticket" />
              <button disabled={submitting} type="submit">Save flag</button>
            </form>
          ))}
        </div>
      </article>



      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Operational anomalies</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>
          Automated economy, inventory, and session signals for production review. The worker refreshes these signals on a schedule; admins can also trigger a scan before balancing or incident response.
        </p>
        <button disabled={submitting} type="button" onClick={handleRunAnomalyScan}>Run anomaly scan</button>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {anomalies.anomalies.length ? anomalies.anomalies.map((anomaly) => (
            <form key={anomaly.id} onSubmit={handleResolveAnomaly} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 12 }}>
              <input name="anomalyId" type="hidden" value={anomaly.id} />
              <strong>{anomaly.signalCategory} · severity {anomaly.severity}</strong>
              <p style={{ margin: 0 }}>{anomaly.summary}</p>
              <p style={{ color: '#a1a1aa', margin: 0 }}>
                {anomaly.characterName ? `Character: ${anomaly.characterName}` : anomaly.userEmail ? `User: ${anomaly.userEmail}` : 'System signal'} · Detected {formatDateTime(anomaly.detectedAt)}
              </p>
              <details>
                <summary>Evidence</summary>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(anomaly.evidence, null, 2)}</pre>
              </details>
              <select name="status" defaultValue="reviewing">
                <option value="reviewing">Mark reviewing</option>
                <option value="resolved">Resolve</option>
                <option value="dismissed">Dismiss</option>
              </select>
              <textarea name="note" rows={2} defaultValue="Reviewed by operations team." />
              <button disabled={submitting} type="submit">Update anomaly</button>
            </form>
          )) : <p>No open operational anomalies.</p>}
        </div>
      </article>


      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Admin audit workbench</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>
          Filter production economy, inventory, and session records from the console. Use CSV exports for incident review, balance audits, and support escalations without direct database access.
        </p>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <section style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 10, paddingTop: 12 }}>
            <h3 style={{ margin: 0 }}>Economy audit</h3>
            <form onSubmit={handleEconomyAudit} style={{ display: 'grid', gap: 8 }}>
              <input name="q" placeholder="Character, email, transaction, or description" />
              <select name="type" defaultValue="all">
                <option value="all">All transaction types</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="stock">Stock</option>
                <option value="crypto">Crypto</option>
                <option value="shop">Shop</option>
                <option value="system">System</option>
              </select>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input name="minAmount" type="number" min="0" placeholder="Min absolute amount" style={{ flex: '1 1 120px' }} />
                <input name="maxAmount" type="number" min="0" placeholder="Max absolute amount" style={{ flex: '1 1 120px' }} />
                <input name="days" type="number" min="1" max="3650" defaultValue={economyAudit.days} style={{ flex: '1 1 90px' }} />
              </div>
              <button disabled={submitting} type="submit">Refresh economy audit</button>
              <a href="/api/admin/audit/economy?format=csv&limit=500" target="_blank" rel="noreferrer">Export latest 500 transactions as CSV</a>
            </form>
            <p style={{ margin: 0 }}><strong>{economyAudit.summary.transactionCount}</strong> rows · ${economyAudit.summary.grossVolume} gross · ${economyAudit.summary.largestAbsoluteAmount} largest</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {economyAudit.transactions.slice(0, 6).map((transaction) => (
                <div key={transaction.id} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
                  <strong>{transaction.type}</strong> · ${transaction.amount} · {transaction.characterName ?? 'system'}
                  <p style={{ color: '#a1a1aa', margin: '4px 0' }}>{transaction.description ?? 'No description'} · {formatDateTime(transaction.createdAt)}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 10, paddingTop: 12 }}>
            <h3 style={{ margin: 0 }}>Inventory audit</h3>
            <form onSubmit={handleInventoryAudit} style={{ display: 'grid', gap: 8 }}>
              <input name="q" placeholder="Character, email, item, or UUID" />
              <input name="itemKey" placeholder="Item key filter" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input name="minQuantity" type="number" min="0" placeholder="Min quantity" style={{ flex: '1 1 120px' }} />
                <input name="maxQuantity" type="number" min="0" placeholder="Max quantity" style={{ flex: '1 1 120px' }} />
              </div>
              <button disabled={submitting} type="submit">Refresh inventory audit</button>
              <a href="/api/admin/audit/inventory?format=csv&limit=500" target="_blank" rel="noreferrer">Export largest 500 stacks as CSV</a>
            </form>
            <p style={{ margin: 0 }}><strong>{inventoryAudit.summary.rowCount}</strong> stacks · {inventoryAudit.summary.totalQuantity} units · ${inventoryAudit.summary.estimatedValue} estimated</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {inventoryAudit.items.slice(0, 6).map((item) => (
                <div key={item.id} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
                  <strong>{item.characterName ?? 'unknown character'}</strong> · {item.itemKey} × {item.quantity}
                  <p style={{ color: '#a1a1aa', margin: '4px 0' }}>${item.estimatedValue} estimated · Updated {formatDateTime(item.updatedAt)}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 10, paddingTop: 12 }}>
            <h3 style={{ margin: 0 }}>Session audit</h3>
            <form onSubmit={handleSessionAudit} style={{ display: 'grid', gap: 8 }}>
              <input name="q" placeholder="Email, display name, IP, user agent, or UUID" />
              <input name="ipAddress" placeholder="IP address filter" />
              <input name="days" type="number" min="1" max="3650" defaultValue={sessionAudit.days} />
              <button disabled={submitting} type="submit">Refresh session audit</button>
              <a href="/api/admin/audit/sessions?format=csv&limit=500" target="_blank" rel="noreferrer">Export latest 500 sessions as CSV</a>
            </form>
            <p style={{ margin: 0 }}><strong>{sessionAudit.summary.sessionCount}</strong> sessions · {sessionAudit.summary.uniqueUsers} users · {sessionAudit.summary.uniqueIps} IPs</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {sessionAudit.sessions.slice(0, 6).map((session) => (
                <div key={session.id} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
                  <strong>{session.email ?? 'unknown email'}</strong> · IP {session.ipAddress ?? 'unknown'}
                  <p style={{ color: '#a1a1aa', margin: '4px 0' }}>{session.displayName ?? 'No display name'} · Last seen {formatDateTime(session.lastSeenAt)}</p>
                  <code style={{ display: 'block', overflowX: 'auto' }}>{session.userAgent ?? 'unknown user agent'}</code>
                </div>
              ))}
            </div>
          </section>
        </div>
      </article>

      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Character search</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>Find a character by name, UUID, player email, or display name before applying flags, enforcement, or account adjustments.</p>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input name="query" placeholder="Character name, UUID, or email" defaultValue={searchQuery} style={{ flex: '1 1 260px' }} />
          <button disabled={submitting} type="submit">Search</button>
        </form>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {searchResults.length ? searchResults.map((character) => (
            <div key={character.id} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
              <strong>{character.name}</strong> · {character.status} · Level {character.level}
              <p style={{ color: '#a1a1aa', margin: '4px 0' }}>{character.userEmail} · {character.location} · ${character.cash} cash / ${character.bank} bank</p>
              <p style={{ margin: '4px 0' }}>Heat {character.heat} · Reputation {character.reputation} · Active flags {character.activeFlags} · Active enforcements {character.activeEnforcements}</p>
              <code style={{ display: 'block', overflowX: 'auto' }}>{character.id}</code>
              {character.statusReason ? <p style={{ color: '#facc15', margin: '4px 0' }}>{character.statusReason}</p> : null}
              {character.status !== 'active' ? (
                <form onSubmit={handleClearStatus} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <input name="characterId" type="hidden" value={character.id} />
                  <input name="reason" defaultValue="Cleared after admin review." style={{ flex: '1 1 240px' }} />
                  <button disabled={submitting} type="submit">Clear status</button>
                </form>
              ) : null}
            </div>
          )) : <p style={{ color: '#a1a1aa' }}>No search results loaded.</p>}
        </div>
      </article>

      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Loan exposure</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>Economy-manager visibility for active, overdue, defaulted, and repaid character loans.</p>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <p style={{ margin: 0 }}><strong>{loanExposure.summary.activeCount}</strong><br /><span style={{ color: '#a1a1aa' }}>active</span></p>
          <p style={{ margin: 0 }}><strong>{loanExposure.summary.overdueCount}</strong><br /><span style={{ color: '#a1a1aa' }}>overdue</span></p>
          <p style={{ margin: 0 }}><strong>{loanExposure.summary.defaultedCount}</strong><br /><span style={{ color: '#a1a1aa' }}>defaulted</span></p>
          <p style={{ margin: 0 }}><strong>${loanExposure.summary.unresolvedOutstanding}</strong><br /><span style={{ color: '#a1a1aa' }}>unresolved outstanding</span></p>
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {loanExposure.loans.length ? loanExposure.loans.map((loan) => (
            <div key={loan.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
              <strong>{loan.characterName}</strong> · {loan.lifecycleStatus} · {loan.offerKey}
              <p style={{ color: '#a1a1aa', margin: '4px 0' }}>{loan.userEmail} · Level {loan.level} · Heat {loan.heat} · {loan.characterStatus}</p>
              <p style={{ margin: '4px 0' }}>${loan.outstanding} outstanding of ${loan.totalDue} · paid ${loan.repaidAmount} · bank ${loan.bank}</p>
              <p style={{ color: loan.lifecycleStatus === 'defaulted' ? '#f87171' : loan.lifecycleStatus === 'overdue' ? '#facc15' : '#a1a1aa', margin: '4px 0' }}>
                Due {formatDateTime(loan.dueAt)}{loan.hoursPastDue > 0 ? ` · ${loan.hoursPastDue}h past due` : ''}
              </p>
              <code style={{ display: 'block', overflowX: 'auto' }}>{loan.characterId}</code>
            </div>
          )) : <p>No loan rows found.</p>}
        </div>
      </article>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Game config</h2>
          <form onSubmit={handleConfig} style={{ display: 'grid', gap: 8 }}>
            <input name="key" required placeholder="economy.global" />
            <input name="label" required placeholder="Label" />
            <input name="category" defaultValue="general" />
            <textarea name="description" placeholder="Description" />
            <textarea name="value" required defaultValue={'{"multiplier":1}'} rows={5} />
            <label style={{ display: 'flex', gap: 8 }}><input name="isPublic" type="checkbox" /> Public</label>
            <button disabled={submitting} type="submit">Save config</button>
          </form>
        </article>

        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Announcement</h2>
          <form onSubmit={handleAnnouncement} style={{ display: 'grid', gap: 8 }}>
            <input name="title" required placeholder="Announcement title" />
            <textarea name="body" required placeholder="Announcement body" rows={5} />
            <select name="severity" defaultValue="info"><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select>
            <select name="status" defaultValue="published"><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
            <button disabled={submitting} type="submit">Publish</button>
          </form>
        </article>

        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Character flag</h2>
          <form onSubmit={handleFlag} style={{ display: 'grid', gap: 8 }}>
            <input name="characterId" required placeholder="Character UUID" />
            <select name="flagType" defaultValue="watchlist">
              <option value="watchlist">Watchlist</option>
              <option value="suspected_alt">Suspected alt</option>
              <option value="market_abuse">Market abuse</option>
              <option value="chat_abuse">Chat abuse</option>
              <option value="botting">Botting</option>
              <option value="exploit_review">Exploit review</option>
              <option value="suspended">Suspended</option>
            </select>
            <input name="severity" type="number" min="1" max="5" defaultValue="1" />
            <textarea name="reason" required placeholder="Reason" />
            <button disabled={submitting} type="submit">Add flag</button>
          </form>
        </article>

        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Enforcement action</h2>
          <form onSubmit={handleEnforcement} style={{ display: 'grid', gap: 8 }}>
            <input name="characterId" required placeholder="Character UUID" />
            <select name="actionType" defaultValue="warning">
              <option value="warning">Warning</option>
              <option value="social_mute">Social mute</option>
              <option value="shop_restriction">Shop restriction</option>
              <option value="temporary_suspension">Temporary suspension</option>
              <option value="cash_penalty">Cash penalty</option>
            </select>
            <input name="severity" type="number" min="1" max="5" defaultValue="2" />
            <input name="durationHours" type="number" min="1" max="720" placeholder="Duration hours for temporary actions" />
            <input name="cashPenalty" type="number" min="0" placeholder="Cash penalty amount" />
            <textarea name="reason" required placeholder="Reason" />
            <button disabled={submitting} type="submit">Apply enforcement</button>
          </form>
        </article>

        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Balance adjustment</h2>
          <form onSubmit={handleAdjust} style={{ display: 'grid', gap: 8 }}>
            <input name="characterId" required placeholder="Character UUID" />
            <select name="wallet" defaultValue="cash"><option value="cash">Cash</option><option value="bank">Bank</option></select>
            <input name="amount" type="number" required placeholder="Amount, negative allowed" />
            <textarea name="reason" required placeholder="Reason" />
            <button disabled={submitting} type="submit">Adjust</button>
          </form>
        </article>
      </div>


      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Moderation transparency</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>Last {transparency.days} days, aggregated without exposing private report content.</p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <strong>Reports</strong>
            {transparency.reports.length ? transparency.reports.map((entry) => <p key={`${entry.kind}-${entry.status}`} style={{ margin: '4px 0' }}>{entry.kind} / {entry.status}: {entry.count}</p>) : <p>No reports.</p>}
          </div>
          <div>
            <strong>Enforcements</strong>
            {transparency.enforcements.length ? transparency.enforcements.map((entry) => <p key={entry.actionType} style={{ margin: '4px 0' }}>{entry.actionType}: {entry.count}</p>) : <p>No enforcements.</p>}
          </div>
          <div>
            <strong>Appeals</strong>
            {transparency.appeals.length ? transparency.appeals.map((entry) => <p key={entry.status} style={{ margin: '4px 0' }}>{entry.status}: {entry.count}</p>) : <p>No appeals.</p>}
          </div>
        </div>
      </article>

      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Moderation queue</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>
          Open reports: {moderation.messages.length + moderation.articles.length}. Review, dismiss, or action reports without touching the database directly.
        </p>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Message reports</h3>
            {moderation.messages.length ? moderation.messages.map((report) => (
              <form key={report.id} onSubmit={handleModeration} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 12 }}>
                <input name="reportId" type="hidden" value={report.id} />
                <input name="kind" type="hidden" value="message" />
                <strong>{report.senderName} reported by {report.reporterName}</strong>
                <p style={{ color: '#a1a1aa', margin: 0 }}>{formatDateTime(report.createdAt)} · {report.reason || 'No reason provided.'}</p>
                <blockquote style={{ borderLeft: '3px solid #52525b', margin: 0, paddingLeft: 12 }}>{report.messagePreview}</blockquote>
                {report.hiddenAt ? (
                  <p style={{ color: '#fbbf24', margin: 0 }}>Hidden {formatDateTime(report.hiddenAt)} · {report.hiddenReason ?? 'No reason recorded.'}</p>
                ) : null}
                {report.retentionExpiresAt ? (
                  <p style={{ color: '#a1a1aa', margin: 0 }}>Retention expiry: {formatDateTime(report.retentionExpiresAt)}</p>
                ) : null}
                <select name="status" defaultValue="reviewed">
                  <option value="reviewed">Mark reviewed</option>
                  <option value="dismissed">Dismiss</option>
                  <option value="actioned">Mark actioned</option>
                </select>
                <textarea name="note" rows={2} defaultValue="Reviewed message report." />
                <label style={{ display: 'flex', gap: 8 }}><input name="hideMessage" type="checkbox" disabled={Boolean(report.hiddenAt)} /> Hide message from player inboxes</label>
                <button disabled={submitting} type="submit">Resolve message report</button>
              </form>
            )) : <p>No open message reports.</p>}
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Article reports</h3>
            {moderation.articles.length ? moderation.articles.map((report) => (
              <form key={report.id} onSubmit={handleModeration} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 12 }}>
                <input name="reportId" type="hidden" value={report.id} />
                <input name="kind" type="hidden" value="article" />
                <strong>{report.articleTitle}</strong>
                <p style={{ color: '#a1a1aa', margin: 0 }}>
                  Author: {report.authorName ?? 'System'} · Reporter: {report.reporterName} · {formatDateTime(report.createdAt)}
                </p>
                <p style={{ margin: 0 }}>{report.reason || 'No reason provided.'}</p>
                <select name="status" defaultValue="reviewed">
                  <option value="reviewed">Mark reviewed</option>
                  <option value="dismissed">Dismiss</option>
                  <option value="actioned">Mark actioned</option>
                </select>
                <textarea name="note" rows={2} defaultValue="Reviewed article report." />
                <label style={{ display: 'flex', gap: 8 }}><input name="hideArticle" type="checkbox" /> Unpublish article</label>
                <button disabled={submitting} type="submit">Resolve article report</button>
              </form>
            )) : <p>No open article reports.</p>}
          </div>
        </div>
      </article>

      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Moderation archive</h2>
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>Recently reviewed, dismissed, and actioned reports for moderation history audits.</p>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {moderationArchive.map((bucket) => (
            <div key={bucket.status}>
              <h3 style={{ marginTop: 0 }}>{bucket.status}</h3>
              {[...bucket.messages, ...bucket.articles].slice(0, 8).map((report) => (
                <p key={`${report.kind}-${report.id}`} style={{ borderTop: '1px solid #27272a', margin: 0, paddingTop: 8 }}>
                  <strong>{report.kind}</strong> · {report.reason || 'No reason'}
                  <br />
                  <span style={{ color: '#a1a1aa' }}>{formatDateTime(report.createdAt)}</span>
                </p>
              ))}
              {bucket.messages.length + bucket.articles.length === 0 ? <p>No {bucket.status} reports.</p> : null}
            </div>
          ))}
        </div>
      </article>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Active enforcements</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {audit.activeEnforcements?.length ? audit.activeEnforcements.map((enforcement) => (
              <form key={enforcement.id} onSubmit={handleLiftEnforcement} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 12 }}>
                <input name="enforcementId" type="hidden" value={enforcement.id} />
                <strong>{enforcement.characterName} · {enforcement.actionType}</strong>
                <p style={{ margin: 0, color: '#a1a1aa' }}>Severity {enforcement.severity} · {enforcement.endsAt ? `Ends ${formatDateTime(enforcement.endsAt)}` : 'No expiry'}</p>
                <p style={{ margin: 0 }}>{enforcement.reason}</p>
                <input name="reason" defaultValue="Lifted by admin review." />
                <button disabled={submitting} type="submit">Lift enforcement</button>
              </form>
            )) : <p>No active enforcements.</p>}
          </div>
        </article>

        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Open appeals</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {audit.openAppeals?.length ? audit.openAppeals.map((appeal) => (
              <form key={appeal.id} onSubmit={handleAppealReview} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 12 }}>
                <input name="appealId" type="hidden" value={appeal.id} />
                <strong>{appeal.characterName} · {appeal.actionType}</strong>
                <p style={{ margin: 0, color: '#a1a1aa' }}>{formatDateTime(appeal.createdAt)}</p>
                <blockquote style={{ borderLeft: '3px solid #52525b', margin: 0, paddingLeft: 12 }}>{appeal.body}</blockquote>
                <select name="status" defaultValue="rejected"><option value="accepted">Accept</option><option value="rejected">Reject</option></select>
                <textarea name="note" required rows={2} defaultValue="Reviewed appeal." />
                <label style={{ display: 'flex', gap: 8 }}><input name="liftEnforcement" type="checkbox" /> Lift enforcement when accepted</label>
                <button disabled={submitting} type="submit">Review appeal</button>
              </form>
            )) : <p>No open appeals.</p>}
          </div>
        </article>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Session audit</h2>
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>Recent sessions with IP and user-agent visibility for account-abuse triage.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {audit.recentSessions?.length ? audit.recentSessions.map((session) => (
              <div key={session.id} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
                <strong>{session.email}</strong>
                <p style={{ color: '#a1a1aa', margin: '4px 0' }}>{session.displayName ?? 'No display name'} · Last seen {formatDateTime(session.lastSeenAt)}</p>
                <p style={{ margin: '4px 0' }}>IP {session.ipAddress ?? 'unknown'} · Expires {formatDateTime(session.expiresAt)}</p>
                <code style={{ display: 'block', overflowX: 'auto' }}>{session.userAgent ?? 'unknown user agent'}</code>
              </div>
            )) : <p>No recent sessions.</p>}
          </div>
        </article>

        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Inventory audit</h2>
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>Highest current item quantities for spotting suspicious inventory spikes.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {audit.inventoryHighlights?.length ? audit.inventoryHighlights.map((item) => (
              <div key={item.id} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
                <strong>{item.characterName}</strong> · {item.itemKey}
                <p style={{ color: '#a1a1aa', margin: '4px 0' }}>Quantity {item.quantity} · Updated {formatDateTime(item.updatedAt)}</p>
                <code style={{ display: 'block', overflowX: 'auto' }}>{item.characterId}</code>
              </div>
            )) : <p>No inventory rows found.</p>}
          </div>
        </article>
      </div>

      <article className="admin-card">
        <h2 style={{ marginTop: 0 }}>Current config</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {config.map((entry) => (
            <div key={entry.key} style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
              <strong>{entry.key}</strong> · {entry.category} · {entry.isPublic ? 'public' : 'private'}
              <pre style={{ overflowX: 'auto' }}>{JSON.stringify(entry.value, null, 2)}</pre>
            </div>
          ))}
        </div>
      </article>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Active flags</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {audit.activeFlags.length ? audit.activeFlags.map((flag) => (
              <form key={flag.id} onSubmit={handleResolveFlag} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 12 }}>
                <input name="flagId" type="hidden" value={flag.id} />
                <strong>{flag.flagType}</strong> · severity {flag.severity}
                <p style={{ margin: '4px 0', color: '#a1a1aa' }}>{flag.characterId}</p>
                <p style={{ margin: 0 }}>{flag.reason}</p>
                <input name="reason" defaultValue="Resolved after moderation review." />
                <button disabled={submitting} type="submit">Resolve flag</button>
              </form>
            )) : <p>No active flags.</p>}
          </div>
        </article>

        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Admin audit log</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {audit.adminLogs.length ? audit.adminLogs.map((entry) => (
              <div key={entry.id}>
                <strong>{entry.actionType}</strong>
                <p style={{ margin: '4px 0' }}>{entry.summary}</p>
                <span style={{ color: '#a1a1aa' }}>{formatDateTime(entry.createdAt)}</span>
              </div>
            )) : <p>No admin actions yet.</p>}
          </div>
        </article>

        <article className="admin-card">
          <h2 style={{ marginTop: 0 }}>Announcements</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {announcements.length ? announcements.map((announcement) => (
              <div key={announcement.id}>
                <strong>{announcement.title}</strong> · {announcement.status} · {announcement.severity}
                <p style={{ margin: '4px 0' }}>{announcement.body}</p>
              </div>
            )) : <p>No announcements yet.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}
