import {
  getModerationTransparencySummary,
  listAdminAnnouncements,
  listAdminAudit,
  listAdminLoanExposure,
  listGameConfig,
  listModerationQueue,
} from '@drugdeal/db';
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

  const [config, audit, announcements, moderation, moderationArchive, transparency, loanExposure] =
    await Promise.all([
      listGameConfig({ includePrivate: true }),
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
    ]);

  return (
    <main className="admin-page" aria-labelledby="admin-title">
      <header className="admin-page__header">
        <div className="admin-page__title-row">
          <div>
            <p className="eyebrow">Admin · {session.user.email}</p>
            <h1 id="admin-title">Operations Console</h1>
            <p className="lead">
              Manage configuration, announcements, moderation, enforcement, audit activity, and
              player support tooling.
            </p>
          </div>
          <div className="admin-page__actions">
            <a className="button-link" href="/dashboard">
              Dashboard
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>
      <AdminPanel
        config={config}
        audit={audit}
        announcements={announcements}
        moderation={moderation}
        moderationArchive={moderationArchive}
        transparency={transparency}
        loanExposure={loanExposure}
      />
    </main>
  );
}
