'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GAME_NAV_GROUPS,
  resolveActiveGameHref,
  type GameNavGroup,
} from '@/features/game/game-navigation';
import { formatMoney } from '@/lib/format';

export type GameSidebarCharacter = {
  name: string;
  status: string;
  location: string;
  cash: number;
  bank: number;
  level: number;
  health: number;
  energy: number;
  maxEnergy: number;
  nerve: number;
  maxNerve: number;
  heat: number;
} | null;

function SidebarProgress({ label, value, max }: { label: string; value: number; max: number }) {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(Math.max(value, 0), safeMax);

  return (
    <div className="sidebar-progress">
      <div className="sidebar-progress__header">
        <span>{label}</span>
        <strong>
          {safeValue}/{safeMax}
        </strong>
      </div>
      <progress
        value={safeValue}
        max={safeMax}
        aria-label={`${label} ${safeValue} of ${safeMax}`}
      />
    </div>
  );
}

function NavDropdown({
  group,
  activeHref,
}: {
  group: GameNavGroup;
  activeHref?: string;
}) {
  const isGroupActive = group.items.some((item) => item.href === activeHref);
  const [isOpen, setIsOpen] = useState(isGroupActive);
  const contentId = `game-navigation-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  useEffect(() => {
    if (isGroupActive) {
      setIsOpen(true);
    }
  }, [isGroupActive]);

  return (
    <div className="game-sidebar__nav-dropdown">
      <button
        type="button"
        className={`dropdown-trigger${isOpen ? ' dropdown-trigger--open' : ''}${
          isGroupActive ? ' dropdown-trigger--active' : ''
        }`}
        onClick={() => setIsOpen((current) => !current)}
        aria-controls={contentId}
        aria-expanded={isOpen}
      >
        <span className="nav-dropdown__label">
          <span className="game-sidebar__icon" aria-hidden="true">
            {group.icon}
          </span>
          <span>{group.label}</span>
        </span>
        <span className="dropdown-arrow" aria-hidden="true">
          ▼
        </span>
      </button>
      <div className="dropdown-content" hidden={!isOpen} id={contentId}>
        {group.items.map((item) => {
          const active = item.href === activeHref;

          return (
            <Link
              key={item.href}
              className={`dropdown-item game-sidebar__link${
                active ? ' game-sidebar__link--active dropdown-item--active' : ''
              }`}
              href={item.href}
              aria-current={active ? 'page' : undefined}
            >
              <span className="game-sidebar__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function GameSideMenu({ character }: { character?: GameSidebarCharacter }) {
  const pathname = usePathname();
  const activeHref = useMemo(() => resolveActiveGameHref(pathname), [pathname]);

  const quickStats = character
    ? [
        { label: 'Level', value: character.level },
        { label: 'Cash', value: formatMoney(character.cash) },
        { label: 'Bank', value: formatMoney(character.bank) },
        { label: 'Area', value: character.location },
      ]
    : [];

  return (
    <aside className="game-sidebar" aria-label="Game navigation and character stats">
      <Link
        className="game-brand game-sidebar__brand"
        href="/dashboard"
        aria-label="DrugDeal Game dashboard"
      >
        <span className="game-brand__mark" aria-hidden="true">
          D
        </span>
        <span className="game-brand__text">
          <span className="game-brand__name">DrugDeal</span>
          <span className="game-brand__sub">Persistent world</span>
        </span>
      </Link>

      <section className="game-sidebar__stats" aria-labelledby="sidebar-stats-title">
        <div className="game-sidebar__stats-header">
          <p className="eyebrow" id="sidebar-stats-title">
            Active character
          </p>
          {character ? <strong>{character.name}</strong> : <strong>No character</strong>}
          {character ? (
            <span>{character.status}</span>
          ) : (
            <span>Create one from the dashboard.</span>
          )}
        </div>
        {character ? (
          <div className="game-sidebar__progress-list">
            <SidebarProgress label="HP" value={character.health} max={100} />
            <SidebarProgress label="Energy" value={character.energy} max={character.maxEnergy} />
            <SidebarProgress label="Nerve" value={character.nerve} max={character.maxNerve} />
            <SidebarProgress label="Heat" value={character.heat} max={100} />
          </div>
        ) : null}
        {quickStats.length ? (
          <dl className="game-sidebar__stat-grid">
            {quickStats.map((item) => (
              <div key={item.label} className="game-sidebar__stat">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <nav className="game-sidebar__nav" aria-label="Game pages">
        {GAME_NAV_GROUPS.map((group) => (
          <NavDropdown key={group.label} group={group} activeHref={activeHref} />
        ))}
      </nav>
    </aside>
  );
}
