import { and, desc, eq, sql } from 'drizzle-orm';
import {
  calculateCraftingCooldownSeconds,
  calculateCraftingDurationSeconds,
  calculateCraftingRisk,
  calculateWorkshopBuildCost,
  calculateWorkshopUpgradeCost,
  canStartCrafting,
  normalizeCraftingInputs,
  summarizeCraftingJob,
  type WorkshopType,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characterActionLocks,
  characters,
  characterWorkshops,
  craftingJobInputs,
  craftingJobs,
  craftingRecipeDefinitions,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';

type Tx = any;

type WorkshopAction =
  | { action: 'build_workshop'; characterId: string; workshopType: WorkshopType; name?: string }
  | { action: 'upgrade_workshop'; characterId: string; workshopId: string }
  | { action: 'start_recipe'; characterId: string; recipeKey: string; workshopId?: string };

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  const character = await tx.query.characters.findFirst({ where: and(eq(characters.id, characterId), eq(characters.userId, userId)) });

  if (!character) {
    return null;
  }

  return refreshCharacterResources(tx, character);
}

async function getInventoryMap(tx: Tx, characterId: string): Promise<Map<string, typeof inventoryItems.$inferSelect>> {
  const rows = (await tx.query.inventoryItems.findMany({ where: eq(inventoryItems.characterId, characterId) })) as (typeof inventoryItems.$inferSelect)[];
  return new Map(rows.map((row) => [row.itemKey, row] as [string, typeof inventoryItems.$inferSelect]));
}

async function addInventory(tx: Tx, characterId: string, itemKey: string, quantity: number) {
  const existing = await tx.query.inventoryItems.findFirst({ where: and(eq(inventoryItems.characterId, characterId), eq(inventoryItems.itemKey, itemKey)) });

  if (existing) {
    await tx
      .update(inventoryItems)
      .set({ quantity: sql`${inventoryItems.quantity} + ${quantity}`, updatedAt: sql`now()` })
      .where(eq(inventoryItems.id, existing.id));
    return;
  }

  await tx.insert(inventoryItems).values({ characterId, itemKey, quantity });
}

export async function listCraftingProfile(input: { userId: string; characterId: string }) {
  const character = await db.query.characters.findFirst({ where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)) });

  if (!character) {
    return null;
  }

  const [recipes, workshops, jobs, inventory] = await Promise.all([
    db.query.craftingRecipeDefinitions.findMany({ with: { outputItem: true }, orderBy: (table, { asc }) => [asc(table.requiredLevel), asc(table.name)] }),
    db.query.characterWorkshops.findMany({ where: eq(characterWorkshops.characterId, character.id), orderBy: (table, { asc }) => [asc(table.workshopType)] }),
    db.query.craftingJobs.findMany({ where: eq(craftingJobs.characterId, character.id), with: { recipe: true, outputItem: true, workshop: true, inputs: true }, orderBy: desc(craftingJobs.startedAt), limit: 12 }),
    db.query.inventoryItems.findMany({ where: eq(inventoryItems.characterId, character.id), with: { item: true } }),
  ]);

  const inventoryByKey = new Map<string, number>(inventory.map((row: any) => [row.itemKey, row.quantity]));

  const enrichedRecipes = recipes.map((recipe: any) => {
    const inputs = normalizeCraftingInputs(recipe.inputs);
    const hasInputs = Object.entries(inputs).every(([itemKey, quantity]) => (inventoryByKey.get(itemKey) ?? 0) >= quantity);
    const matchingWorkshop = workshops.find((workshop: any) => workshop.workshopType === recipe.workshopType) ?? null;
    const startCheck = canStartCrafting(recipe, character);

    return {
      ...recipe,
      inputs,
      canStart: hasInputs && startCheck.ok && Boolean(matchingWorkshop),
      missingReasons: [
        ...startCheck.failures,
        ...(hasInputs ? [] : ['Missing required materials.']),
        ...(matchingWorkshop ? [] : [`Requires a ${recipe.workshopType} workshop.`]),
      ],
      estimatedDurationSeconds: calculateCraftingDurationSeconds(recipe, matchingWorkshop),
      estimatedRisk: calculateCraftingRisk(recipe, character, matchingWorkshop),
      workshopId: matchingWorkshop?.id ?? null,
    };
  });

  return { character, recipes: enrichedRecipes, workshops, jobs, inventory };
}

