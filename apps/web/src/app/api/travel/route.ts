import { and, eq, sql } from 'drizzle-orm';
import { assertActionUnlocked, characterEquipment, characterVehicleUpgrades, db, characters, inventoryItems, itemDefinitions, playerEvents, refreshCharacterResources, setActionCooldown, travelCargo, travelPlans, travelRoutes } from '@drugdeal/db';
import { calculateArrivalAt, calculateVehicleRepairWear, calculateVehicleStats, calculateVehicleTravelPlan, normalizeEquipmentModifiers } from '@drugdeal/game';
import { startTravelSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET() {
  const routes = await db.query.travelRoutes.findMany();
  return jsonOk({ routes });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:travel', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, startTravelSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await db.transaction(async (tx) => {
      const character = await tx.query.characters.findFirst({
        where: and(eq(characters.id, body.data.characterId), eq(characters.userId, auth.userId)),
      });

      if (!character) {
        return { error: jsonError('not_found', 'Character not found.', 404) };
      }

      const refreshedCharacter = await refreshCharacterResources(tx, character);

      if (refreshedCharacter.status !== 'free') {
        return { error: jsonError('forbidden', 'Character is not available to travel.', 403) };
      }

      const route = await tx.query.travelRoutes.findFirst({ where: eq(travelRoutes.id, body.data.routeId) });

      if (!route) {
        return { error: jsonError('not_found', 'Travel route not found.', 404) };
      }

      const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'travel');

      if (!cooldown.ok) {
        return { error: jsonError(cooldown.code, cooldown.message, 429) };
      }

      if (route.fromLocation !== refreshedCharacter.location) {
        return { error: jsonError('forbidden', 'Route does not start from the character current location.', 403) };
      }

      const vehicle = await tx.query.characterEquipment.findFirst({
        where: and(eq(characterEquipment.characterId, refreshedCharacter.id), eq(characterEquipment.slot, 'vehicle'), eq(characterEquipment.isEquipped, true)),
        with: { item: true },
      });
      const installedUpgrades = vehicle
        ? await tx.query.characterVehicleUpgrades.findMany({ where: eq(characterVehicleUpgrades.equipmentId, vehicle.id), with: { upgrade: true } })
        : [];
      const vehicleStats = vehicle
        ? calculateVehicleStats({
            vehicleModifiers: normalizeEquipmentModifiers(vehicle.item?.statModifiers),
            upgradeModifiers: installedUpgrades.map((upgrade) => normalizeEquipmentModifiers(upgrade.upgrade?.statModifiers)),
            durability: vehicle.durability,
            maxDurability: vehicle.item?.maxDurability ?? 100,
          })
        : {};

      let cargoUnitValue = 0;
      let cargoRiskAdded = 0;
      const cargoQuantity = body.data.cargoQuantity ?? 0;
      if (body.data.cargoItemKey && cargoQuantity > 0) {
        const cargoItem = await tx.query.inventoryItems.findFirst({ where: and(eq(inventoryItems.characterId, refreshedCharacter.id), eq(inventoryItems.itemKey, body.data.cargoItemKey)) });
        if (!cargoItem || cargoItem.quantity < cargoQuantity) {
          return { error: jsonError('forbidden', 'Not enough inventory to load this cargo.', 403) };
        }
        const definition = await tx.query.itemDefinitions.findFirst({ where: eq(itemDefinitions.key, body.data.cargoItemKey) });
        cargoUnitValue = definition?.basePrice ?? 0;
        cargoRiskAdded = definition?.baseRisk ?? 0;
      }

      const plan = calculateVehicleTravelPlan({
        baseCost: route.cost,
        baseDurationSeconds: route.durationSeconds,
        baseRisk: route.risk + cargoRiskAdded,
        vehicleStats,
        cargoQuantity,
        cargoUnitValue,
      });

      if (refreshedCharacter.cash < plan.effectiveCost) {
        return { error: jsonError('forbidden', 'Not enough cash to travel.', 403) };
      }

      const arrivesAt = calculateArrivalAt({ durationSeconds: plan.effectiveDurationSeconds });
      const [travelPlan] = await tx
        .insert(travelPlans)
        .values({
          characterId: refreshedCharacter.id,
          routeId: route.id,
          arrivesAt,
          effectiveCost: plan.effectiveCost,
          effectiveDurationSeconds: plan.effectiveDurationSeconds,
          riskScore: plan.riskScore,
          cargoValue: plan.cargoValue,
          vehicleEquipmentId: vehicle?.id,
        })
        .returning();

      if (body.data.cargoItemKey && cargoQuantity > 0) {
        await tx.update(inventoryItems).set({ quantity: sql`${inventoryItems.quantity} - ${cargoQuantity}`, updatedAt: sql`now()` }).where(and(eq(inventoryItems.characterId, refreshedCharacter.id), eq(inventoryItems.itemKey, body.data.cargoItemKey)));
        await tx.insert(travelCargo).values({ travelPlanId: travelPlan.id, characterId: refreshedCharacter.id, itemKey: body.data.cargoItemKey, quantity: cargoQuantity, riskAdded: cargoRiskAdded, cargoValue: plan.cargoValue });
      }

      if (vehicle) {
        const wear = calculateVehicleRepairWear({ riskScore: plan.riskScore, cargoQuantity });
        await tx.update(characterEquipment).set({ durability: sql`greatest(0, ${characterEquipment.durability} - ${wear})`, updatedAt: sql`now()` }).where(eq(characterEquipment.id, vehicle.id));
      }

      const [updatedCharacter] = await tx
        .update(characters)
        .set({ cash: refreshedCharacter.cash - plan.effectiveCost, status: 'traveling', updatedAt: sql`now()` })
        .where(eq(characters.id, refreshedCharacter.id))
        .returning();

      await tx.insert(playerEvents).values({
        userId: auth.userId,
        characterId: refreshedCharacter.id,
        type: 'travel_started',
        payload: { fromLocation: route.fromLocation, toLocation: route.toLocation, cost: plan.effectiveCost, riskScore: plan.riskScore, cargoValue: plan.cargoValue, vehicle: vehicle?.item?.name ?? null, arrivesAt },
      });

      const lock = await setActionCooldown({
        tx,
        characterId: refreshedCharacter.id,
        actionType: 'travel',
        cooldownSeconds: Math.max(60, plan.effectiveDurationSeconds),
        metadata: { routeId: route.id, toLocation: route.toLocation },
      });

      return { data: { travelPlan, character: updatedCharacter, lock } };
    });

    if ('error' in result) {
      return result.error;
    }

    return jsonOk(result.data, { status: 201 });
  });
}
