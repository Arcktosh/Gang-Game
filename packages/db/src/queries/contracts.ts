import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import {
  calculateContractCooldownSeconds,
  calculateContractEscrow,
  calculateContractPostingFee,
  calculateContractRisk,
  canAcceptScopedContract,
  canCompleteContract,
  canCreateFactionContract,
  getContractScope,
  type ContractType,
} from '@drugdeal/game';
import { db } from '../client';
import {
  characters,
  contractEvents,
  contracts,
  factionMembers,
  financialTransactions,
  inventoryItems,
  itemDefinitions,
  newspaperArticles,
  playerEvents,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';
import {
  acceptOpenContract,
  cancelOpenContract,
  completeAcceptedContract,
  debitContractPosterCost,
  decrementInventoryQuantity,
  refundContractEscrow,
} from './transaction-safety';

type Tx = any;
type ActiveMembership = typeof factionMembers.$inferSelect;

async function getOwnedCharacter(tx: Tx, userId: string, characterId: string) {
  return tx.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.userId, userId)),
  });
}

async function getActiveMembership(
  tx: Tx,
  characterId: string,
): Promise<ActiveMembership | undefined> {
  return tx.query.factionMembers.findFirst({
    where: and(eq(factionMembers.characterId, characterId), eq(factionMembers.status, 'active')),
  }) as Promise<ActiveMembership | undefined>;
}

export async function listContracts(input: { userId: string; characterId?: string }) {
  const activeCharacter = input.characterId
    ? await db.query.characters.findFirst({
        where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
      })
    : null;

  if (input.characterId && !activeCharacter) {
    return null;
  }

  const activeMembership = activeCharacter
    ? await getActiveMembership(db, activeCharacter.id)
    : undefined;
  const publicScope = and(isNull(contracts.factionId), isNull(contracts.assignedToCharacterId));
  const openVisibility = activeCharacter
    ? activeMembership
      ? or(
          publicScope,
          eq(contracts.assignedToCharacterId, activeCharacter.id),
          eq(contracts.factionId, activeMembership.factionId),
        )
      : or(publicScope, eq(contracts.assignedToCharacterId, activeCharacter.id))
    : publicScope;

  const openContracts = await db
    .select({
      id: contracts.id,
      createdByCharacterId: contracts.createdByCharacterId,
      assignedToCharacterId: contracts.assignedToCharacterId,
      factionId: contracts.factionId,
      contractType: contracts.contractType,
      status: contracts.status,
      title: contracts.title,
      description: contracts.description,
      originLocation: contracts.originLocation,
      targetLocation: contracts.targetLocation,
      itemKey: contracts.itemKey,
      itemName: itemDefinitions.name,
      quantity: contracts.quantity,
      reward: contracts.reward,
      risk: contracts.risk,
      expiresAt: contracts.expiresAt,
      createdAt: contracts.createdAt,
    })
    .from(contracts)
    .leftJoin(itemDefinitions, eq(contracts.itemKey, itemDefinitions.key))
    .where(and(eq(contracts.status, 'open'), openVisibility))
    .orderBy(desc(contracts.reward), desc(contracts.createdAt))
    .limit(25);

  const mine = activeCharacter
    ? await db.query.contracts.findMany({
        where: activeMembership
          ? or(
              eq(contracts.createdByCharacterId, activeCharacter.id),
              eq(contracts.assignedToCharacterId, activeCharacter.id),
              eq(contracts.factionId, activeMembership.factionId),
            )
          : or(
              eq(contracts.createdByCharacterId, activeCharacter.id),
              eq(contracts.assignedToCharacterId, activeCharacter.id),
            ),
        orderBy: desc(contracts.createdAt),
        limit: 25,
      })
    : [];

  return { openContracts, mine };
}

export async function getContractEvents(contractId: string) {
  return db.query.contractEvents.findMany({
    where: eq(contractEvents.contractId, contractId),
    orderBy: desc(contractEvents.createdAt),
    limit: 20,
  });
}

