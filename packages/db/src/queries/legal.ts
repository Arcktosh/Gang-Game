import { and, desc, eq, sql } from 'drizzle-orm';
import {
  calculateBailSettlement,
  calculateBribeAttempt,
  calculateCareService,
  calculateCourtOutcome,
  calculateFineSettlement,
  calculateHeatDecay,
  calculateJailActivity,
  calculateLawyerService,
  type CourtPlea,
  type JailActivity,
  type LegalPaymentSource,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characters,
  financialTransactions,
  hospitalStays,
  jailSentences,
  legalServiceLogs,
  playerEvents,
} from '../schema';

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

export async function hireLawyer(input: {
  tx: Tx;
  character: CharacterRow;
  userId: string;
  tier: 'public' | 'street' | 'firm';
}) {
  const service = calculateLawyerService({
    heat: input.character.heat,
    intelligence: input.character.intelligence,
    cash: input.character.cash,
    tier: input.tier,
  });

  if (!service.canAfford) {
    return {
      ok: false as const,
      code: 'insufficient_cash',
      message: 'Not enough cash to hire that lawyer.',
    };
  }

  const nextHeat = Math.max(0, input.character.heat - service.heatReduction);
  const activeSentence = await input.tx.query.jailSentences.findFirst({
    where: and(
      eq(jailSentences.characterId, input.character.id),
      eq(jailSentences.status, 'active'),
    ),
  });
  const releaseRate = input.tier === 'firm' ? 0.55 : input.tier === 'street' ? 0.3 : 0.1;
  const reducedReleaseAt = activeSentence
    ? new Date(
        Math.max(
          Date.now(),
          activeSentence.releaseAt.getTime() -
            Math.ceil((activeSentence.releaseAt.getTime() - Date.now()) * releaseRate),
        ),
      )
    : null;
  const nextStatus =
    activeSentence && reducedReleaseAt && reducedReleaseAt.getTime() <= Date.now()
      ? 'free'
      : input.character.status;

  const [updatedCharacter] = await input.tx
    .update(characters)
    .set({
      cash: input.character.cash - service.cost,
      heat: nextHeat,
      legalReputation: input.character.legalReputation + (input.tier === 'firm' ? 2 : 1),
      status: nextStatus,
      statusUntil:
        activeSentence && nextStatus !== 'free' ? reducedReleaseAt : input.character.statusUntil,
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
    payload: {
      tier: input.tier,
      heatBefore: input.character.heat,
      heatAfter: nextHeat,
      cost: service.cost,
      reducedReleaseAt,
    },
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
    return {
      ok: false as const,
      code: 'insufficient_cash',
      message: 'Not enough cash to attempt this bribe.',
    };
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
    payload: {
      heatBefore: input.character.heat,
      heatAfter: nextHeat,
      cost: service.cost,
      successChance: service.successChance,
    },
  });

  return { ok: true as const, character: updatedCharacter, log, service };
}

export async function buyHospitalCare(input: {
  tx: Tx;
  character: CharacterRow;
  userId: string;
  service: 'basic' | 'private' | 'specialist';
}) {
  const care = calculateCareService({ cash: input.character.cash, service: input.service });

  if (!care.canAfford) {
    return {
      ok: false as const,
      code: 'insufficient_cash',
      message: 'Not enough cash for this care service.',
    };
  }

  const activeStay = await input.tx.query.hospitalStays.findFirst({
    where: and(
      eq(hospitalStays.characterId, input.character.id),
      eq(hospitalStays.status, 'active'),
    ),
  });

  if (!activeStay) {
    return {
      ok: false as const,
      code: 'not_hospitalized',
      message: 'No active hospital stay found.',
    };
  }

  const currentRelease = activeStay.releasedAt.getTime();
  const newRelease = new Date(
    Math.max(Date.now(), currentRelease - care.timeReductionSeconds * 1000),
  );
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
    .set({
      releasedAt: newRelease,
      status: nextStatus === 'free' ? 'completed' : 'active',
      completedAt: nextStatus === 'free' ? sql`now()` : null,
    })
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
    payload: {
      service: input.service,
      cost: care.cost,
      healthGain: care.healthGain,
      releasedAt: newRelease,
    },
  });

  return { ok: true as const, character: updatedCharacter, care, releasedAt: newRelease };
}

function getRemainingSentenceSeconds(releaseAt: Date) {
  return Math.max(0, Math.ceil((releaseAt.getTime() - Date.now()) / 1000));
}

function debitSourcePatch(
  character: CharacterRow,
  paymentSource: LegalPaymentSource,
  cost: number,
) {
  return paymentSource === 'bank'
    ? { bank: character.bank - cost }
    : { cash: character.cash - cost };
}

