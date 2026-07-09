export type CombatOutcome = 'attacker_win' | 'defender_win' | 'draw' | 'fled';

export function calculateCombatPower(input: {
  strength: number;
  stamina: number;
  defense: number;
  dexterity: number;
  level: number;
  health: number;
  heat?: number;
  equipment?: { strength?: number; stamina?: number; defense?: number; dexterity?: number };
}) {
  const strength = input.strength + (input.equipment?.strength ?? 0);
  const stamina = input.stamina + (input.equipment?.stamina ?? 0);
  const defense = input.defense + (input.equipment?.defense ?? 0);
  const dexterity = input.dexterity + (input.equipment?.dexterity ?? 0);
  const statScore = strength * 3 + dexterity * 2 + stamina * 2 + defense * 2 + input.level * 4;
  const healthModifier = Math.max(0.25, Math.min(1, input.health / 100));
  const heatPenalty = Math.floor((input.heat ?? 0) / 25);
  return Math.max(1, Math.floor(statScore * healthModifier) - heatPenalty);
}

export function resolveCombat(input: {
  attackerPower: number;
  defenderPower: number;
  attackerCash: number;
  defenderCash: number;
  attackerDexterity: number;
  defenderDexterity: number;
}) {
  const spread = input.attackerPower - input.defenderPower;
  const attackerEdge = spread + Math.floor((input.attackerDexterity - input.defenderDexterity) / 2);
  const outcome: CombatOutcome =
    attackerEdge >= 8 ? 'attacker_win' : attackerEdge <= -8 ? 'defender_win' : 'draw';
  const damageToDefender =
    outcome === 'attacker_win'
      ? Math.max(6, 14 + Math.floor(attackerEdge / 3))
      : Math.max(2, 6 + Math.floor(Math.max(0, attackerEdge) / 4));
  const damageToAttacker =
    outcome === 'defender_win'
      ? Math.max(6, 14 + Math.floor(Math.abs(attackerEdge) / 3))
      : Math.max(2, 6 + Math.floor(Math.max(0, -attackerEdge) / 4));
  const cashStolen =
    outcome === 'attacker_win' ? Math.min(Math.floor(input.defenderCash * 0.08), 2500) : 0;
  const experienceAwarded =
    outcome === 'attacker_win'
      ? 15 + Math.max(0, input.defenderPower - input.attackerPower)
      : outcome === 'draw'
        ? 5
        : 2;
  const heatGain = outcome === 'attacker_win' ? 8 : 5;

  return {
    outcome,
    damageToAttacker,
    damageToDefender,
    cashStolen,
    experienceAwarded,
    heatGain,
    cooldownSeconds: outcome === 'attacker_win' ? 300 : 420,
  };
}

export function calculateBountyPosting(input: { reward: number }) {
  const reward = Math.max(100, Math.floor(input.reward));
  const postingFee = Math.max(10, Math.ceil(reward * 0.1));
  return { reward, postingFee, totalCost: reward + postingFee };
}

export function calculateWarDurationHours(input: { attackerPower: number; defenderPower: number }) {
  const pressure = Math.max(0, input.attackerPower - input.defenderPower);
  return Math.max(6, Math.min(48, 24 - Math.floor(pressure / 25)));
}

export function calculateWarScoreDelta(input: {
  outcome: CombatOutcome;
  attackerPower: number;
  defenderPower: number;
}) {
  if (input.outcome === 'attacker_win') {
    return Math.max(3, 8 + Math.floor((input.attackerPower - input.defenderPower) / 8));
  }

  if (input.outcome === 'defender_win') {
    return -Math.max(3, 8 + Math.floor((input.defenderPower - input.attackerPower) / 8));
  }

  return 1;
}