export async function createContract(input: {
  userId: string;
  characterId: string;
  contractType: ContractType;
  title: string;
  description?: string;
  targetLocation?: string;
  itemKey?: string;
  quantity?: number;
  reward: number;
  expiresInHours?: number;
  assignedToCharacterId?: string;
  factionId?: string;
}) {
  return db.transaction(async (tx: Tx) => {
    const characterRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to post contracts.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'contract_create');

    if (!cooldown.ok) {
      return cooldown;
    }

    const membership = await getActiveMembership(tx, character.id);
    const factionId = input.factionId?.trim() || undefined;
    const assignedToCharacterId = input.assignedToCharacterId?.trim() || undefined;
    const itemKey = input.itemKey?.trim() || undefined;

    if (input.contractType === 'faction_task' && !factionId) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Faction tasks must be sponsored by your active faction.',
      };
    }

    if (factionId) {
      if (!membership || membership.factionId !== factionId) {
        return {
          ok: false as const,
          code: 'forbidden',
          message: 'Only active faction members can sponsor faction contracts.',
        };
      }

      if (!canCreateFactionContract(membership.role)) {
        return {
          ok: false as const,
          code: 'forbidden',
          message: 'Only lieutenants and above can post faction contracts.',
        };
      }
    }

    if (assignedToCharacterId) {
      if (assignedToCharacterId === character.id) {
        return {
          ok: false as const,
          code: 'forbidden',
          message: 'You cannot assign a contract to yourself.',
        };
      }

      const assignee = await tx.query.characters.findFirst({
        where: eq(characters.id, assignedToCharacterId),
      });

      if (!assignee) {
        return { ok: false as const, code: 'not_found', message: 'Assigned character not found.' };
      }

      if (factionId) {
        const assigneeMembership = await getActiveMembership(tx, assignee.id);
        if (!assigneeMembership || assigneeMembership.factionId !== factionId) {
          return {
            ok: false as const,
            code: 'forbidden',
            message: 'Faction assignments can only target active members of the same faction.',
          };
        }
      }
    }

    const reward = Math.max(25, Math.floor(input.reward));
    const quantity = Math.max(0, Math.floor(input.quantity ?? 0));
    const fee = calculateContractPostingFee(reward);
    const escrow = calculateContractEscrow(reward);
    const totalCost = fee + escrow;

    if (character.cash < totalCost) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: `Posting this contract requires $${totalCost} cash including escrow and fees.`,
      };
    }

    if (itemKey) {
      const item = await tx.query.itemDefinitions.findFirst({
        where: eq(itemDefinitions.key, itemKey),
      });
      if (!item) {
        return { ok: false as const, code: 'not_found', message: 'Contract item not found.' };
      }
    }

    const expiresAt = new Date(Date.now() + (input.expiresInHours ?? 24) * 60 * 60 * 1000);
    const risk = calculateContractRisk({ reward, quantity, type: input.contractType });
    const scope = getContractScope({ factionId, assignedToCharacterId });
    const debit = await debitContractPosterCost(tx, character.id, totalCost);

    if (!debit.ok) {
      return {
        ok: false as const,
        code: 'forbidden',
        message: `Posting this contract requires $${totalCost} cash including escrow and fees.`,
      };
    }

    const [contract] = await tx
      .insert(contracts)
      .values({
        createdByCharacterId: character.id,
        assignedToCharacterId: assignedToCharacterId ?? null,
        factionId: factionId ?? null,
        contractType: input.contractType,
        title: input.title,
        description: input.description ?? '',
        originLocation: character.location,
        targetLocation: input.targetLocation ?? character.location,
        itemKey: itemKey ?? null,
        quantity,
        reward,
        escrowAmount: escrow,
        risk,
        expiresAt,
      })
      .returning();

    await tx.insert(contractEvents).values({
      contractId: contract.id,
      actorCharacterId: character.id,
      eventType: 'created',
      amount: -totalCost,
      description: `Posted ${scope.replace('_', ' ')} contract with $${escrow} escrow and $${fee} posting fee.`,
      metadata: { fee, escrow, scope, factionId, assignedToCharacterId },
    });

    await tx.insert(financialTransactions).values({
      characterId: character.id,
      type: 'system',
      amount: String(-totalCost),
      description: `Posted contract: ${contract.title}.`,
      metadata: { contractId: contract.id, fee, escrow, scope, factionId, assignedToCharacterId },
    });

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      visibility: factionId
        ? 'faction'
        : reward >= 1000 && !assignedToCharacterId
          ? 'public'
          : 'private',
      type: 'contract_posted',
      payload: {
        contractId: contract.id,
        title: contract.title,
        reward,
        contractType: contract.contractType,
        scope,
        factionId,
        assignedToCharacterId,
      },
    });

    if (reward >= 1000 && !factionId && !assignedToCharacterId) {
      await tx.insert(newspaperArticles).values({
        authorCharacterId: character.id,
        location: character.location,
        category: 'contracts',
        title: `New high-value contract posted: ${contract.title}`,
        slug: `contract-posted-${contract.id}`,
        excerpt: `${character.name} posted a $${reward} ${contract.contractType} contract.`,
        body: `${character.name} has posted a new contract worth $${reward}. Runners, fixers, and opportunists are already watching the board.`,
        metadata: { contractId: contract.id, reward, contractType: contract.contractType },
      });
    }

    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'contract_create',
      cooldownSeconds: calculateContractCooldownSeconds(reward),
      metadata: { contractId: contract.id, scope },
    });

    return { ok: true as const, data: { contract } };
  });
}