export async function settleJailPayment(input: {
  tx: Tx;
  character: CharacterRow;
  userId: string;
  action: 'pay_fine' | 'post_bail';
  paymentSource: LegalPaymentSource;
}) {
  const activeSentence = await input.tx.query.jailSentences.findFirst({
    where: and(
      eq(jailSentences.characterId, input.character.id),
      eq(jailSentences.status, 'active'),
    ),
  });

  if (!activeSentence) {
    return { ok: false as const, code: 'not_jailed', message: 'No active jail sentence found.' };
  }

  const settlementInput = {
    fine: activeSentence.fine,
    severity: activeSentence.severity,
    remainingSeconds: getRemainingSentenceSeconds(activeSentence.releaseAt),
    cash: input.character.cash,
    bank: input.character.bank,
    paymentSource: input.paymentSource,
  };
  const settlement =
    input.action === 'pay_fine'
      ? calculateFineSettlement(settlementInput)
      : calculateBailSettlement(settlementInput);

  if (!settlement.canAfford) {
    return {
      ok: false as const,
      code: 'insufficient_funds',
      message: `Not enough ${input.paymentSource} to complete this settlement.`,
    };
  }

  const nextHeat = Math.max(0, input.character.heat - settlement.heatReduction);
  const [updatedCharacter] = await input.tx
    .update(characters)
    .set({
      ...debitSourcePatch(input.character, input.paymentSource, settlement.cost),
      heat: nextHeat,
      legalReputation: input.character.legalReputation + (input.action === 'pay_fine' ? 1 : 0),
      status: 'free',
      statusUntil: null,
      statusReason: null,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, input.character.id))
    .returning();

  const [updatedSentence] = await input.tx
    .update(jailSentences)
    .set({
      status: 'completed',
      completedAt: sql`now()`,
      releaseAt: sql`now()`,
    })
    .where(eq(jailSentences.id, activeSentence.id))
    .returning();

  const serviceType = input.action === 'pay_fine' ? 'fine_settlement' : 'bail_settlement';
  const [log] = await input.tx
    .insert(legalServiceLogs)
    .values({
      characterId: input.character.id,
      serviceType,
      serviceTier: input.paymentSource,
      cost: settlement.cost,
      heatBefore: input.character.heat,
      heatAfter: nextHeat,
      success: true,
      metadata: { settlement, jailSentenceId: activeSentence.id },
    })
    .returning();

  await input.tx.insert(financialTransactions).values({
    characterId: input.character.id,
    type: input.paymentSource,
    amount: String(-settlement.cost),
    description: input.action === 'pay_fine' ? 'Paid jail fine' : 'Posted bail',
    metadata: { settlement, jailSentenceId: activeSentence.id },
  });

  await input.tx.insert(playerEvents).values({
    userId: input.userId,
    characterId: input.character.id,
    type: input.action === 'pay_fine' ? 'jail_fine_paid' : 'bail_posted',
    payload: {
      jailSentenceId: activeSentence.id,
      paymentSource: input.paymentSource,
      cost: settlement.cost,
      heatBefore: input.character.heat,
      heatAfter: nextHeat,
    },
  });

  return {
    ok: true as const,
    character: updatedCharacter,
    jailSentence: updatedSentence,
    settlement,
    log,
  };
}

