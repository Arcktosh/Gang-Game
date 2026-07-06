export type ContractType = 'delivery' | 'protection' | 'collection' | 'bounty' | 'faction_task';

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
  const typeRisk = input.type === 'bounty' ? 4 : input.type === 'collection' ? 3 : input.type === 'delivery' ? 2 : 1;
  return Math.max(1, Math.min(10, typeRisk + Math.floor(input.reward / 1000) + Math.floor((input.quantity ?? 0) / 10)));
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