export async function acceptContract(input: {
  userId: string;
  characterId: string;
  contractId: string;
}) {
  return db.transaction(async (tx: Tx) => {
    const characterRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to accept contracts.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'contract_accept');

    if (!cooldown.ok) {
      return cooldown;
    }

    const contract = await tx.query.contracts.findFirst({
      where: eq(contracts.id, input.contractId),
    });

    if (!contract || contract.status !== 'open') {
      return { ok: false as const, code: 'not_found', message: 'Open contract not found.' };
    }

    const membership = await getActiveMembership(tx, character.id);
    const scopedAcceptance = canAcceptScopedContract({
      creatorCharacterId: contract.createdByCharacterId,
      characterId: character.id,
      assignedToCharacterId: contract.assignedToCharacterId,
      factionId: contract.factionId,
      characterFactionId: membership?.factionId ?? null,
    });

    if (!scopedAcceptance.ok) {
      return { ok: false as const, code: 'forbidden', message: scopedAcceptance.message };
    }

    if (contract.expiresAt && new Date(contract.expiresAt).getTime() < Date.now()) {
      await tx
        .update(contracts)
        .set({ status: 'expired', updatedAt: sql`now()` })
        .where(eq(contracts.id, contract.id));
      return { ok: false as const, code: 'forbidden', message: 'This contract has expired.' };
    }

    const accepted = await acceptOpenContract(tx, {
      contractId: contract.id,
      assigneeCharacterId: character.id,
    });

    if (!accepted.ok) {
      return { ok: false as const, code: 'conflict', message: 'This contract is no longer open.' };
    }

    const updatedContract = accepted.contract;
    const scope = getContractScope(contract);

    await tx
      .insert(contractEvents)
      .values({
        contractId: contract.id,
        actorCharacterId: character.id,
        eventType: 'accepted',
        description: `${character.name} accepted the contract.`,
        metadata: { scope },
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: contract.factionId ? 'faction' : 'private',
        type: 'contract_accepted',
        payload: {
          contractId: contract.id,
          title: contract.title,
          reward: contract.reward,
          scope,
          factionId: contract.factionId,
        },
      });

    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'contract_accept',
      cooldownSeconds: 10,
      metadata: { contractId: contract.id, scope },
    });

    return { ok: true as const, data: { contract: updatedContract } };
  });
}

export async function completeContract(input: {
  userId: string;
  characterId: string;
  contractId: string;
}) {
  return db.transaction(async (tx: Tx) => {
    const characterRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);

    if (character.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to complete contracts.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, character.id, 'contract_complete');

    if (!cooldown.ok) {
      return cooldown;
    }

    const contract = await tx.query.contracts.findFirst({
      where: eq(contracts.id, input.contractId),
    });

    if (
      !contract ||
      contract.status !== 'accepted' ||
      contract.assignedToCharacterId !== character.id
    ) {
      return {
        ok: false as const,
        code: 'not_found',
        message: 'Accepted contract not found for this character.',
      };
    }

    const inventoryItem = contract.itemKey
      ? await tx.query.inventoryItems.findFirst({
          where: and(
            eq(inventoryItems.characterId, character.id),
            eq(inventoryItems.itemKey, contract.itemKey),
          ),
        })
      : null;

    const completion = canCompleteContract({
      contractType: contract.contractType,
      characterLocation: character.location,
      targetLocation: contract.targetLocation,
      itemKey: contract.itemKey,
      requiredQuantity: contract.quantity,
      inventoryQuantity: inventoryItem?.quantity ?? 0,
    });

    if (!completion.ok) {
      return { ok: false as const, code: 'forbidden', message: completion.message };
    }

    const completed = await completeAcceptedContract(tx, {
      contractId: contract.id,
      assigneeCharacterId: character.id,
    });

    if (!completed.ok) {
      return {
        ok: false as const,
        code: 'conflict',
        message: 'This contract is no longer available to complete.',
      };
    }

    if (contract.itemKey && inventoryItem && contract.quantity > 0) {
      const reservedItem = await decrementInventoryQuantity(
        tx,
        inventoryItem.id,
        contract.quantity,
      );

      if (!reservedItem.ok) {
        throw new Error('Required contract inventory is no longer available.');
      }
    }

    const updatedContract = completed.contract;
    const scope = getContractScope(contract);
    const [updatedCharacter] = await tx
      .update(characters)
      .set({
        cash: sql`${characters.cash} + ${contract.escrowAmount}`,
        experience: sql`${characters.experience} + ${Math.max(2, Math.floor(contract.reward / 100))}`,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, character.id))
      .returning();

    await tx
      .insert(contractEvents)
      .values({
        contractId: contract.id,
        actorCharacterId: character.id,
        eventType: 'completed',
        amount: contract.escrowAmount,
        description: `Completed contract and received $${contract.escrowAmount}.`,
        metadata: { scope },
      });
    await tx
      .insert(financialTransactions)
      .values({
        characterId: character.id,
        type: 'system',
        amount: String(contract.escrowAmount),
        description: `Completed contract: ${contract.title}.`,
        metadata: { contractId: contract.id, scope },
      });
    await tx
      .insert(playerEvents)
      .values({
        userId: input.userId,
        characterId: character.id,
        visibility: contract.factionId ? 'faction' : contract.reward >= 1000 ? 'public' : 'private',
        type: 'contract_completed',
        payload: {
          contractId: contract.id,
          title: contract.title,
          reward: contract.reward,
          scope,
          factionId: contract.factionId,
        },
      });

    if (contract.reward >= 1000 && !contract.factionId && !contract.assignedToCharacterId) {
      await tx.insert(newspaperArticles).values({
        authorCharacterId: character.id,
        location: character.location,
        category: 'contracts',
        title: `${character.name} completes a high-value contract`,
        slug: `contract-completed-${contract.id}`,
        excerpt: `${contract.title} was completed for $${contract.reward}.`,
        body: `${character.name} completed the contract "${contract.title}" and collected $${contract.reward}. The contract board is becoming a serious economy of its own.`,
        metadata: { contractId: contract.id, reward: contract.reward },
      });
    }

    await setActionCooldown({
      tx,
      characterId: character.id,
      actionType: 'contract_complete',
      cooldownSeconds: 15,
      metadata: { contractId: contract.id, scope },
    });

    return { ok: true as const, data: { character: updatedCharacter, contract: updatedContract } };
  });
}

