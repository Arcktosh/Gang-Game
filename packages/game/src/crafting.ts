export type CraftingRecipeType = 'craft' | 'modify' | 'repair' | 'dismantle';
export type WorkshopType = 'garage' | 'lab' | 'electronics' | 'clinic' | 'forge' | 'tailor';

export type CraftingInputs = Record<string, number>;

export type CraftingRecipeLike = {
  recipeType: CraftingRecipeType;
  requiredLevel: number;
  requiredIntelligence: number;
  requiredLabour: number;
  energyCost: number;
  cashCost: number;
  durationSeconds: number;
  risk: number;
  inputs: unknown;
};

export type CraftingCharacterLike = {
  level: number;
  intelligence: number;
  labour: number;
  energy: number;
  cash: number;
  heat?: number;
};

export type WorkshopLike = {
  level: number;
  condition: number;
  isHidden: boolean;
};

export function normalizeCraftingInputs(inputs: unknown): CraftingInputs {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    return {};
  }

  const normalizedEntries: Array<[string, number]> = Object.entries(inputs as Record<string, unknown>)
    .map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))] as [string, number])
    .filter(([, value]) => value > 0);

  return Object.fromEntries(normalizedEntries);
}

export function calculateWorkshopBuildCost(workshopType: WorkshopType, existingWorkshopCount: number) {
  const baseByType: Record<WorkshopType, number> = {
    garage: 750,
    lab: 1_800,
    electronics: 1_250,
    clinic: 1_500,
    forge: 1_100,
    tailor: 900,
  };

  return Math.round((baseByType[workshopType] ?? 1_000) * (1 + existingWorkshopCount * 0.35));
}

export function calculateWorkshopUpgradeCost(level: number) {
  return Math.max(250, Math.round(500 * Math.pow(Math.max(1, level), 1.55)));
}

export function calculateCraftingDurationSeconds(recipe: CraftingRecipeLike, workshop?: WorkshopLike | null) {
  const workshopSpeed = workshop ? Math.min(0.45, Math.max(0, (workshop.level - 1) * 0.06)) : 0;
  const conditionPenalty = workshop ? Math.max(0, (60 - workshop.condition) / 100) : 0.15;
  return Math.max(60, Math.round(recipe.durationSeconds * (1 - workshopSpeed + conditionPenalty)));
}

export function calculateCraftingRisk(recipe: CraftingRecipeLike, character: CraftingCharacterLike, workshop?: WorkshopLike | null) {
  const skillReduction = Math.floor((character.intelligence + character.labour) / 12);
  const workshopReduction = workshop ? Math.floor(workshop.level / 2) + (workshop.isHidden ? 1 : 0) : 0;
  const conditionPenalty = workshop ? Math.max(0, Math.floor((40 - workshop.condition) / 10)) : 1;
  const heatPenalty = Math.floor((character.heat ?? 0) / 25);
  return Math.max(0, recipe.risk + conditionPenalty + heatPenalty - skillReduction - workshopReduction);
}

export function calculateCraftingCooldownSeconds(recipe: CraftingRecipeLike) {
  return Math.max(30, Math.min(900, Math.round(recipe.durationSeconds / 4)));
}

export function canStartCrafting(recipe: CraftingRecipeLike, character: CraftingCharacterLike) {
  const failures: string[] = [];

  if (character.level < recipe.requiredLevel) {
    failures.push(`Requires level ${recipe.requiredLevel}.`);
  }

  if (character.intelligence < recipe.requiredIntelligence) {
    failures.push(`Requires intelligence ${recipe.requiredIntelligence}.`);
  }

  if (character.labour < recipe.requiredLabour) {
    failures.push(`Requires labour ${recipe.requiredLabour}.`);
  }

  if (character.energy < recipe.energyCost) {
    failures.push(`Requires ${recipe.energyCost} energy.`);
  }

  if (character.cash < recipe.cashCost) {
    failures.push(`Requires $${recipe.cashCost}.`);
  }

  return { ok: failures.length === 0, failures };
}

export function summarizeCraftingJob(recipeName: string, outputQuantity: number, outputName: string) {
  return `${recipeName} queued: ${outputQuantity}x ${outputName}.`;
}
