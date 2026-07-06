import type { CSSProperties, ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { listCharactersForUser } from '@drugdeal/db';
import {
  GameSideMenu,
  type GameSectionLink,
  type GameSidebarCharacter,
} from '@/features/game/game-side-menu';
import { formatDateTime, formatMoney } from '@/lib/format';
import { getCurrentSession } from '@/lib/server-session';

export type ActiveGameContext = {
  session: NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>;
  character: Awaited<ReturnType<typeof listCharactersForUser>>[number];
};

export async function getActiveGameContext(): Promise<ActiveGameContext> {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  const characters = await listCharactersForUser(session.user.id);
  const character = characters[0];

  if (!character) {
    redirect('/dashboard');
  }

  return { session, character };
}

export function GamePageShell({
  title,
  eyebrow,
  description,
  children,
  actions,
  sidebarCharacter,
  sectionItems,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  sidebarCharacter?: GameSidebarCharacter;
  sectionItems?: readonly GameSectionLink[];
}) {
  return (
    <div className="game-layout">
      <GameSideMenu character={sidebarCharacter} sectionItems={sectionItems} />
      <main className="game-page" aria-labelledby="game-page-title">
        <header className="game-page__header">
          <div className="game-page__title-row">
            <div>
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              <h1 id="game-page-title">{title}</h1>
              {description ? <p className="lead">{description}</p> : null}
            </div>
            {actions ? <div className="game-page__actions">{actions}</div> : null}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export type ActionCooldown = {
  lockedUntil: string | Date;
  message?: string;
} | null;

export type ActiveActionLock = {
  actionType: string;
  lockedUntil: string | Date;
  metadata?: unknown;
};

export function getActionCooldown(
  locks: readonly ActiveActionLock[] | null | undefined,
  actionType: string,
): ActionCooldown {
  const lock = locks?.find((item) => item.actionType === actionType);

  if (!lock) {
    return null;
  }

  return {
    lockedUntil: lock.lockedUntil,
    message: `Cooldown active until ${formatDateTime(lock.lockedUntil)}.`,
  };
}

export function Card({
  title,
  children,
  meta,
}: {
  title?: string;
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <section className="card">
      {title || meta ? (
        <header className="card__header">
          {title ? <h2 className="card__title">{title}</h2> : <span />}
          {meta ? <div className="card__meta">{meta}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Grid({ children, min = 260 }: { children: ReactNode; min?: number }) {
  return (
    <div className="grid" style={{ '--grid-min': `${min}px` } as CSSProperties}>
      {children}
    </div>
  );
}

export function StatList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="stat-list">
      {items.map((item) => (
        <div className="stat-list__item" key={item.label}>
          <dt className="stat-list__label">{item.label}</dt>
          <dd className="stat-list__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

export function formatDate(value?: string | Date | null) {
  return formatDateTime(value);
}

export function money(value: number | string | null | undefined) {
  return formatMoney(value);
}