export async function cancelContract(input: {
  userId: string;
  characterId: string;
  contractId: string;
}) {
  return db.transaction(async (tx: Tx) => {
    const characterRow = await getOwnedCharacter(tx, input.userId, input.characterId);

    if (!characterRow) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const character = await refreshCharacterResources(tx, characterRow);
    const contract = await tx.query.contracts.findFirst({
      where: eq(contracts.id, input.contractId),
    });

    if (!contract || contract.createdByCharacterId !== character.id) {
      return { ok: false as const, code: 'not_found', message: 'Contract not found.' };
    }

    if (contract.status !== 'open') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Only open contracts can be cancelled.',
      };
    }

    const cancelled = await cancelOpenContract(tx, {
      contractId: contract.id,
      creatorCharacterId: character.id,
    });

    if (!cancelled.ok) {
      return { ok: false as const, code: 'conflict', message: 'This contract is no longer open.' };
    }

    const refund = await refundContractEscrow(tx, character.id, contract.escrowAmount);

    if (!refund.ok) {
      throw new Error('Could not refund contract escrow.');
    }

    const updatedCharacter = refund.character;
    const updatedContract = cancelled.contract;
    const scope = getContractScope(contract);

    await tx
      .insert(contractEvents)
      .values({
        contractId: contract.id,
        actorCharacterId: character.id,
        eventType: 'cancelled',
        amount: contract.escrowAmount,
        description: `Cancelled contract and refunded $${contract.escrowAmount} escrow.`,
        metadata: { scope },
      });
    await tx
      .insert(financialTransactions)
      .values({
        characterId: character.id,
        type: 'system',
        amount: String(contract.escrowAmount),
        description: `Cancelled contract: ${contract.title}.`,
        metadata: { contractId: contract.id, scope },
      });

    return { ok: true as const, data: { character: updatedCharacter, contract: updatedContract } };
  });
}

export async function expireOpenContracts() {
  return db.transaction(async (tx: Tx) => {
    const expired = await tx
      .update(contracts)
      .set({ status: 'expired', updatedAt: sql`now()` })
      .where(
        and(
          eq(contracts.status, 'open'),
          sql`${contracts.expiresAt} is not null`,
          sql`${contracts.expiresAt} <= now()`,
        ),
      )
      .returning();

    for (const contract of expired) {
      await refundContractEscrow(tx, contract.createdByCharacterId, contract.escrowAmount);
      await tx
        .insert(contractEvents)
        .values({
          contractId: contract.id,
          actorCharacterId: contract.createdByCharacterId,
          eventType: 'expired',
          amount: contract.escrowAmount,
          description: `Contract expired and $${contract.escrowAmount} escrow was refunded.`,
          metadata: { scope: getContractScope(contract) },
        });
    }

    return expired.length;
  });
}
