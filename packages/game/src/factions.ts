export const factionRoleRank = {
  recruit: 1,
  runner: 2,
  soldier: 3,
  lieutenant: 4,
  captain: 5,
  underboss: 6,
  boss: 7,
} as const;

export type FactionRole = keyof typeof factionRoleRank;
export type TerritoryAction = 'scout' | 'claim' | 'reinforce' | 'attack';

export function canManageFaction(role: FactionRole) {
  return factionRoleRank[role] >= factionRoleRank.captain;
}

export function canWithdrawFactionFunds(role: FactionRole) {
  return factionRoleRank[role] >= factionRoleRank.underboss;
}

export function canManageFactionArmory(role: FactionRole) {
  return factionRoleRank[role] >= factionRoleRank.lieutenant;
}

export function canSetFactionRole(actorRole: FactionRole, targetRole: FactionRole) {
  if (actorRole !== 'boss') {
    return false;
  }

  return targetRole !== 'boss';
}

export function calculateTerritoryAction(input: {
  action: TerritoryAction;
  strength: number;
  defense: number;
  dexterity: number;
  intelligence: number;
  cash: number;
  territoryDefense: number;
  controlledByOwnFaction: boolean;
  isUncontrolled: boolean;
}) {
  const base = Math.max(
    1,
    Math.floor((input.strength + input.defense + input.dexterity + input.intelligence) / 4),
  );
  const actionConfig = {
    scout: { cashCost: 25, cooldownSeconds: 120, scoreDelta: 0, powerMultiplier: 0.5 },
    claim: { cashCost: 150, cooldownSeconds: 600, scoreDelta: 6, powerMultiplier: 1 },
    reinforce: { cashCost: 100, cooldownSeconds: 300, scoreDelta: 4, powerMultiplier: 1.25 },
    attack: { cashCost: 200, cooldownSeconds: 900, scoreDelta: -6, powerMultiplier: 1.5 },
  }[input.action];

  const power = Math.max(1, Math.floor(base * actionConfig.powerMultiplier));
  const effectiveScoreDelta =
    input.action === 'attack' ? -(power + input.territoryDefense) : actionConfig.scoreDelta + power;

  return {
    cashCost: actionConfig.cashCost,
    cooldownSeconds: actionConfig.cooldownSeconds,
    power,
    scoreDelta: effectiveScoreDelta,
    canAttempt:
      input.cash >= actionConfig.cashCost &&
      (input.action !== 'reinforce' || input.controlledByOwnFaction) &&
      (input.action !== 'claim' || input.isUncontrolled) &&
      (input.action !== 'attack' || !input.controlledByOwnFaction),
  };
}

export type FactionInventoryAction = 'deposit' | 'withdraw';

export function calculateFactionInventoryAction(input: {
  action: FactionInventoryAction;
  role: FactionRole;
  quantity: number;
  availableQuantity: number;
}) {
  const quantity = Math.max(1, Math.floor(input.quantity));
  const availableQuantity = Math.max(0, Math.floor(input.availableQuantity));
  const requiresArmoryAccess = input.action === 'withdraw';
  const hasPermission = !requiresArmoryAccess || canManageFactionArmory(input.role);
  const contributionPoints = input.action === 'deposit' ? quantity : 0;

  return {
    quantity,
    cooldownSeconds: input.action === 'deposit' ? 20 : 45,
    contributionPoints,
    hasPermission,
    canAttempt: hasPermission && availableQuantity >= quantity,
  };
}
