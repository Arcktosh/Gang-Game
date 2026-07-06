import { and, desc, eq, sql } from 'drizzle-orm';
import { calculateBribeAttempt, calculateCareService, calculateHeatDecay, calculateLawyerService } from '@drugdeal/game';
import { db } from '../client';
import { characters, financialTransactions, hospitalStays, jailSentences, legalServiceLogs, playerEvents } from '../schema';

export type Tx = any;

type CharacterRow = typeof characters.$inferSelect;

export async function refreshCharacterHeat(tx: Tx, character: CharacterRow) {
  if (character.heat <= 0) {
    return character;
  }

  const hoursElapsed = (Date.now() - character.lastHeatTickAt.getTime()) / 3_600_000;
  const heatDecay = calculateHeatDecay({
    heat: character.heat,
    legalKnowledge: character.intelligence + character.legalReputation,
    hoursElapsed,
  });

  if (heatDecay <= 0) {
    return character;
  }

  const [updatedCharacter] = await tx
    .update(characters)
    .set({
      heat: Math.max(0, character.heat - heatDecay),
      lastHeatTickAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, character.id))
    .returning();

  return updatedCharacter;
}

export async function listLegalServiceLogs(characterId: string, limit = 25) {
  return db.query.legalServiceLogs.findMany({
    where: eq(legalServiceLogs.characterId, characterId),
    orderBy: desc(legalServiceLogs.createdAt),
    limit,
  });
}

export async function getActiveJailSentence(characterId: string) {
  return db.query.jailSentences.findFirst({
    where: and(eq(jailSentences.characterId, characterId), eq(jailSentences.status, 'active')),
    orderBy: desc(jailSentences.arrestedAt),
  });
}

export async function getActiveHospitalStay(characterId: string) {
  return db.query.hospitalStays.findFirst({
    where: and(eq(hospitalStays.characterId, characterId), eq(hospitalStays.status, 'active')),
    orderBy: desc(hospitalStays.admittedAt),
  });
}

export async function hireLawyer(input: { tx: Tx; character: CharacterRow; userId: string; tier: 'public' | 'street' | 'firm' }) {
  const service = calculateLawyerService({
    heat: input.character.heat,
    intelligence: input.character.intelligence,
    cash: input.character.cash,
    tier: input.tier,
  });

  if (!service.canAfford) {
    return { ok: false as const, code: 'insufficient_cash', message: 'Not enough cash to hire that lawyer.' };
  }

  const nextHeat = Math.max(0, input.character.heat - service.heatReduction);
  const activeSentence = await input.tx.query.jailSentences.findFirst({
    where: and(eq(jailSentences.characterId, input.character.id), eq(jailSentences.status, 'active')),
  });
  const releaseRate = input.tier === 'firm' ? 0.55 : input.tier === 'street' ? 0.3 : 0.1;
  const reducedReleaseAt = activeSentence
    ? new Date(Math.max(Date.now(), activeSentence.releaseAt.getTime() - Math.ceil((activeSentence.releaseAt.getTime() - Date.now()) * releaseRate)))
    : null;
  const nextStatus = activeSentence && reducedReleaseAt && reducedReleaseAt.getTime() <= Date.now() ? 'free' : input.character.status;

  const [updatedCharacter] = await input.tx
    .update(characters)
    .set({
      cash: input.character.cash - service.cost,
      heat: nextHeat,
      legalReputation: input.character.legalReputation + (input.tier === 'firm' ? 2 : 1),
      status: nextStatus,
      statusUntil: activeSentence && nextStatus !== 'free' ? reducedReleaseAt : input.character.statusUntil,
      statusReason: nextStatus === 'free' ? null : input.character.statusReason,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, input.character.id))
    .returning();

  if (activeSentence && reducedReleaseAt) {
    await input.tx
      .update(jailSentences)
      .set({
        releaseAt: reducedReleaseAt,
        status: nextStatus === 'free' ? 'completed' : 'active',
        completedAt: nextStatus === 'free' ? sql`now()` : null,
      })
      .where(eq(jailSentences.id, activeSentence.id));
  }

  const [log] = await input.tx
    .insert(legalServiceLogs)
    .values({
      characterId: input.character.id,
      serviceType: 'lawyer',
      serviceTier: input.tier,
      cost: service.cost,
      heatBefore: input.character.heat,
      heatAfter: nextHeat,
      success: true,
      metadata: { ...service, reducedReleaseAt },
    })
    .returning();

  await input.tx.insert(financialTransactions).values({
    characterId: input.character.id,
    type: 'system',
    amount: String(-service.cost),
    description: `Hired ${input.tier} lawyer`,
    metadata: service,
  });

  await input.tx.insert(playerEvents).values({
    userId: input.userId,
    characterId: input.character.id,
    type: 'lawyer_hired',
    payload: { tier: input.tier, heatBefore: input.character.heat, heatAfter: nextHeat, cost: service.cost, reducedReleaseAt },
  });

  return { ok: true as const, character: updatedCharacter, log, service };
}

