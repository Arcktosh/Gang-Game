'use client';

import { FormEvent, useState } from 'react';
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

type AdminPanelProps = {
  config: ConfigEntry[];
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

export function AdminPanel({ config, audit, announcements, moderation, moderationArchive, transparency, loanExposure }: AdminPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminCharacterSearchResult[]>([]);

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

    await runAdminAction(
      `/api/admin/moderation/reports/${reportId}`,
      'POST',
      { kind, status, note, hideArticle },
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
                <select name="status" defaultValue="reviewed">
                  <option value="reviewed">Mark reviewed</option>
                  <option value="dismissed">Dismiss</option>
                  <option value="actioned">Mark actioned</option>
                </select>
                <textarea name="note" rows={2} defaultValue="Reviewed message report." />
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
