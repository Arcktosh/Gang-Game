import { and, desc, eq, lte, sql } from 'drizzle-orm';
import {
  calculateAssignmentDurationSeconds,
  calculateAssignmentOutcome,
  calculateAssignmentReward,
  calculateAssignmentRisk,
  calculateContactLevelFromExperience,
  calculateContactUpkeep,
  calculateRecruitCost,
  canAssignContact,
  type ContactAssignmentType,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characterActionLocks,
  characterContacts,
  characters,
  contactAssignments,
  financialTransactions,
  npcContactDefinitions,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';

const ASSIGNMENT_TYPES = new Set<ContactAssignmentType>(['job_assist', 'crime_setup', 'shop_shift', 'territory_scout', 'market_tip', 'recovery_support']);

type Tx = any;

type ContactAction =
  | { action: 'recruit'; characterId: string; contactKey: string; nickname?: string }
  | { action: 'assign'; characterId: string; contactId: string; assignmentType: ContactAssignmentType }
  | { action: 'pay_upkeep'; characterId: string; contactId: string }
  | { action: 'dismiss'; characterId: string; contactId: string };

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  const character = await tx.query.characters.findFirst({ where: and(eq(characters.id, characterId), eq(characters.userId, userId)) });
  return character ? refreshCharacterResources(tx, character) : null;
}

export async function listContactsProfile(input: { userId: string; characterId: string }) {
  const character = await db.query.characters.findFirst({ where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)) });

  if (!character) {
    return null;
  }

  const [definitions, contacts, assignments] = await Promise.all([
    db.query.npcContactDefinitions.findMany({ orderBy: (table, { asc }) => [asc(table.minLevel), asc(table.name)] }),
    db.query.characterContacts.findMany({ where: eq(characterContacts.characterId, character.id), with: { definition: true }, orderBy: (table, { asc }) => [asc(table.specialty), asc(table.createdAt)] }),
    db.query.contactAssignments.findMany({ where: eq(contactAssignments.characterId, character.id), with: { contact: { with: { definition: true } } }, orderBy: desc(contactAssignments.startedAt), limit: 16 }),
  ]);

  const ownedKeys = new Set(contacts.map((contact: any) => contact.contactKey));
  const recruitable = definitions.map((definition: any) => ({
    ...definition,
    owned: ownedKeys.has(definition.key),
    canRecruit: !ownedKeys.has(definition.key) && character.level >= definition.minLevel && character.cash >= definition.recruitCost,
    calculatedRecruitCost: calculateRecruitCost(definition.minLevel, definition.specialty),
  }));

  const assignmentTypes: ContactAssignmentType[] = ['job_assist', 'crime_setup', 'shop_shift', 'territory_scout', 'market_tip', 'recovery_support'];

  return { character, recruitable, contacts, assignments, assignmentTypes };
}

