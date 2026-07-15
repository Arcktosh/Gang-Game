export type GameNavItem = {
  label: string;
  href: string;
  icon: string;
};

export type GameNavGroup = {
  label: string;
  icon: string;
  items: readonly GameNavItem[];
};

export const GAME_NAV_GROUPS: readonly GameNavGroup[] = [
  {
    label: 'Overview',
    icon: '⬢',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '▣' },
      { label: 'Activity center', href: '/dashboard/activity', icon: '◫' },
    ],
  },
  {
    label: 'Character',
    icon: '◉',
    items: [
      { label: 'Profile overview', href: '/profile', icon: '◉' },
      { label: 'Status', href: '/profile/status', icon: '⚖' },
      { label: 'Progression center', href: '/dashboard/progression', icon: '▤' },
      { label: 'Achievements', href: '/profile/achievements', icon: '◇' },
      { label: 'Rewards', href: '/profile/rewards', icon: '◆' },
      { label: 'Titles', href: '/profile/titles', icon: '♛' },
      { label: 'History', href: '/profile/history', icon: '◫' },
    ],
  },
  {
    label: 'Actions',
    icon: '⚑',
    items: [
      { label: 'Action center', href: '/dashboard/actions', icon: '▤' },
      { label: 'Jobs', href: '/jobs', icon: '▥' },
      { label: 'Crimes', href: '/crimes', icon: '⚑' },
      { label: 'Legal & recovery', href: '/legal', icon: '⚖' },
    ],
  },
  {
    label: 'Economy',
    icon: '↕',
    items: [
      { label: 'Economy center', href: '/dashboard/economy', icon: '↕' },
      { label: 'Market', href: '/market', icon: '◇' },
      { label: 'Shops', href: '/shops', icon: '▦' },
      { label: 'Trades', href: '/trades', icon: '⇆' },
      { label: 'Contracts', href: '/contracts', icon: '▥' },
    ],
  },
  {
    label: 'Inventory',
    icon: '◈',
    items: [
      { label: 'Inventory summary', href: '/inventory', icon: '▣' },
      { label: 'Inventory items', href: '/inventory/items', icon: '◈' },
      { label: 'Item transfers', href: '/inventory/transfers', icon: '⇄' },
    ],
  },
  {
    label: 'Community',
    icon: '✉',
    items: [
      { label: 'Message overview', href: '/dashboard/messages', icon: '✉' },
      { label: 'Message threads', href: '/messages', icon: '▤' },
      { label: 'Crew center', href: '/dashboard/crew', icon: '⬢' },
      { label: 'Factions', href: '/factions', icon: '◆' },
    ],
  },
  {
    label: 'World',
    icon: '◇',
    items: [
      { label: 'News center', href: '/dashboard/news', icon: '◇' },
      { label: 'Newspaper', href: '/newspaper', icon: '◫' },
    ],
  },
] as const;

export function resolveActiveGameHref(pathname: string) {
  return GAME_NAV_GROUPS.flatMap((group) => group.items)
    .map((item) => item.href)
    .sort((left, right) => right.length - left.length)
    .find((href) => pathname === href || pathname.startsWith(`${href}/`));
}