export async function runCraftingAction(input: { userId: string } & WorkshopAction) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    if (character.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available for workshop actions.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'crafting' as any);
    if (!cooldown.ok) {
      return cooldown;
    }

    if (input.action === 'build_workshop') {
      const existing = await tx.query.characterWorkshops.findMany({ where: eq(characterWorkshops.characterId, character.id) });
      const duplicate = existing.find((workshop: any) => workshop.workshopType === input.workshopType);

      if (duplicate) {
        return { ok: false as const, code: 'forbidden', message: 'Workshop type already built.' };
      }

      const cost = calculateWorkshopBuildCost(input.workshopType, existing.length);
      if (character.cash < cost) {
        return { ok: false as const, code: 'forbidden', message: `Requires $${cost}.` };
      }

      const [workshop] = await tx
        .insert(characterWorkshops)
        .values({ characterId: character.id, workshopType: input.workshopType, name: input.name?.trim() || `${input.workshopType} workshop`, isHidden: input.workshopType === 'lab' || input.workshopType === 'electronics' })
        .returning();

      await tx.update(characters).set({ cash: sql`${characters.cash} - ${cost}`, updatedAt: sql`now()` }).where(eq(characters.id, character.id));
      await tx.insert(financialTransactions).values({ characterId: character.id, type: 'system', amount: String(-cost), description: `Built ${workshop.name}` });
      await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'workshop_built', payload: { workshopType: input.workshopType, cost }, visibility: 'private' });
      await setActionCooldown({ tx, characterId: character.id, actionType: 'crafting', cooldownSeconds: 120, metadata: { action: 'build_workshop' } });

      return { ok: true as const, data: { workshop, cost } };
    }

    if (input.action === 'upgrade_workshop') {
      const workshop = await tx.query.characterWorkshops.findFirst({ where: and(eq(characterWorkshops.id, input.workshopId), eq(characterWorkshops.characterId, character.id)) });

      if (!workshop) {
        return { ok: false as const, code: 'not_found', message: 'Workshop not found.' };
      }

      const cost = calculateWorkshopUpgradeCost(workshop.level);
      if (character.cash < cost) {
        return { ok: false as const, code: 'forbidden', message: `Requires $${cost}.` };
      }

      const [updated] = await tx
        .update(characterWorkshops)
        .set({ level: sql`${characterWorkshops.level} + 1`, condition: 100, storageCapacity: sql`${characterWorkshops.storageCapacity} + 50`, updatedAt: sql`now()` })
        .where(eq(characterWorkshops.id, workshop.id))
        .returning();

      await tx.update(characters).set({ cash: sql`${characters.cash} - ${cost}`, updatedAt: sql`now()` }).where(eq(characters.id, character.id));
      await tx.insert(financialTransactions).values({ characterId: character.id, type: 'system', amount: String(-cost), description: `Upgraded ${workshop.name}` });
      await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'workshop_upgraded', payload: { workshopId: workshop.id, cost, level: workshop.level + 1 }, visibility: 'private' });
      await setActionCooldown({ tx, characterId: character.id, actionType: 'crafting', cooldownSeconds: 180, metadata: { action: 'upgrade_workshop' } });

      return { ok: true as const, data: { workshop: updated, cost } };
    }

    const recipe = await tx.query.craftingRecipeDefinitions.findFirst({ where: eq(craftingRecipeDefinitions.key, input.recipeKey), with: { outputItem: true } });

    if (!recipe) {
      return { ok: false as const, code: 'not_found', message: 'Recipe not found.' };
    }

    const workshop = input.workshopId
      ? await tx.query.characterWorkshops.findFirst({ where: and(eq(characterWorkshops.id, input.workshopId), eq(characterWorkshops.characterId, character.id), eq(characterWorkshops.workshopType, recipe.workshopType)) })
      : await tx.query.characterWorkshops.findFirst({ where: and(eq(characterWorkshops.characterId, character.id), eq(characterWorkshops.workshopType, recipe.workshopType)) });

    if (!workshop) {
      return { ok: false as const, code: 'forbidden', message: `Requires a ${recipe.workshopType} workshop.` };
    }

    const startCheck = canStartCrafting(recipe, character);
    if (!startCheck.ok) {
      return { ok: false as const, code: 'forbidden', message: startCheck.failures.join(' ') };
    }

    const inventory = await getInventoryMap(tx, character.id);
    const inputs = normalizeCraftingInputs(recipe.inputs);
    for (const [itemKey, quantity] of Object.entries(inputs)) {
      if ((inventory.get(itemKey)?.quantity ?? 0) < quantity) {
        return { ok: false as const, code: 'forbidden', message: `Missing ${quantity}x ${itemKey}.` };
      }
    }

    const durationSeconds = calculateCraftingDurationSeconds(recipe, workshop);
    const riskScore = calculateCraftingRisk(recipe, character, workshop);
    const [job] = await tx
      .insert(craftingJobs)
      .values({
        characterId: character.id,
        recipeKey: recipe.key,
        workshopId: workshop.id,
        outputItemKey: recipe.outputItemKey,
        outputQuantity: recipe.outputQuantity,
        cashCost: recipe.cashCost,
        energyCost: recipe.energyCost,
        riskScore,
        completesAt: sql`now() + (${durationSeconds} || ' seconds')::interval`,
        metadata: { durationSeconds, inputs },
      })
      .returning();

    for (const [itemKey, quantity] of Object.entries(inputs)) {
      await tx.update(inventoryItems).set({ quantity: sql`${inventoryItems.quantity} - ${quantity}`, updatedAt: sql`now()` }).where(eq(inventoryItems.id, inventory.get(itemKey)!.id));
      await tx.insert(craftingJobInputs).values({ craftingJobId: job.id, characterId: character.id, itemKey, quantity });
    }

    await tx
      .update(characters)
      .set({ cash: sql`${characters.cash} - ${recipe.cashCost}`, energy: sql`${characters.energy} - ${recipe.energyCost}`, heat: sql`${characters.heat} + ${riskScore}`, updatedAt: sql`now()` })
      .where(eq(characters.id, character.id));

    if (recipe.cashCost > 0) {
      await tx.insert(financialTransactions).values({ characterId: character.id, type: 'system', amount: String(-recipe.cashCost), description: `Started ${recipe.name}` });
    }

    await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'crafting_started', payload: { recipeKey: recipe.key, jobId: job.id, riskScore }, visibility: riskScore >= 5 ? 'public' : 'private' });
    await setActionCooldown({ tx, characterId: character.id, actionType: 'crafting', cooldownSeconds: calculateCraftingCooldownSeconds(recipe), metadata: { action: 'start_recipe', recipeKey: recipe.key } });

    return { ok: true as const, data: { job, message: summarizeCraftingJob(recipe.name, recipe.outputQuantity, recipe.outputItem?.name ?? recipe.outputItemKey) } };
  });
}

export async function completeReadyCraftingJobs() {
  return db.transaction(async (tx) => {
    const ready = await tx.query.craftingJobs.findMany({
      where: and(eq(craftingJobs.status, 'queued'), sql`${craftingJobs.completesAt} <= now()`),
      with: { recipe: true, outputItem: true },
      limit: 100,
    });

    for (const job of ready as any[]) {
      await addInventory(tx, job.characterId, job.outputItemKey, job.outputQuantity);
      await tx.update(craftingJobs).set({ status: 'completed', completedAt: sql`now()` }).where(eq(craftingJobs.id, job.id));
      await tx.insert(playerEvents).values({ characterId: job.characterId, type: 'crafting_completed', payload: { recipeKey: job.recipeKey, outputItemKey: job.outputItemKey, outputQuantity: job.outputQuantity }, visibility: 'private' });
    }

    return { completed: ready.length };
  });
}
