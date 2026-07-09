export type NotificationCategory =
  | 'system'
  | 'combat'
  | 'economy'
  | 'contract'
  | 'faction'
  | 'travel'
  | 'crew'
  | 'crafting'
  | 'market'
  | 'season'
  | 'admin';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

const EVENT_CATEGORY_MAP: Record<string, NotificationCategory> = {
  travel_completed: 'travel',
  hospital_released: 'system',
  jail_released: 'system',
  crime_committed: 'combat',
  crime_failed: 'combat',
  combat_attack: 'combat',
  bounty_claimed: 'combat',
  faction_war_declared: 'faction',
  faction_war_resolved: 'faction',
  shop_sale_completed: 'economy',
  market_trade_completed: 'market',
  contract_posted: 'contract',
  contract_accepted: 'contract',
  contract_completed: 'contract',
  crafting_completed: 'crafting',
  contact_assignment_completed: 'crew',
  contact_assignment_failed: 'crew',
  season_reward_claimed: 'season',
  prestige_completed: 'season',
};

const HIGH_PRIORITY_EVENTS = new Set([
  'combat_attack',
  'bounty_claimed',
  'faction_war_declared',
  'faction_war_resolved',
  'jail_released',
  'hospital_released',
]);
const URGENT_PRIORITY_EVENTS = new Set(['character_flagged', 'account_warning']);

export function categoryForEventType(type: string): NotificationCategory {
  return EVENT_CATEGORY_MAP[type] ?? 'system';
}

export function priorityForEventType(type: string): NotificationPriority {
  if (URGENT_PRIORITY_EVENTS.has(type)) return 'urgent';
  if (HIGH_PRIORITY_EVENTS.has(type)) return 'high';
  return 'normal';
}

export function titleForEventType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function bodyForEvent(type: string, payload: Record<string, unknown> = {}) {
  if (type === 'travel_completed')
    return `Arrived at ${String(payload.toLocation ?? 'your destination')}.`;
  if (type === 'hospital_released') return 'You have recovered enough to leave hospital.';
  if (type === 'jail_released') return 'Your sentence is complete and you are free again.';
  if (type === 'contract_completed')
    return `A contract was completed${payload.reward ? ` for $${payload.reward}` : ''}.`;
  if (type === 'contact_assignment_completed')
    return `A crew assignment finished${payload.rewardCash ? ` and earned $${payload.rewardCash}` : ''}.`;
  if (type === 'contact_assignment_failed')
    return 'A crew assignment failed. Check your contacts before assigning more work.';
  if (type === 'crafting_completed')
    return 'A crafting job completed and its output was added to inventory.';
  if (type === 'shop_sale_completed')
    return `A shop sale was completed${payload.netPayout ? ` with $${payload.netPayout} payout` : ''}.`;
  if (type === 'bounty_claimed') return 'A bounty was claimed after a successful attack.';
  if (type === 'faction_war_declared') return 'A faction war has been declared.';
  if (type === 'faction_war_resolved') return 'A faction war has ended and scores were resolved.';
  return 'A new event was recorded for your character.';
}

export function shouldNotifyForEventType(type: string) {
  return !type.startsWith('admin_audit_');
}

export function buildNotificationDigestSummary(unreadCount: number, notificationCount: number) {
  if (notificationCount === 0) return 'No new activity.';
  if (unreadCount === 0) return `${notificationCount} recent notifications, all read.`;
  return `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} from ${notificationCount} recent update${notificationCount === 1 ? '' : 's'}.`;
}
