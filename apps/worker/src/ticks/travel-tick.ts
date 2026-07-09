import { and, eq, lte, sql } from 'drizzle-orm';
import {
  characters,
  db,
  inventoryItems,
  playerEvents,
  travelCargo,
  travelPlans,
  travelRoutes,
} from '@drugdeal/db';
import { scheduleWorkerTick } from '../tick-runner';

const TRAVEL_TICK_MS = 30_000;

export function startTravelTick() {
  return scheduleWorkerTick({
    name: 'travel-completion',
    intervalMs: TRAVEL_TICK_MS,
    run: completeDueTravelPlans,
  });
}

export async function completeDueTravelPlans() {
  const duePlans = await db.query.travelPlans.findMany({
    where: and(eq(travelPlans.status, 'scheduled'), lte(travelPlans.arrivesAt, new Date())),
    limit: 50,
  });

  for (const plan of duePlans) {
    await db.transaction(async (tx) => {
      const route = await tx.query.travelRoutes.findFirst({
        where: eq(travelRoutes.id, plan.routeId),
      });
      const character = await tx.query.characters.findFirst({
        where: eq(characters.id, plan.characterId),
      });

      if (!route || !character) {
        await tx
          .update(travelPlans)
          .set({ status: 'cancelled', completedAt: sql`now()` })
          .where(eq(travelPlans.id, plan.id));
        return;
      }

      await tx
        .update(travelPlans)
        .set({ status: 'completed', completedAt: sql`now()` })
        .where(eq(travelPlans.id, plan.id));

      const cargoRows = await tx.query.travelCargo.findMany({
        where: and(eq(travelCargo.travelPlanId, plan.id), eq(travelCargo.status, 'loaded')),
      });
      for (const cargo of cargoRows) {
        await tx
          .insert(inventoryItems)
          .values({ characterId: character.id, itemKey: cargo.itemKey, quantity: cargo.quantity })
          .onConflictDoUpdate({
            target: [inventoryItems.characterId, inventoryItems.itemKey],
            set: {
              quantity: sql`${inventoryItems.quantity} + ${cargo.quantity}`,
              updatedAt: sql`now()`,
            },
          });
        await tx
          .update(travelCargo)
          .set({ status: 'delivered', resolvedAt: sql`now()` })
          .where(eq(travelCargo.id, cargo.id));
      }

      await tx
        .update(characters)
        .set({ location: route.toLocation, status: 'free', updatedAt: sql`now()` })
        .where(eq(characters.id, character.id));

      await tx.insert(playerEvents).values({
        userId: character.userId,
        characterId: character.id,
        type: 'travel_completed',
        payload: {
          fromLocation: route.fromLocation,
          toLocation: route.toLocation,
          travelPlanId: plan.id,
          cargoValue: plan.cargoValue,
          riskScore: plan.riskScore,
        },
      });
    });
  }

  return duePlans.length;
}
