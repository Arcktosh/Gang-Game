import { getModerationTransparencySummary, listAdminAnnouncements, listAdminAudit, listAdminEconomyAudit, listAdminInventoryAudit, listAdminLoanExposure, listAdminRollbackCandidates, listAdminSessionAudit, listFeatureFlagStates, listGameConfig, listModerationQueue, listOperationalAnomalies } from '@drugdeal/db';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/features/auth/logout-button';
import { AdminPanel } from '@/features/admin/admin-panel';
import { hasAdminCapability } from '@/lib/admin-access';
import { getCurrentSession } from '@/lib/server-session';

export default async function AdminPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  if (!hasAdminCapability(session.user, 'view_admin')) {
    redirect('/dashboard');
  }

  const [config, featureFlags, audit, announcements, moderation, moderationArchive, transparency, loanExposure, anomalies, economyAudit, inventoryAudit, sessionAudit, rollbackCandidates] = await Promise.all([
    listGameConfig({ includePrivate: true }),
    listFeatureFlagStates(),
    listAdminAudit(50),
    listAdminAnnouncements(25),
    listModerationQueue({ status: 'open', limit: 50 }),
    Promise.all([
      listModerationQueue({ status: 'reviewed', limit: 25 }),
      listModerationQueue({ status: 'dismissed', limit: 25 }),
      listModerationQueue({ status: 'actioned', limit: 25 }),
    ]),
    getModerationTransparencySummary({ days: 30 }),
    listAdminLoanExposure({ status: 'all', limit: 12 }),
    listOperationalAnomalies({ status: 'open', limit: 25 }),
    listAdminEconomyAudit({ limit: 12, days: 30 }),
    listAdminInventoryAudit({ limit: 12 }),
    listAdminSessionAudit({ limit: 12, days: 30 }),
    listAdminRollbackCandidates({ limit: 12 }),
  ]);

  return (
    <main className="admin-page" aria-labelledby="admin-title">
      <header className="admin-page__header">
        <div className="admin-page__title-row">
          <div>
            <p className="eyebrow">Admin · {session.user.email}</p>
            <h1 id="admin-title">Operations Console</h1>
            <p className="lead">Manage configuration, announcements, moderation, enforcement, audit activity, and player support tooling.</p>
          </div>
          <div className="admin-page__actions">
            <a className="button-link" href="/dashboard">Dashboard</a>
            <LogoutButton />
          </div>
        </div>
      </header>
      <AdminPanel config={config} featureFlags={featureFlags} audit={audit} announcements={announcements} moderation={moderation} moderationArchive={moderationArchive} transparency={transparency} loanExposure={loanExposure} anomalies={anomalies} auditWorkbench={{ economy: economyAudit, inventory: inventoryAudit, sessions: sessionAudit }} rollbackCandidates={rollbackCandidates} />
    </main>
  );
}
