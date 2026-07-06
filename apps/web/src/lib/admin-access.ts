import { NextRequest } from 'next/server';
import { jsonError } from './api';
import { getSessionFromRequest } from './auth';

type SessionUser = {
  id: string;
  email: string;
  displayName?: string | null;
  isAdmin?: boolean;
  adminRole?: AdminRole | null;
};

export const adminRoles = ['none', 'support', 'moderator', 'economy_manager', 'game_master', 'owner'] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminCapabilities = [
  'view_admin',
  'search_players',
  'manage_config',
  'manage_announcements',
  'moderate_content',
  'enforce_players',
  'manage_economy',
] as const;
export type AdminCapability = (typeof adminCapabilities)[number];

export const adminRoleCapabilities: Record<AdminRole, readonly AdminCapability[]> = {
  none: [],
  support: ['view_admin', 'search_players'],
  moderator: ['view_admin', 'search_players', 'moderate_content'],
  economy_manager: ['view_admin', 'search_players', 'manage_economy'],
  game_master: ['view_admin', 'search_players', 'manage_announcements', 'moderate_content', 'enforce_players', 'manage_economy'],
  owner: ['view_admin', 'search_players', 'manage_config', 'manage_announcements', 'moderate_content', 'enforce_players', 'manage_economy'],
};

export function normalizeAdminRole(value: string | null | undefined): AdminRole {
  return adminRoles.includes(value as AdminRole) ? (value as AdminRole) : 'none';
}

export function getEffectiveAdminRole(user: SessionUser): AdminRole {
  const explicitRole = normalizeAdminRole(user.adminRole);

  if (explicitRole !== 'none') {
    return explicitRole;
  }

  return user.isAdmin ? 'owner' : 'none';
}

export function hasAdminCapability(user: SessionUser, capability: AdminCapability) {
  const role = getEffectiveAdminRole(user);
  return adminRoleCapabilities[role].includes(capability);
}

export async function requireAdminCapability(request: NextRequest, capability: AdminCapability) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return { ok: false as const, response: jsonError('unauthorized', 'Login required.', 401) };
  }

  if (!hasAdminCapability(session.user, capability)) {
    return { ok: false as const, response: jsonError('forbidden', 'Admin capability required.', 403, { capability }) };
  }

  return {
    ok: true as const,
    session,
    role: getEffectiveAdminRole(session.user),
    capabilities: adminRoleCapabilities[getEffectiveAdminRole(session.user)],
  };
}
