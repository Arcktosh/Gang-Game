import { type FactionRole, factionRoleRank } from './factions';

export type ContractType = 'delivery' | 'protection' | 'collection' | 'bounty' | 'faction_task';
export type ContractScope = 'public' | 'private_assignment' | 'faction';

export function calculateContractPostingFee(reward: number) {
  return Math.max(10, Math.ceil(reward * 0.03));
}

export function calculateContractEscrow(reward: number) {
  return Math.max(0, Math.floor(reward));
}

export function calculateContractCooldownSeconds(reward: number) {
  if (reward >= 5000) return 60;
  if (reward >= 1000) return 30;
  return 10;
}

export function calculateContractRisk(input: { reward: number; quantity?: number; type: ContractType }) {
  const typeRisk = input.type === 'bounty' ? 4 : input.type === 'collection' ? 3 : input.type === 'delivery' ? 2 : input.type === 'faction_task' ? 2 : 1;
  return Math.max(1, Math.min(10, typeRisk + Math.floor(input.reward / 1000) + Math.floor((input.quantity ?? 0) / 10)));
}

export function getContractScope(input: { factionId?: string | null; assignedToCharacterId?: string | null }): ContractScope {
  if (input.factionId) return 'faction';
  if (input.assignedToCharacterId) return 'private_assignment';
  return 'public';
}

export function canCreateFactionContract(role: FactionRole) {
  return factionRoleRank[role] >= factionRoleRank.lieutenant;
}

export function describeContractScope(input: { factionId?: string | null; assignedToCharacterId?: string | null }) {
  const scope = getContractScope(input);

  if (scope === 'faction') {
    return 'Faction-only task';
  }

  if (scope === 'private_assignment') {
    return 'Private assignment';
  }

  return 'Public board';
}

export function canAcceptScopedContract(input: {
  creatorCharacterId: string;
  characterId: string;
  factionId?: string | null;
  assignedToCharacterId?: string | null;
  characterFactionId?: string | null;
}) {
  if (input.creatorCharacterId === input.characterId) {
    return { ok: false as const, message: 'You cannot accept your own contract.' };
  }

  if (input.assignedToCharacterId && input.assignedToCharacterId !== input.characterId) {
    return { ok: false as const, message: 'This contract is assigned to another character.' };
  }

  if (input.factionId && input.characterFactionId !== input.factionId) {
    return { ok: false as const, message: 'This contract is only visible to members of the sponsoring faction.' };
  }

  return { ok: true as const };
}

export function canCompleteContract(input: {
  contractType: ContractType;
  characterLocation: string;
  targetLocation?: string | null;
  itemKey?: string | null;
  requiredQuantity?: number | null;
  inventoryQuantity?: number;
}) {
  if (input.targetLocation && input.characterLocation !== input.targetLocation) {
    return { ok: false as const, message: `Travel to ${input.targetLocation} to complete this contract.` };
  }

  if (input.contractType === 'delivery' && input.itemKey) {
    const requiredQuantity = Math.max(1, input.requiredQuantity ?? 1);
    if ((input.inventoryQuantity ?? 0) < requiredQuantity) {
      return { ok: false as const, message: `You need ${requiredQuantity}x ${input.itemKey} to complete this delivery.` };
    }
  }

  return { ok: true as const };
}