export async function requestCourtHearing(input: {
  tx: Tx;
  character: CharacterRow;
  userId: string;
  plea: CourtPlea;
}) {
  const activeSentence = await input.tx.query.jailSentences.findFirst({
    where: and(
      eq(jailSentences.characterId, input.character.id),
      eq(jailSentences.status, 'active'),
    ),
  });

  if (!activeSentence) {
    return { ok: false as const, code: 'not_jailed', message: 'No active jail sentence found.' };
  }

  const outcome = calculateCourtOutcome({
    severity: activeSentence.severity,
    heat: input.character.heat,
    legalReputation: input.character.legalReputation,
    intelligence: input.character.intelligence,
    remainingSeconds: getRemainingSentenceSeconds(activeSentence.releaseAt),
    fine: activeSentence.fine,
    plea: input.plea,
  });
  const nextFine = Math.max(0, activeSentence.fine + outcome.fineDelta);
  const currentReleaseMs = activeSentence.releaseAt.getTime();
  const adjustedReleaseAt = outcome.releaseNow
    ? new Date()
    : new Date(
        Math.max(
          Date.now(),
          currentReleaseMs -
            outcome.sentenceReductionSeconds * 1000 +
            outcome.sentenceExtensionSeconds * 1000,
        ),
      );
  const nextStatus =
    outcome.releaseNow || adjustedReleaseAt.getTime() <= Date.now()
      ? 'free'
      : input.character.status;
  const nextHeat = Math.max(0, input.character.heat - outcome.heatReduction);

  const [updatedSentence] = await input.tx
    .update(jailSentences)
    .set({
      fine: nextFine,
      releaseAt: adjustedReleaseAt,
      status: nextStatus === 'free' ? 'completed' : 'active',
      completedAt: nextStatus === 'free' ? sql`now()` : null,
    })
    .where(eq(jailSentences.id, activeSentence.id))
    .returning();

  const [updatedCharacter] = await input.tx
    .update(characters)
    .set({
      heat: nextHeat,
      legalReputation: input.character.legalReputation + outcome.legalReputationGain,
      status: nextStatus,
      statusUntil: nextStatus === 'free' ? null : adjustedReleaseAt,
      statusReason: nextStatus === 'free' ? null : input.character.statusReason,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, input.character.id))
    .returning();

  const [log] = await input.tx
    .insert(legalServiceLogs)
    .values({
      characterId: input.character.id,
      serviceType: 'court_hearing',
      serviceTier: input.plea,
      cost: 0,
      heatBefore: input.character.heat,
      heatAfter: nextHeat,
      success: outcome.outcome === 'dismissed' || outcome.outcome === 'reduced',
      metadata: {
        outcome,
        jailSentenceId: activeSentence.id,
        fineBefore: activeSentence.fine,
        fineAfter: nextFine,
        releaseAt: adjustedReleaseAt,
      },
    })
    .returning();

  await input.tx.insert(playerEvents).values({
    userId: input.userId,
    characterId: input.character.id,
    type: 'court_hearing_resolved',
    payload: {
      jailSentenceId: activeSentence.id,
      outcome,
      releaseAt: adjustedReleaseAt,
      fineBefore: activeSentence.fine,
      fineAfter: nextFine,
    },
  });

  return {
    ok: true as const,
    character: updatedCharacter,
    jailSentence: updatedSentence,
    outcome,
    log,
  };
}

export async function performJailActivity(input: {
  tx: Tx;
  character: CharacterRow;
  userId: string;
  activity: JailActivity;
}) {
  const activeSentence = await input.tx.query.jailSentences.findFirst({
    where: and(
      eq(jailSentences.characterId, input.character.id),
      eq(jailSentences.status, 'active'),
    ),
  });

  if (!activeSentence) {
    return { ok: false as const, code: 'not_jailed', message: 'No active jail sentence found.' };
  }

  const activity = calculateJailActivity({
    activity: input.activity,
    severity: activeSentence.severity,
    remainingSeconds: getRemainingSentenceSeconds(activeSentence.releaseAt),
    intelligence: input.character.intelligence,
    labour: input.character.labour,
    endurance: input.character.endurance,
    strength: input.character.strength,
  });
  const adjustedReleaseAt = activity.releaseNow
    ? new Date()
    : new Date(
        Math.max(
          Date.now(),
          activeSentence.releaseAt.getTime() - activity.releaseReductionSeconds * 1000,
        ),
      );
  const nextStatus =
    activity.releaseNow || adjustedReleaseAt.getTime() <= Date.now()
      ? 'free'
      : input.character.status;

  const [updatedSentence] = await input.tx
    .update(jailSentences)
    .set({
      releaseAt: adjustedReleaseAt,
      status: nextStatus === 'free' ? 'completed' : 'active',
      completedAt: nextStatus === 'free' ? sql`now()` : null,
    })
    .where(eq(jailSentences.id, activeSentence.id))
    .returning();

  const [updatedCharacter] = await input.tx
    .update(characters)
    .set({
      intelligence: input.character.intelligence + activity.intelligenceGain,
      labour: input.character.labour + activity.labourGain,
      strength: input.character.strength + activity.strengthGain,
      endurance: input.character.endurance + activity.enduranceGain,
      experience: input.character.experience + activity.experience,
      status: nextStatus,
      statusUntil: nextStatus === 'free' ? null : adjustedReleaseAt,
      statusReason: nextStatus === 'free' ? null : input.character.statusReason,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, input.character.id))
    .returning();

  const [log] = await input.tx
    .insert(legalServiceLogs)
    .values({
      characterId: input.character.id,
      serviceType: 'jail_activity',
      serviceTier: input.activity,
      cost: 0,
      heatBefore: input.character.heat,
      heatAfter: input.character.heat,
      success: true,
      metadata: { activity, jailSentenceId: activeSentence.id, releaseAt: adjustedReleaseAt },
    })
    .returning();

  await input.tx.insert(playerEvents).values({
    userId: input.userId,
    characterId: input.character.id,
    type: 'jail_activity_completed',
    payload: { jailSentenceId: activeSentence.id, activity, releaseAt: adjustedReleaseAt },
  });

  return {
    ok: true as const,
    character: updatedCharacter,
    jailSentence: updatedSentence,
    activity,
    log,
  };
}
