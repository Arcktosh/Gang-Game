'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

export type GameSectionLink = {
  label: string;
  href: string;
  icon: string;
};

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '▣' },
  { label: 'Profile', href: '/profile', icon: '◉' },
  { label: 'Jobs', href: '/jobs', icon: '▤' },
  { label: 'Crimes', href: '/crimes', icon: '⚑' },
  { label: 'Legal', href: '/legal', icon: '⚖' },
  { label: 'Market', href: '/market', icon: '↕' },
  { label: 'Shops', href: '/shops', icon: '◈' },
  { label: 'Messages', href: '/messages', icon: '✉' },
  { label: 'Newspaper', href: '/newspaper', icon: '◫' },
  { label: 'Factions', href: '/factions', icon: '⬢' },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkPath(href: string) {
  return href.split('#')[0] || href;
}

function linkHash(href: string) {
  const hash = href.split('#')[1];
  return hash ? `#${hash}` : '';
}

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

export function GameSideMenu({
  character,
  sectionItems = [],
}: {
  character?: GameSidebarCharacter;
  sectionItems?: readonly GameSectionLink[];
}) {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState('');

  function handleSamePageSectionClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    const hrefPath = linkPath(href);
    const hrefHash = linkHash(href);

    if (!hrefHash || !isActivePath(pathname, hrefPath)) {
      return;
    }

    event.preventDefault();
    setActiveHash(hrefHash);
    window.history.pushState(null, '', hrefHash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.requestAnimationFrame(() => {
      document.getElementById(hrefHash.slice(1))?.scrollIntoView({ block: 'start' });
    });
  }

  useEffect(() => {
    function updateHash() {
      setActiveHash(window.location.hash);
    }

    updateHash();
    window.addEventListener('hashchange', updateHash);

    return () => window.removeEventListener('hashchange', updateHash);
  }, [pathname]);

  const quickStats = character
    ? [
        { label: 'Level', value: character.level },
        { label: 'Cash', value: formatMoney(character.cash) },
        { label: 'Bank', value: formatMoney(character.bank) },
        { label: 'HP', value: character.health },
        { label: 'Energy', value: `${character.energy}/${character.maxEnergy}` },
        { label: 'Nerve', value: `${character.nerve}/${character.maxNerve}` },
        { label: 'Heat', value: character.heat },
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
        {menuItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const nestedSections = sectionItems.filter(
            (section) => linkPath(section.href) === item.href,
          );

          return (
            <div key={item.href} className="game-sidebar__nav-group">
              <Link
                className={`game-sidebar__link${active ? ' game-sidebar__link--active' : ''}`}
                href={item.href}
                aria-current={active ? 'page' : undefined}
              >
                <span className="game-sidebar__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>

              {nestedSections.length ? (
                <div
                  className="game-sidebar__nested-sections"
                  role="group"
                  aria-label={`${item.label} sections`}
                >
                  {nestedSections.map((section, index) => {
                    const hrefPath = linkPath(section.href);
                    const hrefHash = linkHash(section.href);
                    const sectionActive =
                      isActivePath(pathname, hrefPath) &&
                      (activeHash ? activeHash === hrefHash : index === 0);

                    const sectionClass = `game-sidebar__link game-sidebar__link--section${
                      sectionActive ? ' game-sidebar__link--active' : ''
                    }`;

                    return (
                      <a
                        key={section.href}
                        className={sectionClass}
                        href={section.href}
                        aria-current={sectionActive ? 'location' : undefined}
                        onClick={(event) => handleSamePageSectionClick(event, section.href)}
                      >
                        <span className="game-sidebar__icon" aria-hidden="true">
                          {section.icon}
                        </span>
                        <span>{section.label}</span>
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