export async function runContactAction(input: { userId: string } & ContactAction) {
  return db.transaction(async (tx) => {
    const character = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'contacts');
    if (!cooldown.ok) {
      return cooldown;
    }

    if (input.action === 'recruit') {
      const definition = await tx.query.npcContactDefinitions.findFirst({ where: eq(npcContactDefinitions.key, input.contactKey) });
      if (!definition) {
        return { ok: false as const, code: 'not_found', message: 'Contact not found.' };
      }
      if (character.level < definition.minLevel) {
        return { ok: false as const, code: 'forbidden', message: `Requires level ${definition.minLevel}.` };
      }
      const existing = await tx.query.characterContacts.findFirst({ where: and(eq(characterContacts.characterId, character.id), eq(characterContacts.contactKey, definition.key)) });
      if (existing) {
        return { ok: false as const, code: 'forbidden', message: 'Contact already recruited.' };
      }
      const cost = definition.recruitCost || calculateRecruitCost(definition.minLevel, definition.specialty as any);
      if (character.cash < cost) {
        return { ok: false as const, code: 'forbidden', message: `Requires $${cost}.` };
      }

      const [contact] = await tx
        .insert(characterContacts)
        .values({
          characterId: character.id,
          contactKey: definition.key,
          nickname: input.nickname?.trim() || null,
          specialty: definition.specialty,
          level: Math.max(1, definition.minLevel),
          loyalty: definition.baseLoyalty,
          upkeep: definition.upkeep || calculateContactUpkeep(definition.minLevel, definition.specialty as any),
        })
        .returning();

      await tx.update(characters).set({ cash: sql`${characters.cash} - ${cost}`, updatedAt: sql`now()` }).where(eq(characters.id, character.id));
      await tx.insert(financialTransactions).values({ characterId: character.id, type: 'system', amount: String(-cost), description: `Recruited ${definition.name}` });
      await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'contact_recruited', visibility: 'private', payload: { contactKey: definition.key, cost } });
      await setActionCooldown({ tx, characterId: character.id, actionType: 'contacts', cooldownSeconds: 90, metadata: { action: 'recruit' } });
      return { ok: true as const, data: { contact, cost } };
    }

    const contact = await tx.query.characterContacts.findFirst({ where: and(eq(characterContacts.id, input.contactId), eq(characterContacts.characterId, character.id)), with: { definition: true } });
    if (!contact) {
      return { ok: false as const, code: 'not_found', message: 'Contact not found.' };
    }

    if (input.action === 'dismiss') {
      await tx.update(characterContacts).set({ status: 'inactive', updatedAt: sql`now()` }).where(eq(characterContacts.id, contact.id));
      await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'contact_dismissed', visibility: 'private', payload: { contactId: contact.id } });
      await setActionCooldown({ tx, characterId: character.id, actionType: 'contacts', cooldownSeconds: 60, metadata: { action: 'dismiss' } });
      return { ok: true as const, data: { contactId: contact.id } };
    }

    if (input.action === 'pay_upkeep') {
      if (character.cash < contact.upkeep) {
        return { ok: false as const, code: 'forbidden', message: `Requires $${contact.upkeep}.` };
      }
      const nextLoyalty = Math.min(100, contact.loyalty + 8);
      const [updated] = await tx.update(characterContacts).set({ loyalty: nextLoyalty, status: 'idle', updatedAt: sql`now()` }).where(eq(characterContacts.id, contact.id)).returning();
      await tx.update(characters).set({ cash: sql`${characters.cash} - ${contact.upkeep}`, updatedAt: sql`now()` }).where(eq(characters.id, character.id));
      await tx.insert(financialTransactions).values({ characterId: character.id, type: 'system', amount: String(-contact.upkeep), description: `Paid contact upkeep` });
      await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'contact_upkeep_paid', visibility: 'private', payload: { contactId: contact.id, upkeep: contact.upkeep, loyalty: nextLoyalty } });
      await setActionCooldown({ tx, characterId: character.id, actionType: 'contacts', cooldownSeconds: 45, metadata: { action: 'pay_upkeep' } });
      return { ok: true as const, data: { contact: updated } };
    }

    if (!ASSIGNMENT_TYPES.has(input.assignmentType)) {
      return { ok: false as const, code: 'invalid_action', message: 'Invalid assignment type.' };
    }
    const assignable = canAssignContact(contact);
    if (!assignable.ok) {
      return { ok: false as const, code: 'forbidden', message: assignable.message };
    }

    const riskScore = calculateAssignmentRisk(input.assignmentType, contact as any);
    const rewardCash = calculateAssignmentReward(input.assignmentType, contact as any);
    const durationSeconds = calculateAssignmentDurationSeconds(input.assignmentType, contact as any);
    const [assignment] = await tx
      .insert(contactAssignments)
      .values({
        characterId: character.id,
        contactId: contact.id,
        assignmentType: input.assignmentType,
        riskScore,
        rewardCash,
        completesAt: sql`now() + (${durationSeconds} || ' seconds')::interval`,
        metadata: { durationSeconds, specialty: contact.specialty },
      })
      .returning();

    await tx.update(characterContacts).set({ status: 'assigned', statusUntil: assignment.completesAt, updatedAt: sql`now()` }).where(eq(characterContacts.id, contact.id));
    await tx.insert(playerEvents).values({ userId: input.userId, characterId: character.id, type: 'contact_assigned', visibility: 'private', payload: { contactId: contact.id, assignmentType: input.assignmentType, durationSeconds } });
    await setActionCooldown({ tx, characterId: character.id, actionType: 'contacts', cooldownSeconds: 60, metadata: { action: 'assign' } });

    return { ok: true as const, data: { assignment } };
  });
}

export async function completeReadyContactAssignments() {
  const ready = await db.query.contactAssignments.findMany({
    where: and(eq(contactAssignments.status, 'queued'), lte(contactAssignments.completesAt, sql`now()` as any)),
    with: { contact: true },
    limit: 50,
  });

  for (const assignment of ready as any[]) {
    await db.transaction(async (tx) => {
      const contact = assignment.contact;
      if (!contact) return;
      const outcome = calculateAssignmentOutcome(contact, assignment.riskScore);
      const nextExperience = contact.experience + outcome.experienceGain;
      const nextLevel = calculateContactLevelFromExperience(contact.level, nextExperience);
      const nextLoyalty = Math.max(0, Math.min(100, contact.loyalty + outcome.loyaltyDelta));
      const nextStatus = nextLoyalty === 0 ? 'inactive' : 'idle';

      await tx.update(contactAssignments).set({
        status: outcome.success ? 'completed' : 'failed',
        rewardExperience: outcome.experienceGain,
        loyaltyDelta: outcome.loyaltyDelta,
        completedAt: sql`now()`,
        metadata: sql`${contactAssignments.metadata} || ${JSON.stringify({ success: outcome.success })}::jsonb`,
      }).where(eq(contactAssignments.id, assignment.id));

      await tx.update(characterContacts).set({
        status: nextStatus,
        statusUntil: null,
        experience: nextExperience,
        level: nextLevel,
        loyalty: nextLoyalty,
        upkeep: calculateContactUpkeep(nextLevel, contact.specialty),
        updatedAt: sql`now()`,
      }).where(eq(characterContacts.id, contact.id));

      if (outcome.success && assignment.rewardCash > 0) {
        await tx.update(characters).set({ cash: sql`${characters.cash} + ${assignment.rewardCash}`, updatedAt: sql`now()` }).where(eq(characters.id, assignment.characterId));
        await tx.insert(financialTransactions).values({ characterId: assignment.characterId, type: 'cash', amount: String(assignment.rewardCash), description: `Contact assignment completed` });
      }

      await tx.insert(playerEvents).values({
        characterId: assignment.characterId,
        type: outcome.success ? 'contact_assignment_completed' : 'contact_assignment_failed',
        visibility: 'private',
        payload: { assignmentId: assignment.id, contactId: contact.id, assignmentType: assignment.assignmentType, rewardCash: outcome.success ? assignment.rewardCash : 0, loyaltyDelta: outcome.loyaltyDelta, experienceGain: outcome.experienceGain },
      });
    });
  }

  return { processed: ready.length };
}