export async function attemptBribe(input: { tx: Tx; character: CharacterRow; userId: string }) {
  const service = calculateBribeAttempt({
    heat: input.character.heat,
    intelligence: input.character.intelligence,
    cash: input.character.cash,
  });

  if (!service.canAfford) {
    return { ok: false as const, code: 'insufficient_cash', message: 'Not enough cash to attempt this bribe.' };
  }

  const nextHeat = Math.max(0, input.character.heat - service.heatReduction + service.extraHeat);
  const [updatedCharacter] = await input.tx
    .update(characters)
    .set({
      cash: input.character.cash - service.cost,
      heat: nextHeat,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, input.character.id))
    .returning();

  const [log] = await input.tx
    .insert(legalServiceLogs)
    .values({
      characterId: input.character.id,
      serviceType: 'bribe',
      serviceTier: 'street',
      cost: service.cost,
      heatBefore: input.character.heat,
      heatAfter: nextHeat,
      success: service.success,
      metadata: service,
    })
    .returning();

  await input.tx.insert(financialTransactions).values({
    characterId: input.character.id,
    type: 'system',
    amount: String(-service.cost),
    description: service.success ? 'Successful bribe' : 'Failed bribe',
    metadata: service,
  });

  await input.tx.insert(playerEvents).values({
    userId: input.userId,
    characterId: input.character.id,
    type: service.success ? 'bribe_succeeded' : 'bribe_failed',
    payload: { heatBefore: input.character.heat, heatAfter: nextHeat, cost: service.cost, successChance: service.successChance },
  });

  return { ok: true as const, character: updatedCharacter, log, service };
}

export async function buyHospitalCare(input: { tx: Tx; character: CharacterRow; userId: string; service: 'basic' | 'private' | 'specialist' }) {
  const care = calculateCareService({ cash: input.character.cash, service: input.service });

  if (!care.canAfford) {
    return { ok: false as const, code: 'insufficient_cash', message: 'Not enough cash for this care service.' };
  }

  const activeStay = await input.tx.query.hospitalStays.findFirst({
    where: and(eq(hospitalStays.characterId, input.character.id), eq(hospitalStays.status, 'active')),
  });

  if (!activeStay) {
    return { ok: false as const, code: 'not_hospitalized', message: 'No active hospital stay found.' };
  }

  const currentRelease = activeStay.releasedAt.getTime();
  const newRelease = new Date(Math.max(Date.now(), currentRelease - care.timeReductionSeconds * 1000));
  const nextHealth = Math.min(100, input.character.health + care.healthGain);
  const nextStatus = newRelease.getTime() <= Date.now() ? 'free' : input.character.status;

  const [updatedCharacter] = await input.tx
    .update(characters)
    .set({
      cash: input.character.cash - care.cost,
      health: nextHealth,
      status: nextStatus,
      statusUntil: nextStatus === 'free' ? null : newRelease,
      statusReason: nextStatus === 'free' ? null : input.character.statusReason,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, input.character.id))
    .returning();

  await input.tx
    .update(hospitalStays)
    .set({ releasedAt: newRelease, status: nextStatus === 'free' ? 'completed' : 'active', completedAt: nextStatus === 'free' ? sql`now()` : null })
    .where(eq(hospitalStays.id, activeStay.id));

  await input.tx.insert(financialTransactions).values({
    characterId: input.character.id,
    type: 'system',
    amount: String(-care.cost),
    description: `${input.service} hospital care`,
    metadata: care,
  });

  await input.tx.insert(playerEvents).values({
    userId: input.userId,
    characterId: input.character.id,
    type: 'hospital_care_bought',
    payload: { service: input.service, cost: care.cost, healthGain: care.healthGain, releasedAt: newRelease },
  });

  return { ok: true as const, character: updatedCharacter, care, releasedAt: newRelease };
}
